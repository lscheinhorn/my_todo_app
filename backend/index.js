// index.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Configure CORS
const corsOptions = {
  origin: "https://my-todo-app-frontend-catn.onrender.com", // your actual frontend
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} request to ${req.url}`, req.body);
  next();
});

// Connect to Mongo
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Task schema
const taskSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space" },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ["none", "priority", "high"], default: "none" },
  deletedAt: { type: Date, default: null },
});
const Task = mongoose.model("Task", taskSchema);

// Space schema
const spaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
});
const Space = mongoose.model("Space", spaceSchema);

// Sub-list schema
const subListItemSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  priority: { type: String, enum: ["none", "priority", "high"], default: "none" },
  dueTime: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const subListSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  name: { type: String, default: "New List" },
  items: [subListItemSchema],
});
const SubList = mongoose.model("SubList", subListSchema);



// Routes for tasks, spaces, sub-lists, etc. omitted for brevity
// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the My To-Do App API!");
});

// GET tasks
app.get("/tasks", async (req, res) => {
  try {
    const { spaceId } = req.query;
    if (spaceId === "DELETED") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const tasks = await Task.find({
        deletedAt: { $ne: null, $gte: thirtyDaysAgo },
      }).sort({ deletedAt: -1 });
      return res.json(tasks);
    }

    let query = { deletedAt: null };
    if (spaceId && spaceId !== "ALL") {
      query.spaceId = spaceId;
    }
    const tasks = await Task.find(query);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks", error: err });
  }
});


app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Error fetching task", error: err });
  }
});

// POST tasks
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
    res.status(500).json({ message: "Error saving task", error: err });
  }
});

// PUT tasks/:id (edit text, completed, dueDate, priority)
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
    res.status(500).json({ message: "Error updating task", error: err });
  }
});

// DELETE tasks/:id (soft-delete)
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
    res.status(500).json({ message: "Error deleting task", error: err });
  }
});

// Restore tasks
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
    res.status(500).json({ message: "Error restoring task", error: err });
  }
});

// Spaces
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

app.delete("/spaces/:id", async (req, res) => {
  try {
    await Space.findByIdAndDelete(req.params.id);
    // Soft-delete tasks in that space
    await Task.updateMany({ spaceId: req.params.id }, { deletedAt: Date.now() });
    res.json({ message: "Space and tasks deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting space", error: err });
  }
});

// Sub-lists
app.get("/sublists", async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ message: "taskId is required" });
    }
    const subLists = await SubList.find({ taskId });
    res.json(subLists);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sub-lists", error: err });
  }
});

app.post("/sublists", async (req, res) => {
  try {
    const { taskId, name } = req.body;
    if (!taskId) {
      return res.status(400).json({ message: "taskId is required" });
    }
    const subList = new SubList({ taskId, name: name || "New List" });
    await subList.save();
    res.status(201).json(subList);
  } catch (err) {
    res.status(500).json({ message: "Error creating sub-list", error: err });
  }
});



app.get("/sublists/:id", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    res.json(subList);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sub-list", error: err });
  }
});

// In index.js (backend)
app.delete("/sublists/:id", async (req, res) => {
  try {
    const subList = await SubList.findByIdAndDelete(req.params.id);
    if (!subList) {
      return res.status(404).json({ message: "Sub-list not found" });
    }
    res.json({ message: "Sub-list deleted", subList });
  } catch (err) {
    res.status(500).json({ message: "Error deleting sub-list", error: err });
  }
});

app.post("/sublists/:id/items", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    subList.items.push({
      text: req.body.text || "Untitled",
      completed: false,
      priority: req.body.priority || "none",
      dueTime: req.body.dueTime || "",
    });
    await subList.save();
    res.status(201).json(subList);
  } catch (err) {
    res.status(500).json({ message: "Error adding sub-list item", error: err });
  }
});

app.put("/sublists/:id/items/:itemId", async (req, res) => {
  try {
    const subList = await SubList.findById(req.params.id);
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.text = req.body.text ?? item.text;
    item.priority = req.body.priority ?? item.priority;
    item.dueTime = req.body.dueTime ?? item.dueTime;
    if (typeof req.body.completed === "boolean") {
      item.completed = req.body.completed;
    }
    await subList.save();
    res.json(subList);
  } catch (err) {
    res.status(500).json({ message: "Error updating sub-list item", error: err });
  }
});

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
    res.status(500).json({ message: "Error deleting sub-list item", error: err });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));