// src/SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import SubListItems from "./SubListItems";

// Point this to your actual backend domain
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";
// For fetching the parent task’s title
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

/**
 * SubListsPage:
 *   - Similar to TasksPage, but for sub-lists belonging to a parent task (taskId).
 *   - We can add new sub-lists, edit them, delete them, mark them complete, etc.
 *   - We also do "bulk edit" expansions and sorting by dueDate, priority, or createdAt.
 *   - Inside each sub-list, we show SubListItems, which is analogous to "sub-lists" in tasks.
 */
function SubListsPage() {
  // We get the parent task ID from the URL, e.g. /sublist/:taskId
  const { taskId } = useParams();
  const navigate = useNavigate();

  // For optional query parameters, if you want them:
  const [searchParams] = useSearchParams();

  // We fetch the parent task’s name for the heading
  const [taskName, setTaskName] = useState(null);
  const [taskError, setTaskError] = useState(false);

  // Sub-lists array
  const [subLists, setSubLists] = useState([]);

  // Sorting: "dueDate", "priority", "createdAt"
  const [sortBy, setSortBy] = useState("dueDate");

  // For expansions
  const [expandedSubLists, setExpandedSubLists] = useState({});
  // For "bulk edit" expansions
  const [bulkEdit, setBulkEdit] = useState(false);

  // For editing sub-lists (like editing tasks)
  const [editingSubLists, setEditingSubLists] = useState({});

  // New sub-list form
  const [newSubListText, setNewSubListText] = useState("");
  const [newSubListPriority, setNewSubListPriority] = useState("none");
  const [showNewSubListDueDate, setShowNewSubListDueDate] = useState(false);
  const [newSubListDueDate, setNewSubListDueDate] = useState("");

  // On mount (and whenever taskId changes), fetch the parent task name and sub-lists
  useEffect(() => {
    fetchParentTask();
    fetchSubLists();
  }, [taskId]);

  function fetchParentTask() {
    axios
      .get(`${TASKS_API_URL}/${taskId}`)
      .then((res) => {
        if (res.data && res.data.text) {
          setTaskName(res.data.text);
        } else {
          setTaskError(true);
        }
      })
      .catch(() => setTaskError(true));
  }

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  // Add a new sub-list
  function addSubList(e) {
    e.preventDefault();
    if (!newSubListText.trim()) return;

    const dueDateToSend = showNewSubListDueDate ? newSubListDueDate : null;

    const subListData = {
      taskId,
      name: newSubListText, // parallel to "text"
      completed: false,     // if your schema has it
      priority: newSubListPriority,
      dueDate: dueDateToSend, // if your schema includes dueDate
    };

    axios
      .post(SUBLISTS_API_URL, subListData)
      .then(() => {
        setNewSubListText("");
        setNewSubListPriority("none");
        setShowNewSubListDueDate(false);
        setNewSubListDueDate("");
        fetchSubLists();
      })
      .catch((err) => console.error("Error adding sub-list:", err));
  }

  // Mark a sub-list as complete (if your schema has a "completed" field)
  function markComplete(subList) {
    axios
      .put(`${SUBLISTS_API_URL}/${subList._id}`, {
        ...subList,
        completed: !subList.completed,
      })
      .then(() => fetchSubLists())
      .catch((err) => console.error("Error toggling sub-list complete:", err));
  }

  // Delete a sub-list
  function deleteSubList(id) {
    axios
      .delete(`${SUBLISTS_API_URL}/${id}`)
      .then(() => fetchSubLists())
      .catch((err) => console.error("Error deleting sub-list:", err));
  }

  // Expand/collapse a single sub-list
  function toggleExpandSubList(id) {
    if (!bulkEdit) {
      // auto-collapse others
      setExpandedSubLists((prev) => {
        const was = !!prev[id];
        const newState = {};
        if (!was) newState[id] = true;
        return newState;
      });
    } else {
      // in bulk edit => multiple expansions
      setExpandedSubLists((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  }

  // For editing a sub-list
  function startEditingSubList(id) {
    setEditingSubLists((prev) => ({ ...prev, [id]: true }));
  }
  function stopEditingSubList(id) {
    setEditingSubLists((prev) => ({ ...prev, [id]: false }));
  }

  function saveSubListEdits(id, updatedFields) {
    const subList = subLists.find((s) => s._id === id);
    if (!subList) return;

    axios
      .put(`${SUBLISTS_API_URL}/${id}`, { ...subList, ...updatedFields })
      .then(() => {
        stopEditingSubList(id);
        setExpandedSubLists((prev) => ({ ...prev, [id]: false }));
        fetchSubLists();
      })
      .catch((err) => console.error("Error saving sub-list edits:", err));
  }

  // Bulk edit toggles expansions
  function toggleBulkEdit() {
    const nextVal = !bulkEdit;
    setBulkEdit(nextVal);
    if (nextVal) {
      const expandMap = {};
      subLists.forEach((s) => (expandMap[s._id] = true));
      setExpandedSubLists(expandMap);
    } else {
      setExpandedSubLists({});
    }
  }

  // Sorting sub-lists: by "dueDate", "priority", "createdAt"
  function getSortedSubLists() {
    const sorted = [...subLists];
    sorted.sort((a, b) => {
      // If you want to treat subList as having "completed" or "deletedAt," do that here.
      // We'll do "completed last" for consistency:
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // If you store "dueDate" in the sub-list doc, parse it:
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
        // then priority
        if (aPrio !== bPrio) return bPrio - aPrio;
        // then created
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        if (aPrio !== bPrio) return bPrio - aPrio;
        // then due date
        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;
        if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
          return aDue - bDue;
        }
        // then created
        return aCreated - bCreated;
      } else {
        // sortBy = "createdAt"
        return aCreated - bCreated;
      }
    });
    return sorted;
  }

  // Optionally group by dueDate. If you want the same approach as tasks, do:
  function groupByDueDate(sortedSubLists) {
    if (sortBy !== "dueDate") {
      return [{ dateLabel: null, subLists: sortedSubLists }];
    }
    const groups = {};
    sortedSubLists.forEach((s) => {
      if (!s.dueDate) {
        const key = "No Due Date";
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      } else {
        const dayKey = new Date(s.dueDate).toISOString().split("T")[0];
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(s);
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
      return { dateLabel, subLists: groups[key] };
    });
  }

  const sorted = getSortedSubLists();
  const groupedSubLists = groupByDueDate(sorted);

  function handleBack() {
    navigate("/");
  }

  return (
    <div className="app-container" style={{ position: "relative" }}>
      <button
        onClick={handleBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          fontSize: "1.2rem",
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
        }}
        aria-label="Return to Tasks"
      >
        ← Return to Tasks
      </button>

      {taskError ? (
        <h1>Error loading parent task</h1>
      ) : taskName === null ? (
        <h1>Loading parent task...</h1>
      ) : (
        <h1>Sub-Lists for Task: {taskName}</h1>
      )}

      {/* New sub-list form, same style as tasks page */}
      <form className="new-task-form" onSubmit={addSubList}>
        <div className="form-row">
          <input
            type="text"
            placeholder="New sub-list..."
            value={newSubListText}
            onChange={(e) => setNewSubListText(e.target.value)}
          />
          <select
            value={newSubListPriority}
            onChange={(e) => setNewSubListPriority(e.target.value)}
          >
            <option value="none">No Priority</option>
            <option value="priority">Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {!showNewSubListDueDate ? (
          <button
            type="button"
            onClick={() => {
              setShowNewSubListDueDate(true);
              setNewSubListDueDate(new Date().toISOString().split("T")[0]);
            }}
          >
            Set due date
          </button>
        ) : (
          <>
            <input
              type="date"
              value={newSubListDueDate}
              onChange={(e) => setNewSubListDueDate(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setShowNewSubListDueDate(false);
                setNewSubListDueDate("");
              }}
            >
              Remove due date
            </button>
          </>
        )}

        <button type="submit">Add</button>
      </form>

      {/* Sort & Bulk Edit */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
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

        <button onClick={toggleBulkEdit}>
          {bulkEdit ? "Stop Bulk Edit" : "Edit All"}
        </button>
      </div>

      {/* Sub-lists grouped by date if sortBy=dueDate */}
      {groupedSubLists.map((group) => (
        <div key={group.dateLabel || "no-date"} className="date-group">
          {group.dateLabel && (
            <h2 className="date-group-label">{group.dateLabel}</h2>
          )}
          <ul className="tasks-list">
            {group.subLists.map((sub) => {
              const isExpanded = expandedSubLists[sub._id] || false;
              const isEditing = editingSubLists[sub._id] || false;

              // If your sub-list doc has "completed," "priority," "dueDate," etc., we do parallels:
              let priorityClass = "";
              if (sub.priority === "high") priorityClass = "priority-high";
              else if (sub.priority === "priority") priorityClass = "priority-normal";

              return (
                <li
                  key={sub._id}
                  className={`tasks-list-item ${priorityClass}`}
                  tabIndex={-1}
                >
                  {/* Inline checkbox with the sub-list name */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="mark-complete-checkbox"
                      checked={!!sub.completed}
                      onChange={() => markComplete(sub)}
                      aria-label={`Mark sub-list ${sub.name} as complete`}
                    />
                    <div
                      className="task-main-content"
                      onClick={() => {
                        if (!isEditing) toggleExpandSubList(sub._id);
                      }}
                      aria-expanded={isExpanded}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="collapsed-row">
                        <div className="text-with-priority">
                          {sub.name}
                          {sub.priority !== "none" && ` (${sub.priority})`}
                        </div>
                        <button className="show-more-btn">
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded row */}
                  {isExpanded && (
                    <div className="expanded-row">
                      {!isEditing ? (
                        <div
                          className="actions-row"
                          style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}
                        >
                          <button onClick={() => startEditingSubList(sub._id)}>
                            Edit
                          </button>

                          {/* Show sub-list items here, if your doc has items array */}
                          <SubListItems subListId={sub._id} />

                          {/* Created date (if you store createdAt) */}
                          {sub.createdAt && (
                            <div className="task-created-date">
                              Created:{" "}
                              {new Date(sub.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}

                          {/* Trash can on far right */}
                          <button
                            className="delete-btn"
                            style={{ marginLeft: "auto" }}
                            onClick={() => deleteSubList(sub._id)}
                            aria-label="Delete sub-list"
                          >
                            🗑
                          </button>
                        </div>
                      ) : (
                        <>
                          <SubListEditForm
                            subList={sub}
                            onSave={(updatedFields) => saveSubListEdits(sub._id, updatedFields)}
                            onCancel={() => stopEditingSubList(sub._id)}
                          />
                          {sub.createdAt && (
                            <div
                              className="task-created-date"
                              style={{ textAlign: "right" }}
                            >
                              Created:{" "}
                              {new Date(sub.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
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
  );
}

/**
 * SubListEditForm - parallels TaskEditForm
 */
function SubListEditForm({ subList, onSave, onCancel }) {
  const [editName, setEditName] = useState(subList.name);
  const [editPriority, setEditPriority] = useState(subList.priority || "none");
  const [editDueDate, setEditDueDate] = useState(
    subList.dueDate ? subList.dueDate.substring(0, 10) : ""
  );
  const [editCompleted, setEditCompleted] = useState(!!subList.completed);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name: editName,
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
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
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

export default SubListsPage;