// App.js

import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import Spaces from "./Spaces";

const API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [newTaskDueMonth, setNewTaskDueMonth] = useState("");
  const [newTaskDueDay, setNewTaskDueDay] = useState("");
  const [newTaskDueYear, setNewTaskDueYear] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  // Sorting
  const [sortBy, setSortBy] = useState("dueDate"); // "dueDate", "priority", or "createdAt"

  // Fetch tasks from backend
  const fetchTasks = () => {
    if (selectedSpaceId === "ALL") {
      // "View All" case
      axios.get(API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching tasks:", err));
      return;
    }
    if (!selectedSpaceId) {
      // If no space is selected, clear tasks
      setTasks([]);
      return;
    }
    // Otherwise, fetch tasks for the specific space
    const url = `${API_URL}?spaceId=${selectedSpaceId}`;
    axios.get(url)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Re-fetch tasks when selectedSpaceId changes
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  // Add a new task
  const addTask = () => {
    if (!newTaskText.trim()) return;
    if (!selectedSpaceId || selectedSpaceId === "ALL") return; // Must select a space

    // Construct dueDate from the user’s selects, if provided
    let dueDate = null;
    if (newTaskDueMonth && newTaskDueDay && newTaskDueYear) {
      dueDate = new Date(
        parseInt(newTaskDueYear),
        parseInt(newTaskDueMonth) - 1, // Month is 0-based in JS
        parseInt(newTaskDueDay)
      );
    }

    const taskData = {
      text: newTaskText,
      completed: false,
      spaceId: selectedSpaceId,
      priority: newTaskPriority,
      dueDate: dueDate,
    };

    axios.post(API_URL, taskData)
      .then(() => {
        setNewTaskText("");
        setNewTaskPriority("none");
        setNewTaskDueMonth("");
        setNewTaskDueDay("");
        setNewTaskDueYear("");
        fetchTasks();
      })
      .catch((err) => console.error("Error adding task:", err));
  };

  // Toggle completion
  const toggleTask = (taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    axios.put(`${API_URL}/${task._id}`, {
      ...task,
      completed: !task.completed,
    })
    .then(() => fetchTasks())
    .catch((err) => console.error("Error toggling task:", err));
  };

  // Delete task
  const deleteTask = (taskId) => {
    if (!taskId) return;
    axios.delete(`${API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  // Utility: Format a date string in a more readable form
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // E.g. "Tue Feb 25, 2025"
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 1. Sort tasks in memory
  const getSortedTasks = () => {
    // Copy array so we don't mutate state
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      // Convert to JS Date or null
      const aDue = a.dueDate ? new Date(a.dueDate) : null;
      const bDue = b.dueDate ? new Date(b.dueDate) : null;

      // For priority, define an order: "high" > "priority" > "none"
      const priorityRank = { high: 2, priority: 1, none: 0 };
      const aPrio = priorityRank[a.priority] || 0;
      const bPrio = priorityRank[b.priority] || 0;

      // For createdAt, convert to date
      const aCreated = new Date(a.createdAt);
      const bCreated = new Date(b.createdAt);

      // Decide the main field to sort on
      if (sortBy === "dueDate") {
        // Sort by due date ascending, then priority, then createdAt ascending
        // If one due date is null, we treat it as "far future"
        if (!aDue && bDue) return 1;  // a is last
        if (aDue && !bDue) return -1; // b is last
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue; // ascending
        }
        // If same due date, compare priority (descending)
        if (aPrio !== bPrio) {
          return bPrio - aPrio; 
        }
        // If same priority, compare created date (ascending)
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        // Sort by priority descending, then due date ascending, then createdAt
        if (aPrio !== bPrio) {
          return bPrio - aPrio; 
        }
        // Next, compare due date ascending
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        // Finally, created date ascending
        return aCreated - bCreated;
      } else {
        // sortBy === "createdAt"
        // Sort by creation date ascending, ignoring due date grouping
        return aCreated - bCreated;
      }
    });

    return sorted;
  };

  // 2. If sorting by due date, group tasks by date
  const groupTasksByDueDate = (sortedTasks) => {
    // If not sorting by due date, just return them in a single group
    if (sortBy !== "dueDate") {
      return [{ dateLabel: null, tasks: sortedTasks }];
    }

    // Group by day. Key by "YYYY-MM-DD"
    const groups = {};
    sortedTasks.forEach((task) => {
      if (!task.dueDate) {
        // Put tasks with no due date in a special group
        const key = "No Due Date";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      } else {
        const date = new Date(task.dueDate);
        // toISOString() -> "2025-02-18T00:00:00.000Z"
        // We only want the date part
        const dayKey = date.toISOString().split("T")[0]; // "2025-02-18"
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(task);
      }
    });

    // Turn the groups object into an array with { dateLabel, tasks }
    // Sort by the dateKey ascending, with "No Due Date" last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "No Due Date") return 1;
      if (b === "No Due Date") return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => {
      let dateLabel;
      if (key === "No Due Date") {
        dateLabel = "No Due Date";
      } else {
        const [year, month, day] = key.split("-");
        // Build a label like "Today, February 18, 2025" if it matches the current date, etc.
        // For simplicity, let's do a standard format
        const dateObj = new Date(`${key}T00:00:00`);
        // E.g. "Tue Feb 25, 2025"
        dateLabel = dateObj.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return { dateLabel, tasks: groups[key] };
    });
  };

  const sortedTasks = getSortedTasks();
  const groupedTasks = groupTasksByDueDate(sortedTasks);

  return (
    <div className="app-container dark-mode">
      <h1>My To-Do List</h1>

      {/* Spaces for selecting a space (unchanged from before) */}
      <Spaces
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
        selectedSpaceId={selectedSpaceId}
      />

      {/* Sort dropdown */}
      <div className="sort-row">
        <label htmlFor="sortBy">Sort By:</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="createdAt">Date Created</option>
        </select>
      </div>

      {/* Task creation form */}
      <div className="create-task-form">
        <input
          type="text"
          placeholder="New task..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
        />

        <label>Priority:</label>
        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value)}
          disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
        >
          <option value="none">No Priority</option>
          <option value="priority">Priority</option>
          <option value="high">High Priority</option>
        </select>

        {/* Due date selectors (Month/Day/Year) */}
        <div className="due-date-selectors">
          <label>Due Date:</label>
          <select
            value={newTaskDueMonth}
            onChange={(e) => setNewTaskDueMonth(e.target.value)}
            disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select
            value={newTaskDueDay}
            onChange={(e) => setNewTaskDueDay(e.target.value)}
            disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
          >
            <option value="">DD</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          <select
            value={newTaskDueYear}
            onChange={(e) => setNewTaskDueYear(e.target.value)}
            disabled={!selectedSpaceId || selectedSpaceId === "ALL"}
          >
            <option value="">YYYY</option>
            {/* Adjust range as you wish */}
            {Array.from({ length: 5 }, (_, i) => 2025 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button onClick={addTask} disabled={!selectedSpaceId || selectedSpaceId === "ALL"}>
          Add
        </button>
      </div>

      {/* Render tasks in groups (if sorting by due date) or as a flat list */}
      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date-group"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                // Determine highlight color based on priority
                let highlightClass = "";
                if (task.priority === "high") {
                  highlightClass = "priority-high";
                } else if (task.priority === "priority") {
                  highlightClass = "priority-normal";
                }

                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${highlightClass}`}
                    style={{
                      textDecoration: task.completed ? "line-through" : "none",
                    }}
                  >
                    <div className="task-main" onClick={() => toggleTask(task._id)}>
                      <span className="task-text">{task.text}</span>
                      <span className="task-created">
                        Created: {formatDate(task.createdAt)}
                      </span>
                      {task.dueDate && (
                        <span className="task-due-date">
                          Due: {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteTask(task._id)}>❌</button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;