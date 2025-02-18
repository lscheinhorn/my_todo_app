// index.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Configure CORS properly
const corsOptions = {
  origin: "https://my-todo-app-frontend-catn.onrender.com", // or your actual frontend
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Middleware to log every request (debugging)
app.use((req, res, next) => {
  console.log(`📝 ${req.method} request to ${req.url} with body:`, req.body);
  next();
});

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Task Schema
const taskSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  spaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Space",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  priority: {
    type: String,
    enum: ["none", "priority", "high"],
    default: "none",
  },
  // Soft-delete
  deletedAt: {
    type: Date,
    default: null,
  },
});

const Task = mongoose.model("Task", taskSchema);

// Space Schema
const spaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
});
const Space = mongoose.model("Space", spaceSchema);

// ---------- NEW: SubList Schema ----------
/*
   A SubList is tied to a specific task (via taskId).
   Each sub-list can have multiple items, stored as an array of subdocuments.
*/
const subListItemSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const subListSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  name: {
    type: String,
    default: "My Sub-List",
  },
  items: [subListItemSchema],
});

const SubList = mongoose.model("SubList", subListSchema);

// ---------- ROUTES ----------

// Root
app.get("/", (req, res) => {
  console.log("🌍 Root API accessed");
  res.send("Welcome to the My To-Do App API!");
});

// Get tasks
app.get("/tasks", async (req, res) => {
  try {
    const { spaceId } = req.query;

    if (spaceId === "DELETED") {
      // Show tasks with deletedAt != null in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const tasks = await Task.find({
        deletedAt: { $ne: null, $gte: thirtyDaysAgo },
      }).sort({ deletedAt: -1 });
      return res.json(tasks);
    }

    // Normal tasks
    let query = { deletedAt: null };
    if (spaceId && spaceId !== "ALL") {
      query.spaceId = spaceId;
    }
    const tasks = await Task.find(query);
    res.json(tasks);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({ message: "Error fetching tasks", error: err });
  }
});

// Add task
app.post("/tasks", async (req, res) => {
  try {
    const taskData = {
      text: req.body.text,
      completed: req.body.completed || false,
      spaceId: req.body.spaceId || null,
      dueDate: req.body.dueDate || null,
      priority: req.body.priority || "none",
      deletedAt: null,
    };
    const task = new Task(taskData);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error("❌ Error saving task:", err);
    res.status(500).json({ message: "Error saving task", error: err });
  }
});

// Update task
app.put("/tasks/:id", async (req, res) => {
  try {
    const updatedData = {
      text: req.body.text,
      completed: req.body.completed,
      dueDate: req.body.dueDate,
      priority: req.body.priority,
    };
    const task = await Task.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("❌ Error updating task:", err);
    res.status(500).json({ message: "Error updating task", error: err });
  }
});

// Soft-delete task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { deletedAt: Date.now() },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task soft-deleted", task });
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).json({ message: "Error deleting task", error: err });
  }
});

// Restore a task (renamed from "undelete")
app.put("/tasks/:id/restore", async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { deletedAt: null },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task restored", task });
  } catch (err) {
    console.error("❌ Error restoring task:", err);
    res.status(500).json({ message: "Error restoring task", error: err });
  }
});

// Spaces endpoints
app.get("/spaces", async (req, res) => {
  try {
    const spaces = await Space.find();
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ message: "Error fetching spaces", error: err });
  }
});

app.post("/spaces", async (req, res) => {
  try {
    const space = new Space({ name: req.body.name });
    await space.save();
    res.status(201).json(space);
  } catch (err) {
    res.status(500).json({ message: "Error creating space", error: err });
  }
});

app.put("/spaces/:id", async (req, res) => {
  try {
    const space = await Space.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!space) return res.status(404).json({ message: "Space not found" });
    res.json(space);
  } catch (err) {
    res.status(500).json({ message: "Error updating space", error: err });
  }
});

app.delete("/spaces/:id", async (req, res) => {
  try {
    await Space.findByIdAndDelete(req.params.id);
    // Soft-delete tasks in that space
    await Task.updateMany({ spaceId: req.params.id }, { deletedAt: Date.now() });
    res.json({ message: "Space and associated tasks deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting space", error: err });
  }
});

// ----------- SUBLIST ROUTES -----------
/*
   GET /sublists?taskId=xxx    -> returns all sub-lists for a specific task
   POST /sublists             -> create a new sub-list
   GET /sublists/:id          -> get a single sub-list by id
   POST /sublists/:id/items   -> add an item to a sub-list
   PUT /sublists/:id/items/:itemId -> update a sub-list item
   DELETE /sublists/:id/items/:itemId -> remove a sub-list item
*/

// Get sub-lists for a task
app.get("/sublists", async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) {
      return res
        .status(400)
        .json({ message: "taskId query parameter is required" });
    }
    const subLists = await SubList.find({ taskId });
    res.json(subLists);
  } catch (err) {
    console.error("❌ Error fetching sub-lists:", err);
    res.status(500).json({ message: "Error fetching sub-lists", error: err });
  }
});

// Create a new sub-list
app.post("/sublists", async (req, res) => {
  try {
    const { taskId, name } = req.body;
    if (!taskId) {
      return res
        .status(400)
        .json({ message: "taskId is required to create a sub-list" });
    }
    const subList = new SubList({ taskId, name });
    await subList.save();
    res.status(201).json(subList);
  } catch (err) {
    console.error("❌ Error creating sub-list:", err);
    res.status(500).json({ message: "Error creating sub-list", error: err });
  }
});

// Get a single sub-list by ID
app.get("/sublists/:id", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    res.json(subList);
  } catch (err) {
    console.error("❌ Error fetching sub-list:", err);
    res.status(500).json({ message: "Error fetching sub-list", error: err });
  }
});

// Add an item to a sub-list
app.post("/sublists/:id/items", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const newItem = {
      text: req.body.text || "Untitled",
      completed: false,
    };
    subList.items.push(newItem);
    await subList.save();
    res.status(201).json(subList);
  } catch (err) {
    console.error("❌ Error adding sub-list item:", err);
    res.status(500).json({ message: "Error adding sub-list item", error: err });
  }
});

// Update a sub-list item
app.put("/sublists/:id/items/:itemId", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.text = req.body.text ?? item.text;
    if (typeof req.body.completed === "boolean") {
      item.completed = req.body.completed;
    }
    await subList.save();
    res.json(subList);
  } catch (err) {
    console.error("❌ Error updating sub-list item:", err);
    res.status(500).json({ message: "Error updating sub-list item", error: err });
  }
});

// Delete a sub-list item
app.delete("/sublists/:id/items/:itemId", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.remove();
    await subList.save();
    res.json(subList);
  } catch (err) {
    console.error("❌ Error deleting sub-list item:", err);
    res.status(500).json({ message: "Error deleting sub-list item", error: err });
  }
});

// Example: Purge tasks older than 30 days (optional)
app.delete("/tasks/purge-old", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await Task.deleteMany({
      deletedAt: { $lte: thirtyDaysAgo, $ne: null },
    });
    res.json({ message: "Old deleted tasks purged" });
  } catch (err) {
    console.error("❌ Error purging old tasks:", err);
    res.status(500).json({ message: "Error purging tasks", error: err });
  }
});

// Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));