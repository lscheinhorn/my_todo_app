import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // Fetch tasks from backend
const fetchTasks = () => {
  console.log("Fetching tasks from API:", API_URL); // Check if frontend is calling the correct URL
  axios.get(API_URL)
    .then((res) => {
      console.log("Tasks received:", res.data); // Log response to check data
      setTasks(res.data);
    })
    .catch((err) => {
      console.error("Error fetching tasks:", err);
    });
};

  // Fetch tasks when the page loads
  useEffect(() => {
    fetchTasks();
  }, []);

  // Add a new task and refresh the list
  const addTask = () => {
    if (newTask.trim()) {
      axios.post(API_URL, { text: newTask, completed: false }).then(() => {
        fetchTasks(); // Refresh tasks after adding
        setNewTask("");
      });
    }
  };

  // Toggle task completion
  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    axios.put(`${API_URL}/${id}`, { ...task, completed: !task.completed }).then(() => {
      fetchTasks(); // Refresh after update
    });
  };

  // Delete a task and refresh the list
  const deleteTask = (id) => {
    console.log("Deleting task with ID:", id); // Debugging log
    if (!id) {
      console.error("Task ID is undefined!"); // Catch undefined errors
      return;
    }
  
    axios.delete(`${API_URL}/tasks/${id}`)
      .then(() => {
        fetchTasks(); // Refresh after delete
      })
      .catch((err) => {
        console.error("Error deleting task:", err);
      });
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2>My To-Do List</h2>
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
          <li key={task.id} style={{ textDecoration: task.completed ? "line-through" : "none" }}>
            <span onClick={() => toggleTask(task.id)}>{task.text}</span>
            <button onClick={() => deleteTask(task.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;