// App.js

import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import Spaces from "./Spaces";

const API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  // Fetch tasks from backend, filtering by selected space
  const fetchTasks = () => {
    if (!selectedSpaceId) {
      setTasks([]);
      return;
    }
    const url = `${API_URL}?spaceId=${selectedSpaceId}`;
    axios.get(url)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Whenever the selected space changes, fetch that space’s tasks
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  // Add a new task to the currently selected space
  const addTask = () => {
    if (!newTask.trim() || !selectedSpaceId) return;
    axios.post(API_URL, {
      text: newTask,
      completed: false,
      spaceId: selectedSpaceId
    })
    .then(() => {
      fetchTasks(); // Refresh tasks after adding
      setNewTask("");
    })
    .catch((err) => console.error("Error adding task:", err));
  };

  // Toggle task completion
  const toggleTask = (id) => {
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    axios.put(`${API_URL}/${task._id}`, { ...task, completed: !task.completed })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling task:", err));
  };

  // Delete a task
  const deleteTask = (id) => {
    if (!id) return;
    axios.delete(`${API_URL}/${id}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  return (
    {/* Always apply dark-mode here */}
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }} className="dark-mode">
      <h2>My To-Do List</h2>

      <Spaces
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
        selectedSpaceId={selectedSpaceId}
      />
      
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="New task..."
      />
      <button onClick={addTask}>Add</button>

      <ul>
        {tasks.map((task) => (
          <li
            key={task._id}
            style={{ textDecoration: task.completed ? "line-through" : "none" }}
          >
            <span onClick={() => toggleTask(task._id)}>
              {task.text}
            </span>
            <button onClick={() => deleteTask(task._id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;