
// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import Spaces from "./Spaces";
import SubListsDropdown from "./SubListsDropdown";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function App() {
  // The space the user has selected
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // Array of tasks from the backend
  const [tasks, setTasks] = useState([]);

  // Sorting
  const [sortBy, setSortBy] = useState("dueDate");

  // Bulk Edit
  const [bulkEdit, setBulkEdit] = useState(false);

  // Which tasks are expanded
  const [expandedTasks, setExpandedTasks] = useState({});

  // New Task form
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Fetch tasks whenever selectedSpaceId changes
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  function fetchTasks() {
    if (selectedSpaceId === "ALL") {
      axios
        .get(TASKS_API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching tasks:", err));
      return;
    }
    if (selectedSpaceId === "DELETED") {
      axios
        .get(`${TASKS_API_URL}?spaceId=DELETED`)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching deleted tasks:", err));
      return;
    }
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  }

  function addTask(e) {
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
  }

  function markComplete(task) {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, {
        ...task,
        completed: !task.completed,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling complete:", err));
  }

  function deleteTask(taskId) {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  }

  function restoreTask(taskId) {
    axios
      .put(`${TASKS_API_URL}/${taskId}/restore`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error restoring task:", err));
  }

  // Sorting
  function getSortedTasks() {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      // Completed tasks last
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
  }

  function groupTasksByDueDate(sortedTasks) {
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
  }

  const sortedTasks = getSortedTasks();
  const groupedTasks = groupTasksByDueDate(sortedTasks);

  function toggleExpandTask(taskId) {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  function toggleBulkEdit() {
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
  }

  // Priority classes
  function getPriorityClass(task) {
    if (task.priority === "high") return "priority-high";
    if (task.priority === "priority") return "priority-normal";
    return "";
  }

  return (
    <div className="app-container">
      <h1>My To-Do List</h1>

      {/* Render the inline spaces row */}
      <Spaces
        selectedSpaceId={selectedSpaceId}
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
      />

      {/* New Task Form (not shown if "DELETED" or "ALL") */}
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

      {/* Sort & Bulk Edit */}
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

      {/* Render tasks, grouped by date if needed */}
      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                const isExpanded = bulkEdit || expandedTasks[task._id] || false;
                const priorityClass = getPriorityClass(task);

                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${priorityClass}`}
                    tabIndex={-1}
                  >
                    {/* Collapsed View */}
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

                    {/* Expanded View */}
                    {isExpanded && (
                      <div className="task-expanded">
                        {selectedSpaceId === "DELETED" ? (
                          <div className="task-actions">
                            <button onClick={() => restoreTask(task._id)}>
                              Restore
                            </button>
                          </div>
                        ) : (
                          <div className="task-actions">
                            <button onClick={() => markComplete(task)}>
                              {task.completed
                                ? "Mark Incomplete"
                                : "Mark Complete"}
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => deleteTask(task._id)}
                            >
                              Delete
                            </button>

                            {/* Sub-lists: same UI as tasks, in a dropdown */}
                            <SubListsDropdown taskId={task._id} />
                          </div>
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