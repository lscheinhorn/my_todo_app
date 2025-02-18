// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function App() {
  // Spaces
  const [spaces, setSpaces] = useState([]);
  // "ALL" or a specific spaceId or "DELETED"
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // Show/hide manage spaces form
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  // Tasks
  const [tasks, setTasks] = useState([]);
  // Sorting
  const [sortBy, setSortBy] = useState("dueDate"); // "dueDate", "priority", "createdAt"

  // New task form
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Bulk edit
  const [bulkEdit, setBulkEdit] = useState(false);

  // Inline edit per task
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("none");

  // For collapsible tasks (optional)
  const [expandedTasks, setExpandedTasks] = useState({}); // {taskId: true/false}

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

  const fetchTasks = () => {
    if (selectedSpaceId === "ALL") {
      axios
        .get(TASKS_API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching tasks:", err));
      return;
    }
    if (selectedSpaceId === "DELETED") {
      // fetch deleted tasks
      axios
        .get(`${TASKS_API_URL}?spaceId=DELETED`)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching deleted tasks:", err));
      return;
    }
    // Otherwise, fetch tasks for a specific space
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  // Create space
  const addSpace = (e) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    axios
      .post(SPACES_API_URL, { name: newSpaceName })
      .then(() => {
        setNewSpaceName("");
        fetchSpaces();
      })
      .catch((err) => console.error("Error creating space:", err));
  };

  // Create task
  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    if (selectedSpaceId === "ALL" || selectedSpaceId === "DELETED") return;

    let dueDateToSend = null;
    if (showNewTaskDueDate && newTaskDueDate) {
      dueDateToSend = newTaskDueDate;
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

  // Toggle complete
  const toggleCompleteTask = (taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    axios
      .put(`${TASKS_API_URL}/${taskId}`, { ...task, completed: !task.completed })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling task:", err));
  };

  // Soft-delete a task
  const deleteTask = (taskId) => {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  // Undelete a task
  const undeleteTask = (taskId) => {
    axios
      .put(`${TASKS_API_URL}/${taskId}/undelete`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error undeleting task:", err));
  };

  // Start editing a task
  const startEditingTask = (task) => {
    setEditingTaskId(task._id);
    if (task.dueDate) {
      const iso = new Date(task.dueDate).toISOString().split("T")[0];
      setEditDueDate(iso);
    } else {
      setEditDueDate("");
    }
    setEditPriority(task.priority || "none");
  };

  // Cancel editing
  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditDueDate("");
    setEditPriority("none");
  };

  // Save edits
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

  // Format date for display
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

  // Sorting
  const getSortedTasks = () => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      // Completed tasks go last
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      const aDue = a.dueDate ? new Date(a.dueDate) : null;
      const bDue = b.dueDate ? new Date(b.dueDate) : null;
      const priorityRank = { high: 2, priority: 1, none: 0 };
      const aPrio = priorityRank[a.priority] || 0;
      const bPrio = priorityRank[b.priority] || 0;
      const aCreated = new Date(a.createdAt);
      const bCreated = new Date(b.createdAt);

      if (sortBy === "dueDate") {
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        return aCreated - bCreated;
      } else {
        // createdAt
        return aCreated - bCreated;
      }
    });
    return sorted;
  };

  const groupTasksByDueDate = (sortedTasks) => {
    if (sortBy !== "dueDate") {
      return [{ dateLabel: null, tasks: sortedTasks }];
    }
    const groups = {};
    sortedTasks.forEach((task) => {
      if (!task.dueDate) {
        const key = "No Due Date";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      } else {
        const dayKey = new Date(task.dueDate).toISOString().split("T")[0];
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(task);
      }
    });

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

  // Bulk edit toggles every task into edit mode
  const toggleBulkEdit = () => {
    const nextValue = !bulkEdit;
    setBulkEdit(nextValue);
    if (nextValue) {
      // Force editingTaskId to some sentinel? We'll handle multiple tasks
      // Instead, we can handle a separate approach: show an "edit bar" on each
      // For simplicity, let's just say we keep normal editing, but show them all expanded
      const expandMap = {};
      sortedTasks.forEach((task) => {
        expandMap[task._id] = true;
      });
      setExpandedTasks(expandMap);
    }
  };

  const toggleExpandTask = (taskId) => {
    setExpandedTasks({
      ...expandedTasks,
      [taskId]: !expandedTasks[taskId],
    });
  };

  return (
    <div className="app-container" role="main">
      <h1>My To-Do List</h1>

      {/* Spaces dropdown, includes DELETED for trash */}
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
          <option value="DELETED">Deleted Tasks</option>
        </select>

        <button onClick={() => setShowManageSpaces(!showManageSpaces)}>
          Manage Spaces
        </button>
      </div>

      {/* Manage Spaces Form */}
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

      {/* Bulk Edit */}
      <div className="bulk-edit-row">
        <button onClick={toggleBulkEdit}>
          {bulkEdit ? "Stop Bulk Edit" : "Edit All"}
        </button>
      </div>

      {/* New Task Form */}
      {selectedSpaceId !== "DELETED" && (
        <form className="new-task-form" onSubmit={addTask}>
          <div className="form-row">
            <input
              type="text"
              placeholder="New task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              disabled={selectedSpaceId === "ALL" || selectedSpaceId === "DELETED"}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              disabled={selectedSpaceId === "ALL" || selectedSpaceId === "DELETED"}
            >
              <option value="none">No Priority</option>
              <option value="priority">Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          {/* Toggle due date input */}
          {!showNewTaskDueDate ? (
            <button
              type="button"
              onClick={() => {
                setShowNewTaskDueDate(true);
                setNewTaskDueDate(new Date().toISOString().split("T")[0]);
              }}
              disabled={selectedSpaceId === "ALL" || selectedSpaceId === "DELETED"}
            >
              Set due date
            </button>
          ) : (
            <>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
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

          <button type="submit" disabled={selectedSpaceId === "ALL" || selectedSpaceId === "DELETED"}>
            Add
          </button>
        </form>
      )}

      {/* Task list */}
      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                let priorityClass = "";
                if (task.priority === "high") priorityClass = "priority-high";
                if (task.priority === "priority") priorityClass = "priority-normal";

                const isExpanded = expandedTasks[task._id] || bulkEdit;

                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${priorityClass}`}
                    // ARIA label for screen readers: read the task text, priority, completion
                    aria-label={`Task: ${task.text}, Priority: ${task.priority !== "none" ? task.priority : "none"}, ${task.completed ? "Completed" : "Not completed"}`}
                    tabIndex={0}
                  >
                    {/* Optional dropdown arrow to expand/collapse */}
                    {!bulkEdit && (
                      <button
                        type="button"
                        className="task-toggle"
                        aria-label="Open task options"
                        onClick={() => toggleExpandTask(task._id)}
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    )}

                    {/* Checkbox first for screen reader focus */}
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={task.completed}
                      onChange={() => {
                        toggleCompleteTask(task._id);
                        // After completing, focus moves to next item automatically
                      }}
                      aria-label={`Mark ${task.text} as complete`}
                    />

                    <div className="task-info">
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

                    {/* If in deleted space, show "undelete" instead of normal actions */}
                    {selectedSpaceId === "DELETED" ? (
                      <div className="task-actions">
                        <button className="undelete-btn" onClick={() => undeleteTask(task._id)}>
                          Undelete
                        </button>
                      </div>
                    ) : (
                      isExpanded && (
                        <div className="task-actions">
                          {/* If this task is in edit mode */}
                          {editingTaskId === task._id ? (
                            <div className="edit-task-form">
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                aria-label="Set due date"
                              />
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                                aria-label="Set priority"
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
                              <button className="delete-btn" onClick={() => deleteTask(task._id)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )
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