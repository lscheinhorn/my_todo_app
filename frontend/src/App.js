import React, { useState, useEffect } from "react";
import './App.css'
import axios from "axios";
import Spaces from "./Spaces";

const API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);


  // Fetch tasks from backend
  const fetchTasks = () => {
    let url = API_URL;
    if (selectedSpaceId) {
      url += `?spaceId=${selectedSpaceId}`;
    }
    axios.get(url)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Fetch tasks when the page loads
  useEffect(() => {
    fetchTasks();
  }, []);

  // Add a new task and refresh the list
  const addTask = () => {
    if (newTask.trim()) {
      axios.post(API_URL, { 
        text: newTask, 
        completed: false,
        spaceId: selectedSpaceId 
      }).then(() => {
        fetchTasks(); // Refresh tasks after adding
        setNewTask("");
      });
    }
  };

  // Toggle task completion
  const toggleTask = (id) => {
    const task = tasks.find((t) => t._id === id);
      axios.put(`${API_URL}/${task._id}`, { ...task, completed: !task.completed }).then(() => { 
      fetchTasks(); // Refresh after update
    });
  };

  // Delete a task and refresh the list
  const deleteTask = (id) => {
    if (!id) {
      console.error("❌ Error: Task ID is undefined.");
      return;
    }
  
    axios.delete(`${API_URL}/${id}`)
      .then(() => fetchTasks())
      .catch(err => console.error("❌ Delete request failed:", err));
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }} className={darkMode ? "dark-mode" : ""}>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle Dark Mode
      </button>
      <h2>My To-Do List</h2>

      {/* Render the Spaces component here */}
      <Spaces onSelectSpace={(spaceId) => setSelectedSpaceId(spaceId)} />
      
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="New task..."
      />
      <button onClick={addTask}>Add</button>

      <ul>
        {console.log("Tasks state:", tasks)}
        {tasks.map((task) => (
          <li key={task._id} style={{ textDecoration: task.completed ? "line-through" : "none" }}>
            <span onClick={() => toggleTask(task._id)}>{task.text}</span>
            <button onClick={() => deleteTask(task._id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;