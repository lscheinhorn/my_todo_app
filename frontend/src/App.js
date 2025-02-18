// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

// Adjust this to your actual backend endpoint
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function App() {
  // Spaces
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // Manage spaces UI
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  // Tasks
  const [tasks, setTasks] = useState([]);
  // Sorting
  const [sortBy, setSortBy] = useState("dueDate"); // "dueDate", "priority", or "createdAt"

  // New Task form
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Editing an existing task inline
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("none");

  // Fetch spaces on mount
  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = () => {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  };

  // Fetch tasks whenever selectedSpaceId changes
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  // Get tasks from backend
  const fetchTasks = () => {
    if (selectedSpaceId === "ALL") {
      // View all tasks
      axios
        .get(TASKS_API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching tasks:", err));
      return;
    }
    // Otherwise, tasks for a specific space
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Create a new space
  const addSpace = (e) => {
    e.preventDefault(); // allow Enter to submit
    if (!newSpaceName.trim()) return;
    axios
      .post(SPACES_API_URL, { name: newSpaceName })
      .then(() => {
        setNewSpaceName("");
        fetchSpaces();
      })
      .catch((err) => console.error("Error creating space:", err));
  };

  // Create a new task
  const addTask = (e) => {
    e.preventDefault(); // allow Enter to submit
    if (!newTaskText.trim()) return;
    if (selectedSpaceId === "ALL") return;

    let dueDateToSend = null;
    if (showNewTaskDueDate && newTaskDueDate) {
      dueDateToSend = newTaskDueDate; // e.g. "2025-02-18"
    }

    const taskData = {
      text: newTaskText,
      completed: false,
      spaceId: selectedSpaceId,
      priority: newTaskPriority,
      dueDate: dueDateToSend,
    };

    axios
      .post(TASKS_API_URL, taskData)
      .then(() => {
        setNewTaskText("");
        setNewTaskPriority("none");
        setShowNewTaskDueDate(false);
        setNewTaskDueDate("");
        fetchTasks();
      })
      .catch((err) => console.error("Error adding task:", err));
  };

  // Mark task as complete/incomplete
  const toggleCompleteTask = (taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    axios
      .put(`${TASKS_API_URL}/${taskId}`, {
        ...task,
        completed: !task.completed,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling task:", err));
  };

  // Delete a task
  const deleteTask = (taskId) => {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  // Start editing a task (inline)
  const startEditingTask = (task) => {
    setEditingTaskId(task._id);
    // If task has a due date, use it; else default to today
    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      const isoString = dateObj.toISOString().split("T")[0];
      setEditDueDate(isoString);
    } else {
      // default to today if no due date
      setEditDueDate(new Date().toISOString().split("T")[0]);
    }
    setEditPriority(task.priority || "none");
  };

  // Cancel editing a task
  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditDueDate("");
    setEditPriority("none");
  };

  // Save changes to a task (due date / priority)
  const saveTaskEdits = (task) => {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, {
        ...task,
        dueDate: editDueDate || null,
        priority: editPriority,
      })
      .then(() => {
        cancelEditingTask();
        fetchTasks();
      })
      .catch((err) => console.error("Error updating task:", err));
  };

  // Format a date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sort tasks in memory
  const getSortedTasks = () => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      // Completed tasks always go last
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

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

      // Decide main field to sort on
      if (sortBy === "dueDate") {
        // Sort by due date ascending
        if (!aDue && bDue) return 1; // a is last
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
        // Sort by priority descending, then due date ascending
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
        // Sort by creation date ascending
        return aCreated - bCreated;
      }
    });
    return sorted;
  };

  // Group tasks by due date if sortBy === "dueDate"
  const groupTasksByDueDate = (sortedTasks) => {
    if (sortBy !== "dueDate") {
      // Just return a single group
      return [{ dateLabel: null, tasks: sortedTasks }];
    }
    // Group by day. Key by "YYYY-MM-DD", with "No Due Date" for null
    const groups = {};
    sortedTasks.forEach((task) => {
      if (!task.dueDate) {
        const key = "No Due Date";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      } else {
        const date = new Date(task.dueDate);
        const dayKey = date.toISOString().split("T")[0];
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(task);
      }
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "No Due Date") return 1; // put no due date last
      if (b === "No Due Date") return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => {
      let dateLabel;
      if (key === "No Due Date") {
        dateLabel = "No Due Date";
      } else {
        const [year, month, day] = key.split("-");
        const dateObj = new Date(`${key}T00:00:00`);
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
    <div className="app-container">
      <h1>My To-Do List</h1>

      {/* Single dropdown for spaces */}
      <div className="spaces-row">
        <label htmlFor="spaceSelect">Space:</label>
        <select
          id="spaceSelect"
          value={selectedSpaceId}
          onChange={(e) => setSelectedSpaceId(e.target.value)}
        >
          <option value="ALL">View All</option>
          {spaces.map((space) => (
            <option key={space._id} value={space._id}>
              {space.name}
            </option>
          ))}
        </select>

        <button onClick={() => setShowManageSpaces(!showManageSpaces)}>
          Manage Spaces
        </button>
      </div>

      {/* Manage Spaces Form (toggled) */}
      {showManageSpaces && (
        <div className="manage-spaces-section">
          <form className="manage-spaces-form" onSubmit={addSpace}>
            <input
              type="text"
              placeholder="New space name"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
            />
            <button type="submit">Add Space</button>
          </form>
        </div>
      )}

      {/* Sorting */}
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

      {/* New Task Form */}
      <form className="new-task-form" onSubmit={addTask}>
        <div className="form-row">
          <input
            type="text"
            placeholder="New task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            disabled={selectedSpaceId === "ALL"}
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            disabled={selectedSpaceId === "ALL"}
          >
            <option value="none">No Priority</option>
            <option value="priority">Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {/* Toggle a date input with a button */}
        {!showNewTaskDueDate ? (
          <button
            type="button"
            onClick={() => {
              setShowNewTaskDueDate(true);
              // Default to today's date
              setNewTaskDueDate(new Date().toISOString().split("T")[0]);
            }}
            disabled={selectedSpaceId === "ALL"}
          >
            Set due date
          </button>
        ) : (
          <>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              disabled={selectedSpaceId === "ALL"}
            />
            <button
              type="button"
              onClick={() => {
                setShowNewTaskDueDate(false);
                setNewTaskDueDate("");
              }}
            >
              Remove due date
            </button>
          </>
        )}

        <button type="submit" disabled={selectedSpaceId === "ALL"}>
          Add
        </button>
      </form>

      {/* Tasks */}
      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                // Priority highlight
                let priorityClass = "";
                if (task.priority === "high") priorityClass = "priority-high";
                if (task.priority === "priority") priorityClass = "priority-normal";

                return (
                  <li key={task._id} className={`tasks-list-item ${priorityClass}`}>
                    <div className="task-left">
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={task.completed}
                        onChange={() => toggleCompleteTask(task._id)}
                      />
                      <div
                        className="task-info"
                        // Only toggle completion if you want the text to do so
                        // onClick={() => toggleCompleteTask(task._id)}
                      >
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
                    </div>

                    {/* Edit or Delete Buttons */}
                    {editingTaskId === task._id ? (
                      /* Inline Edit Form */
                      <div className="edit-task-form">
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                        >
                          <option value="none">No Priority</option>
                          <option value="priority">Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <button onClick={() => saveTaskEdits(task)}>Save</button>
                        <button onClick={cancelEditingTask}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => startEditingTask(task)}>Edit</button>
                        <button onClick={() => deleteTask(task._id)}>❌</button>
                      </>
                    )}
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