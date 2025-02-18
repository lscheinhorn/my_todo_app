const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express(); // ✅ Initialize 'app' first

// Configure CORS properly
const corsOptions = {
    origin: "https://my-todo-app-frontend-catn.onrender.com", // Allow only frontend domain
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow cookies and headers
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // ✅ Now this works
app.use(express.json()); // ✅ Middleware after initializing 'app'

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

// Define Space Schema
const spaceSchema = new mongoose.Schema({
name: { type: String, required: true },
});

const Space = mongoose.model("Space", spaceSchema);


// Define Task Schema
const taskSchema = new mongoose.Schema({
    text: String,
    completed: Boolean,
    spaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Space",
        required: false,
    },
});

const Task = mongoose.model("Task", taskSchema);

app.get("/", (req, res) => {
  console.log("🌍 Root API accessed");
  res.send("Welcome to the My To-Do App API!");
});


// Create a new space
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

    // Get all spaces
    app.get("/spaces", async (req, res) => {
    try {
        const spaces = await Space.find();
        res.json(spaces);
    } catch (err) {
        console.error("❌ Error fetching spaces:", err);
        res.status(500).json({ message: "Error fetching spaces", error: err });
    }
    });

    // Update a space name
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
        console.error("❌ Error updating space:", err);
        res.status(500).json({ message: "Error updating space", error: err });
    }
    });

    // Delete a space
    app.delete("/spaces/:id", async (req, res) => {
    try {
        await Space.findByIdAndDelete(req.params.id);
        // Optionally, also delete tasks that belonged to this space
        await Task.deleteMany({ spaceId: req.params.id });
        res.json({ message: "Space and associated tasks deleted" });
    } catch (err) {
        console.error("❌ Error deleting space:", err);
        res.status(500).json({ message: "Error deleting space", error: err });
    }
});


// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const { spaceId } = req.query;
    const query = spaceId ? { spaceId } : {};
    const tasks = await Task.find(query);
    res.json(tasks);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).json({ message: "Error fetching tasks", error: err });
  }
});

// Add a new task
app.post("/tasks", async (req, res) => {
  try {
    console.log("➕ Adding task:", req.body);
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error("❌ Error saving task:", err);
    res.status(500).json({ message: "Error saving task", error: err });
  }
});

// Update a task
app.put("/tasks/:id", async (req, res) => {
  try {
    console.log(`📝 Updating task ${req.params.id}:`, req.body);
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("❌ Error updating task:", err);
    res.status(500).json({ message: "Error updating task", error: err });
  }
});

// Delete a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    console.log(`🗑 Deleting task ${req.params.id}`);
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).json({ message: "Error deleting task", error: err });
  }
});

// Set up the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));