// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import Spaces from "./Spaces";
import SubListView from "./SubListView";

// Adjust to your actual backend endpoints
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function App() {
  // The space ID the user has selected (e.g. "ALL", "DELETED", or a real Mongo _id)
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // The main array of tasks from the backend
  const [tasks, setTasks] = useState([]);

  // Sorting: "dueDate", "priority", or "createdAt"
  const [sortBy, setSortBy] = useState("dueDate");

  // Bulk edit mode
  const [bulkEdit, setBulkEdit] = useState(false);

  // Tracks which tasks are expanded (to show “Mark Complete,” “Delete,” etc.)
  const [expandedTasks, setExpandedTasks] = useState({});

  // Sub-list logic
  const [viewingSubList, setViewingSubList] = useState(false);
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // New task form fields
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Whenever selectedSpaceId changes, fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  /**
   * Fetch tasks from the backend based on selectedSpaceId.
   * - "ALL": tasks with deletedAt=null
   * - "DELETED": tasks with deletedAt != null in last 30 days
   * - real spaceId: tasks with that spaceId, deletedAt=null
   */
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
    // Otherwise, fetch tasks for that specific space ID
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  }

  // Create a new task
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

  // Mark a task as complete/incomplete
  function markComplete(task) {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, {
        ...task,
        completed: !task.completed,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling complete:", err));
  }

  // Soft-delete a task (moves it to “deleted”)
  function deleteTask(taskId) {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  }

  // Restore a deleted task
  function restoreTask(taskId) {
    axios
      .put(`${TASKS_API_URL}/${taskId}/restore`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error restoring task:", err));
  }

  // Sorting tasks in memory
  function getSortedTasks() {
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
        // Then by priority descending
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        // Then by creation date ascending
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        // Priority descending
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        // Then due date ascending
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        // Then created date ascending
        return aCreated - bCreated;
      } else {
        // sortBy === "createdAt"
        return aCreated - bCreated;
      }
    });
    return sorted;
  }

  // Group tasks by due date if sortBy === "dueDate"
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

  // Toggle expansion for a single task
  function toggleExpandTask(taskId) {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  // Bulk edit: expand all or collapse all
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

  // Sub-list logic: create or view sub-lists
  function addSubList(taskId) {
    axios
      .post(SUBLISTS_API_URL, { taskId, name: "New List" })
      .then((res) => {
        setSelectedSubListId(res.data._id);
        setViewingSubList(true);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function viewSubList(subListId) {
    setSelectedSubListId(subListId);
    setViewingSubList(true);
  }

  // If user is viewing a sub-list, show SubListView
  if (viewingSubList && selectedSubListId) {
    return (
      <SubListView
        subListId={selectedSubListId}
        onBack={() => {
          setViewingSubList(false);
          setSelectedSubListId(null);
        }}
      />
    );
  }

  // Helper for priority CSS classes
  function getPriorityClass(task) {
    if (task.priority === "high") return "priority-high";
    if (task.priority === "priority") return "priority-normal";
    return "";
  }

  return (
    <div className="app-container">
      <h1>My To-Do List</h1>

      {/* RENDER SPACES COMPONENT HERE */}
      <Spaces
        selectedSpaceId={selectedSpaceId}
        onSpaceSelect={(id) => setSelectedSpaceId(id)}
      />

      {/* New Task Form (only if not in DELETED space) */}
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
                        {/* If in "DELETED" space, show "Restore" only */}
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

                            {/* Sub-list Buttons */}
                            <SubListButtons
                              taskId={task._id}
                              onAddSubList={addSubList}
                              onViewSubList={viewSubList}
                            />
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

/**
 * SubListButtons: fetch sub-lists for a given task. If none exist, show "Add List";
 * if they do exist, show "Show List" or "Add Another List".
 */
function SubListButtons({ taskId, onAddSubList, onViewSubList }) {
  const [subLists, setSubLists] = useState([]);

  useEffect(() => {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }, [taskId]);

  if (!subLists.length) {
    return <button onClick={() => onAddSubList(taskId)}>Add List</button>;
  }

  return (
    <>
      {subLists.map((list) => (
        <button key={list._id} onClick={() => onViewSubList(list._id)}>
          Show List: {list.name}
        </button>
      ))}
      <button onClick={() => onAddSubList(taskId)}>Add Another List</button>
    </>
  );
}

export default App;