// index.js (Backend)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ====== CORS CONFIG ======
const corsOptions = {
  origin: "https://my-todo-app-frontend-catn.onrender.com", // your actual frontend domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.use(express.json());

// ====== DEBUG LOGGING MIDDLEWARE ======
app.use((req, res, next) => {
  console.log(`📝 ${req.method} request to ${req.url}`, req.body);
  next();
});

// ====== CONNECT TO MONGODB ======
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/todo";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ====== SCHEMAS & MODELS ======

// 1) TASKS
// Each "task" can optionally belong to a "spaceId", can be soft-deleted, has priority, etc.
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

// 2) SPACES (Optional)
const spaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // If you want to soft-delete spaces, you can add: deletedAt: { type: Date, default: null }
});
const Space = mongoose.model("Space", spaceSchema);

// 3) SUB-LISTS
// A sub-list belongs to a parent "taskId". Each sub-list has an array of items.
const subListItemSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  priority: { type: String, enum: ["none", "priority", "high"], default: "none" },
  dueTime: { type: String, default: "" }, // e.g. "14:30"
  createdAt: { type: Date, default: Date.now },
});

const subListSchema = new mongoose.Schema({
  // The parent "taskId" that this sub-list belongs to
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },

  // If you wanted nested sub-lists, you could add parentSubListId here
  // parentSubListId: { type: mongoose.Schema.Types.ObjectId, ref: "SubList", default: null },

  name: { type: String, default: "New List" },
  items: [subListItemSchema],
});
const SubList = mongoose.model("SubList", subListSchema);

// ====== ROUTES ======

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the My To-Do App API!");
});

// ---------- TASK ROUTES ----------

/**
 * GET /tasks?spaceId=ALL|DELETED|<spaceId>
 * - If spaceId=DELETED, fetch tasks soft-deleted within last 30 days
 * - If spaceId=ALL, fetch all non-deleted tasks
 * - Otherwise fetch tasks for a specific space
 */
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
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({ message: "Error fetching tasks", error: err });
  }
});

/**
 * GET /tasks/:id
 * - Fetch a single task by its ID. Useful for showing the parent task name in sub-lists page.
 */
app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    console.error("❌ Error fetching task:", err);
    res.status(500).json({ message: "Error fetching task", error: err });
  }
});

/**
 * POST /tasks
 * - Create a new task
 */
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

/**
 * PUT /tasks/:id
 * - Edit an existing task
 */
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

/**
 * DELETE /tasks/:id
 * - Soft-delete a task by setting deletedAt
 */
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

/**
 * PUT /tasks/:id/restore
 * - Restore a soft-deleted task by setting deletedAt=null
 */
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

// ---------- SPACES ROUTES (OPTIONAL) ----------

/**
 * GET /spaces
 * - Fetch all spaces
 */
app.get("/spaces", async (req, res) => {
  try {
    const spaces = await Space.find();
    res.json(spaces);
  } catch (err) {
    console.error("❌ Error fetching spaces:", err);
    res.status(500).json({ message: "Error fetching spaces", error: err });
  }
});

/**
 * POST /spaces
 * - Create a new space
 */
app.post("/spaces", async (req, res) => {
  try {
    const space = new Space({ name: req.body.name });
    await space.save();
    res.status(201).json(space);
  } catch (err) {
    console.error("❌ Error creating space:", err);
    res.status(500).json({ message: "Error creating space", error: err });
  }
});

/**
 * DELETE /spaces/:id
 * - Permanently delete a space doc, plus soft-delete all tasks in that space
 */
app.delete("/spaces/:id", async (req, res) => {
  try {
    await Space.findByIdAndDelete(req.params.id);
    // Soft-delete tasks belonging to that space
    await Task.updateMany({ spaceId: req.params.id }, { deletedAt: Date.now() });
    res.json({ message: "Space and tasks deleted" });
  } catch (err) {
    console.error("❌ Error deleting space:", err);
    res.status(500).json({ message: "Error deleting space", error: err });
  }
});

// ---------- SUB-LISTS ROUTES ----------

/**
 * GET /sublists?taskId=xxx
 * - Returns all sub-lists for the given parent taskId
 */
app.get("/sublists", async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ message: "taskId is required" });
    }
    const subLists = await SubList.find({ taskId });
    res.json(subLists);
  } catch (err) {
    console.error("❌ Error fetching sub-lists:", err);
    res.status(500).json({ message: "Error fetching sub-lists", error: err });
  }
});

/**
 * POST /sublists
 * - Create a new sub-list for a given task
 */
app.post("/sublists", async (req, res) => {
  try {
    const { taskId, name } = req.body;
    if (!taskId) {
      return res
        .status(400)
        .json({ message: "taskId is required to create a sub-list" });
    }
    const subList = new SubList({ taskId, name: name || "New List" });
    await subList.save();
    res.status(201).json(subList);
  } catch (err) {
    console.error("❌ Error creating sub-list:", err);
    res.status(500).json({ message: "Error creating sub-list", error: err });
  }
});

/**
 * GET /sublists/:id
 * - Fetch a single sub-list by ID, including its items
 */
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

/**
 * PUT /sublists/:id
 * - If you want to edit the sub-list name, priority, or completed status (if you store them)
 *   In the code example, we are storing "completed" or "dueDate" for sub-lists if desired.
 */
app.put("/sublists/:id", async (req, res) => {
  try {
    // If your sub-list doc includes priority, completed, etc., handle them here
    const updatedData = {
      name: req.body.name,
      priority: req.body.priority,
      dueDate: req.body.dueDate,
      completed: req.body.completed,
    };
    const subList = await SubList.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    });
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    res.json(subList);
  } catch (err) {
    console.error("❌ Error updating sub-list:", err);
    res.status(500).json({ message: "Error updating sub-list", error: err });
  }
});

/**
 * DELETE /sublists/:id
 * - Delete the entire sub-list doc
 */
app.delete("/sublists/:id", async (req, res) => {
  try {
    const subList = await SubList.findByIdAndDelete(req.params.id);
    if (!subList) {
      return res.status(404).json({ message: "Sub-list not found" });
    }
    res.json({ message: "Sub-list deleted", subList });
  } catch (err) {
    console.error("❌ Error deleting sub-list:", err);
    res.status(500).json({ message: "Error deleting sub-list", error: err });
  }
});

// ----- SUB-LIST ITEMS (the "list items") -----

/**
 * POST /sublists/:id/items
 * - Add a new item to this sub-list
 */
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
    console.error("❌ Error adding sub-list item:", err);
    res.status(500).json({ message: "Error adding sub-list item", error: err });
  }
});

/**
 * PUT /sublists/:id/items/:itemId
 * - Edit an existing item in the sub-list
 */
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
    // If you store "deletedAt" for items, you can do so here
    await subList.save();
    res.json(subList);
  } catch (err) {
    console.error("❌ Error updating sub-list item:", err);
    res.status(500).json({ message: "Error updating sub-list item", error: err });
  }
});

/**
 * DELETE /sublists/:id/items/:itemId
 * - Remove an item from the sub-list
 */
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

// ====== START SERVER ======
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));