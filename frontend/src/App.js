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

  // Fetch tasks, with logic for "ALL"
  const fetchTasks = () => {
    // If user selected "ALL", fetch all tasks
    if (selectedSpaceId === "ALL") {
      axios
        .get(API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching tasks:", err));
      return;
    }

    // If no space is selected at all, show no tasks
    if (!selectedSpaceId) {
      setTasks([]);
      return;
    }

    // Otherwise fetch tasks for the specific space
    const url = `${API_URL}?spaceId=${selectedSpaceId}`;
    axios
      .get(url)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  const addTask = () => {
    // If we are in "ALL" or no space, do not allow adding a task
    if (!newTask.trim() || !selectedSpaceId || selectedSpaceId === "ALL") return;

    axios
      .post(API_URL, {
        text: newTask,
        completed: false,
        spaceId: selectedSpaceId,
      })
      .then(() => {
        fetchTasks();
        setNewTask("");
      })
      .catch((err) => console.error("Error adding task:", err));
  };

  const toggleTask = (id) => {
    const task = tasks.find((t) => t._id === id);
    if (!task) return;

    axios
      .put(`${API_URL}/${task._id}`, { ...task, completed: !task.completed })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling task:", err));
  };

  const deleteTask = (id) => {
    if (!id) return;
    axios
      .delete(`${API_URL}/${id}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  return (
    <div className="app-container dark-mode">
      <h1>My To-Do List</h1>

      <Spaces
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
        selectedSpaceId={selectedSpaceId}
      />

      <div className="tasks-container">
        <div className="add-task-row">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="New task..."
            disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
          />
          <button onClick={addTask} disabled={!selectedSpaceId || selectedSpaceId === "ALL"}>
            Add
          </button>
        </div>

        <ul className="tasks-list">
          {tasks.map((task) => (
            <li
              key={task._id}
              className="tasks-list-item"
              style={{ textDecoration: task.completed ? "line-through" : "none" }}
            >
              <span onClick={() => toggleTask(task._id)}>{task.text}</span>
              <button onClick={() => deleteTask(task._id)}>❌</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;