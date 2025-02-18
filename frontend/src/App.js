// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import SubListView from "./SubListView";

/**
 * Adjust these endpoints to match your actual deployment or environment variables.
 * Example: If your backend is running locally, you might use "http://localhost:5001/tasks"
 */
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * This component displays the main tasks UI:
 * - Fetches tasks from the backend, filtered by the selected space (e.g. "ALL", "DELETED", or a specific spaceId).
 * - Allows creation of new tasks with text, priority, and optional due date.
 * - Supports sorting, bulk editing, and toggling tasks as expanded/collapsed.
 * - Handles sub-list creation and viewing via a separate SubListView component.
 * - Handles soft-deletion and restoring of tasks.
 */
function App() {
  // ---------- Space Selection ----------
  // If you have a separate "Spaces" component, you might set selectedSpaceId from there.
  // For now, we store it locally. "ALL" or "DELETED" are special values.
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");

  // ---------- Main Task List State ----------
  const [tasks, setTasks] = useState([]);

  // ---------- Sorting ----------
  // "dueDate", "priority", or "createdAt"
  const [sortBy, setSortBy] = useState("dueDate");

  // ---------- Bulk Edit and Expansion State ----------
  const [bulkEdit, setBulkEdit] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  // ---------- Sub-List View State ----------
  const [viewingSubList, setViewingSubList] = useState(false);
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // ---------- New Task Fields ----------
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("none");
  const [showNewTaskDueDate, setShowNewTaskDueDate] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // ----- Fetch tasks whenever selectedSpaceId changes -----
  useEffect(() => {
    fetchTasks();
  }, [selectedSpaceId]);

  /**
   * Fetch tasks from the backend. If selectedSpaceId is "ALL", fetch all tasks.
   * If "DELETED", fetch tasks that were soft-deleted. Otherwise fetch tasks for a specific space.
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
      // fetch deleted tasks
      axios
        .get(`${TASKS_API_URL}?spaceId=DELETED`)
        .then((res) => setTasks(res.data))
        .catch((err) => console.error("Error fetching deleted tasks:", err));
      return;
    }
    // Otherwise, fetch tasks for the specific space
    axios
      .get(`${TASKS_API_URL}?spaceId=${selectedSpaceId}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error("Error fetching tasks:", err));
  }

  /**
   * Add a new task to the current space, with optional due date and priority.
   */
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

  /**
   * Toggle a task's completion state.
   */
  function markComplete(task) {
    axios
      .put(`${TASKS_API_URL}/${task._id}`, {
        ...task,
        completed: !task.completed,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error("Error toggling complete:", err));
  }

  /**
   * Soft-delete a task (moves it to "deleted" space).
   */
  function deleteTask(taskId) {
    axios
      .delete(`${TASKS_API_URL}/${taskId}`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error deleting task:", err));
  }

  /**
   * Restore a soft-deleted task (renamed from "undelete").
   */
  function restoreTask(taskId) {
    axios
      .put(`${TASKS_API_URL}/${taskId}/restore`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error restoring task:", err));
  }

  /**
   * Sort tasks in memory based on the selected sortBy setting.
   */
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
        // Sort by due date ascending
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        // Then by priority descending
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        // Then by created date ascending
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        // Sort by priority descending
        if (aPrio !== bPrio) {
          return bPrio - aPrio;
        }
        // Then by due date ascending
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        // Finally by created date ascending
        return aCreated - bCreated;
      } else {
        // sortBy === "createdAt"
        // Sort by creation date ascending
        return aCreated - bCreated;
      }
    });
    return sorted;
  }

  /**
   * Group tasks by due date if sortBy === "dueDate". Otherwise, return a single group.
   */
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

  // Generate sorted and grouped tasks
  const sortedTasks = getSortedTasks();
  const groupedTasks = groupTasksByDueDate(sortedTasks);

  /**
   * Toggle a task's expanded/collapsed state.
   */
  function toggleExpandTask(taskId) {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  /**
   * Toggle bulk edit mode, which expands all tasks automatically.
   */
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

  // ---------- Sub-list logic: create or view sub-lists ----------
  function addSubList(taskId) {
    axios
      .post(SUBLISTS_API_URL, { taskId, name: "New List" })
      .then((res) => {
        // Navigate to the new sub-list
        setSelectedSubListId(res.data._id);
        setViewingSubList(true);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function viewSubList(subListId) {
    setSelectedSubListId(subListId);
    setViewingSubList(true);
  }

  // If currently viewing a sub-list, show SubListView instead of the tasks
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

  // Helper for priority styling
  function getPriorityClass(task) {
    if (task.priority === "high") return "priority-high";
    if (task.priority === "priority") return "priority-normal";
    return "";
  }

  // ---------- Render UI ----------
  return (
    <div className="app-container">
      <h1>My To-Do List</h1>

      {/* Space selection. If you have a separate "Spaces" component, remove or adapt this. */}
      <div className="spaces-row">
        <label htmlFor="spaceSelect">Space:</label>
        <select
          id="spaceSelect"
          value={selectedSpaceId}
          onChange={(e) => setSelectedSpaceId(e.target.value)}
        >
          <option value="ALL">View All</option>
          <option value="DELETED">Deleted Tasks</option>
          {/* If you have additional spaces, you could map them here, or handle them in a separate component */}
        </select>
      </div>

      {/* New Task Form (disabled if "ALL" or "DELETED") */}
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

      {/* Task list, grouped by date if "dueDate" sorting */}
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
                        {/* If in "DELETED" space, show "Restore" button only */}
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
                            {/* Example "Delete" button */}
                            <button
                              className="delete-btn"
                              onClick={() => deleteTask(task._id)}
                            >
                              Delete
                            </button>

                            {/* Sub-list Buttons for this task */}
                            <SubListButtons
                              taskId={task._id}
                              onAddSubList={addSubList}
                              onViewSubList={viewSubList}
                            />
                          </div>
                        )}

                        {/* Additional info (like created date or due date) can go here if desired */}
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