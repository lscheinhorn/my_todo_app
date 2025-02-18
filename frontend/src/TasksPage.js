// TasksPage.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import Spaces from "./Spaces";
import SubListsDropdown from "./SubListsDropdown";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function TasksPage() {
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");
  const [tasks, setTasks] = useState([]);
  const [sortBy, setSortBy] = useState("dueDate");
  const [bulkEdit, setBulkEdit] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [editingTasks, setEditingTasks] = useState({});

  // New Task form
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  function fetchTasks() {
    if (selectedSpaceId === "ALL") {
      axios
        .get(TASKS_API_URL)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error(err));
      return;
    }
    if (selectedSpaceId === "DELETED") {
      axios
        .get(`${TASKS_API_URL}?spaceId=DELETED`)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error(err));
      return;
    }
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
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
      .catch((err) => console.error(err));
  }

  function markComplete(task) {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, {
        ...task,
        completed: !task.completed,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  }

  function deleteTask(taskId) {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  }

  function restoreTask(taskId) {
    axios
      .put(`${TASKS_API_URL}/${taskId}/restore`)
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  }

  function toggleExpandTask(taskId) {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  function startEditingTask(taskId) {
    setEditingTasks((prev) => ({ ...prev, [taskId]: true }));
  }

  function stopEditingTask(taskId) {
    setEditingTasks((prev) => ({ ...prev, [taskId]: false }));
  }

  function saveTaskEdits(taskId, updatedFields) {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    axios
      .put(`${TASKS_API_URL}/${taskId}`, { ...task, ...updatedFields })
      .then(() => {
        // collapse after save
        stopEditingTask(taskId);
        setExpandedTasks((prev) => ({ ...prev, [taskId]: false }));
        fetchTasks();
      })
      .catch((err) => console.error(err));
  }

  function toggleBulkEdit() {
    const nextValue = !bulkEdit;
    setBulkEdit(nextValue);
    if (nextValue) {
      const expandMap = {};
      tasks.forEach((task) => {
        expandMap[task._id] = true;
      });
      setExpandedTasks(expandMap);
    } else {
      setExpandedTasks({});
    }
  }

  function getSortedTasks() {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      // completed last
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

  function getPriorityLabel(priority) {
    if (priority === "high") return "High Priority";
    if (priority === "priority") return "Priority";
    return "";
  }

  const sortedTasks = getSortedTasks();
  const groupedTasks = groupTasksByDueDate(sortedTasks);

  return (
    <div className="app-container">
      <h1>My To-Do List</h1>

      <Spaces
        selectedSpaceId={selectedSpaceId}
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
      />

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

      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                const isExpanded = expandedTasks[task._id] || bulkEdit;
                const isEditing = editingTasks[task._id] || false;
                const priorityLabel = getPriorityLabel(task.priority);
                let priorityClass = "";
                if (task.priority === "high") priorityClass = "priority-high";
                else if (task.priority === "priority")
                  priorityClass = "priority-normal";

                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${priorityClass}`}
                    tabIndex={-1}
                  >
                    {/* Mark as complete */}
                    <input
                      type="checkbox"
                      className="mark-complete-checkbox"
                      checked={task.completed}
                      onChange={() => markComplete(task)}
                      aria-label={`Mark ${task.text} as complete`}
                    />

                    {/* Main content clickable to expand */}
                    <div
                      className="task-main-content"
                      onClick={() => toggleExpandTask(task._id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="collapsed-row">
                        <div className="text-with-priority">
                          {task.text}
                          {priorityLabel && ` (${priorityLabel})`}
                        </div>
                        <button className="show-more-btn">
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {isExpanded && (
                      <div className="expanded-row">
                        {selectedSpaceId === "DELETED" ? (
                          <div className="actions-row">
                            <button onClick={() => restoreTask(task._id)}>
                              Restore
                            </button>
                          </div>
                        ) : !isEditing ? (
                          <div className="actions-row">
                            {/* Delete icon at far left */}
                            <button
                              className="delete-btn"
                              onClick={() => deleteTask(task._id)}
                              title="Delete Task"
                            >
                              🗑
                            </button>
                            <button onClick={() => startEditingTask(task._id)}>
                              Edit
                            </button>
                            <SubListsDropdown taskId={task._id} />

                            {/* Created date on the right */}
                            <div className="task-created-date" style={{ marginLeft: "auto" }}>
                              Created:{" "}
                              {new Date(task.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : (
                          <>
                            <TaskEditForm
                              task={task}
                              onSave={(updatedFields) =>
                                saveTaskEdits(task._id, updatedFields)
                              }
                              onCancel={() => stopEditingTask(task._id)}
                            />
                            <div className="task-created-date" style={{ textAlign: "right" }}>
                              Created:{" "}
                              {new Date(task.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
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

/** Inline edit form for a task: text, priority, due date, completed */
function TaskEditForm({ task, onSave, onCancel }) {
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority || "none");
  const [editDueDate, setEditDueDate] = useState(
    task.dueDate ? task.dueDate.substring(0, 10) : ""
  );
  const [editCompleted, setEditCompleted] = useState(task.completed || false);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      text: editText,
      priority: editPriority,
      dueDate: editDueDate ? new Date(editDueDate) : null,
      completed: editCompleted,
    });
  }

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <div className="edit-form-row">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
        />
        <select
          value={editPriority}
          onChange={(e) => setEditPriority(e.target.value)}
        >
          <option value="none">No Priority</option>
          <option value="priority">Priority</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="edit-form-row">
        <label>
          <input
            type="checkbox"
            checked={editCompleted}
            onChange={(e) => setEditCompleted(e.target.checked)}
          />
          Completed
        </label>
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
        />
      </div>
      <div className="edit-form-row">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default TasksPage;