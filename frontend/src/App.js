// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function App() {
  // Spaces
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // Manage spaces form
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  // Tasks
  const [tasks, setTasks] = useState([]);
  // Sorting
  const [sortBy, setSortBy] = useState("dueDate");

  // New task form
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Bulk edit
  const [bulkEdit, setBulkEdit] = useState(false);

  // Inline edit
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("none");

  // Track which tasks are expanded
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = () => {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  };

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
      // Fetch deleted tasks
      axios
        .get(`${TASKS_API_URL}?spaceId=DELETED`)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching deleted tasks:", err));
      return;
    }
    // Otherwise, fetch tasks for specific space
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

  // Mark as complete
  const markComplete = (task) => {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, { ...task, completed: !task.completed })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling complete:", err));
  };

  // Delete or Undelete
  const deleteTask = (taskId) => {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  };

  const undeleteTask = (taskId) => {
    axios
      .put(`${TASKS_API_URL}/${taskId}/undelete`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error undeleting task:", err));
  };

  // Start editing
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

  // Format date
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

  // Group tasks by date if sorting by dueDate
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

  // Bulk Edit toggles expanded view for all tasks
  const toggleBulkEdit = () => {
    const nextValue = !bulkEdit;
    setBulkEdit(nextValue);
    if (nextValue) {
      const expandMap = {};
      sortedTasks.forEach((task) => {
        expandMap[task._id] = true;
      });
      setExpandedTasks(expandMap);
    } else {
      setExpandedTasks({});
    }
  };

  // Toggle a single task's expanded/collapsed state
  const toggleExpandTask = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <div className="app-container" role="main">
      <h1>My To-Do List</h1>

      {/* Spaces dropdown */}
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

      {/* New Task Form */}
      {selectedSpaceId !== "DELETED" && (
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

          {/* Toggle due date input */}
          {!showNewTaskDueDate ? (
            <button
              type="button"
              onClick={() => {
                setShowNewTaskDueDate(true);
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
      )}

      {/* Sort & Bulk Edit, now below new-task-form */}
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

      <div className="bulk-edit-row">
        <button onClick={toggleBulkEdit}>
          {bulkEdit ? "Stop Bulk Edit" : "Edit All"}
        </button>
      </div>

      {/* Tasks */}
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

                const isExpanded = bulkEdit || expandedTasks[task._id] || false;

                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${priorityClass}`}
                    aria-label={`Task: ${task.text}, Priority: ${task.priority}, ${task.completed ? "Completed" : "Not completed"}`}
                    tabIndex={-1}
                  >
                    {/* Collapsed view: just the task title and an arrow */}
                    <div className="task-collapsed">
                      <button
                        type="button"
                        className="task-title-button"
                        onClick={() => toggleExpandTask(task._id)}
                        aria-expanded={isExpanded}
                      >
                        {task.text}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="task-expanded">
                        {/* If in deleted space, show "Undelete" instead of "Mark complete" */}
                        {selectedSpaceId === "DELETED" ? (
                          <div className="task-actions">
                            <button
                              className="undelete-btn"
                              onClick={() => undeleteTask(task._id)}
                            >
                              Undelete
                            </button>
                          </div>
                        ) : (
                          <div className="task-actions">
                            <button onClick={() => markComplete(task)}>
                              {task.completed ? "Mark Incomplete" : "Mark Complete"}
                            </button>

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
                                <button onClick={() => saveTaskEdits(task)}>
                                  Save
                                </button>
                                <button onClick={cancelEditingTask}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => startEditingTask(task)}>
                                  Edit Task
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => deleteTask(task._id)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* After the edit button, show created date and due date (unless sorted by due date) */}
                        {editingTaskId !== task._id && (
                          <>
                            <div>Created: {formatDate(task.createdAt)}</div>
                            {sortBy !== "dueDate" && task.dueDate && (
                              <div>Due: {formatDate(task.dueDate)}</div>
                            )}
                          </>
                        )}
                      </div>
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