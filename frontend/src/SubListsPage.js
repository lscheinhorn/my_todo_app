// SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

/**
 * Adjust these to your actual backend domain:
 * e.g. "https://my-todo-app-mujx.onrender.com"
 */
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

/**
 * SubListsPage:
 * - At the top: A "Sub-lists" selector (like "Spaces"), letting you add or delete sub-lists for the current task.
 * - Then, once a sub-list is selected, shows an "Items" area that behaves like "Tasks" but for "items":
 *   - New item form with text, optional dueTime, priority, etc.
 *   - Sort & bulk edit expansions for items
 *   - Items grouped by time if sortBy = "dueTime"
 *   - Mark items complete, delete them, edit them
 */
function SubListsPage() {
  // The parent "taskId" from the URL param, e.g. /sublist/:taskId
  const { taskId } = useParams();
  const navigate = useNavigate();

  // We'll fetch the parent task's name to display at the top
  const [taskName, setTaskName] = useState(null);
  const [taskError, setTaskError] = useState(false);

  // 1) Sub-lists array, just like "spaces"
  const [subLists, setSubLists] = useState([]);
  // Which sub-list is currently selected
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // "New sub-list" form
  const [newSubListName, setNewSubListName] = useState("");
  const [showAddSubList, setShowAddSubList] = useState(false);
  // For toggling "delete mode" on sub-lists
  const [deleteMode, setDeleteMode] = useState(false);

  // 2) Items area (like "tasks")
  const [items, setItems] = useState([]);
  // Sorting by "dueTime", "priority", or "createdAt"
  const [sortBy, setSortBy] = useState("dueTime");
  // Bulk edit expansions
  const [bulkEdit, setBulkEdit] = useState(false);
  // Which items are expanded
  const [expandedItems, setExpandedItems] = useState({});
  // Which items are in "edit" mode
  const [editingItems, setEditingItems] = useState({});

  // "New item" form
  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState("none");
  const [showDueTime, setShowDueTime] = useState(false);
  const [newItemDueTime, setNewItemDueTime] = useState("");

  // ======= FETCH THE PARENT TASK NAME & SUB-LISTS ON MOUNT =======
  useEffect(() => {
    fetchParentTask();
    fetchSubLists();
    // Reset the selected sub-list & items
    setSelectedSubListId(null);
    setItems([]);
  }, [taskId]);

  // If the user picks a different sub-list, fetch that sub-list's items
  useEffect(() => {
    if (selectedSubListId) {
      fetchItems(selectedSubListId);
    } else {
      setItems([]);
    }
  }, [selectedSubListId]);

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
    if (!newSubListName.trim()) {
      setShowAddSubList(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newSubListName })
      .then(() => {
        setNewSubListName("");
        setShowAddSubList(false);
        fetchSubLists();
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  // Delete a sub-list
  function handleDeleteSubList(e, subListId) {
    e.stopPropagation();
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}`)
      .then(() => {
        // if we were viewing that sub-list, reset
        if (subListId === selectedSubListId) {
          setSelectedSubListId(null);
          setItems([]);
        }
        fetchSubLists();
      })
      .catch((err) => console.error("Error deleting sub-list:", err));
  }

  // ========== ITEMS AREA (like tasks) ==========
  function fetchItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        // subList doc includes items array
        setItems(res.data.items || []);
      })
      .catch((err) => console.error("Error fetching items:", err));
  }

  // Add a new item
  function addItem(e) {
    e.preventDefault();
    if (!newItemText.trim() || !selectedSubListId) return;

    const data = {
      text: newItemText,
      priority: newItemPriority,
      dueTime: showDueTime ? newItemDueTime : "",
    };
    axios
      .post(`${SUBLISTS_API_URL}/${selectedSubListId}/items`, data)
      .then((res) => {
        setItems(res.data.items || []);
        setNewItemText("");
        setNewItemPriority("none");
        setShowDueTime(false);
        setNewItemDueTime("");
      })
      .catch((err) => console.error("Error adding item:", err));
  }

  // Mark item complete
  function markComplete(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => {
        setItems(res.data.items || []);
      })
      .catch((err) => console.error("Error toggling item complete:", err));
  }

  // Delete an item
  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => setItems(res.data.items || []))
      .catch((err) => console.error("Error deleting item:", err));
  }

  // Expand an item
  function toggleExpandItem(itemId) {
    if (!bulkEdit) {
      setExpandedItems((prev) => {
        const was = !!prev[itemId];
        const newState = {};
        if (!was) newState[itemId] = true;
        return newState;
      });
    } else {
      setExpandedItems((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    }
  }

  // Start editing an item
  function startEditingItem(itemId) {
    setEditingItems((prev) => ({ ...prev, [itemId]: true }));
  }

  // Stop editing an item
  function stopEditingItem(itemId) {
    setEditingItems((prev) => ({ ...prev, [itemId]: false }));
  }

  // Save item edits
  function saveItemEdits(item, updatedFields) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, updatedFields)
      .then((res) => {
        setItems(res.data.items || []);
        stopEditingItem(item._id);
        setExpandedItems((prev) => ({ ...prev, [item._id]: false }));
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  // Bulk edit expansions for items
  function toggleBulkEdit() {
    const nextVal = !bulkEdit;
    setBulkEdit(nextVal);
    if (nextVal) {
      // expand all
      const expandMap = {};
      items.forEach((i) => (expandMap[i._id] = true));
      setExpandedItems(expandMap);
    } else {
      setExpandedItems({});
    }
  }

  // Sorting & grouping items by dueTime, priority, or createdAt
  function getSortedItems() {
    const sorted = [...items];
    sorted.sort((a, b) => {
      // completed last
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      const priorityRank = { high: 2, priority: 1, none: 0 };
      const aPrio = priorityRank[a.priority] || 0;
      const bPrio = priorityRank[b.priority] || 0;
      const aCreated = new Date(a.createdAt);
      const bCreated = new Date(b.createdAt);

      if (sortBy === "dueTime") {
        // parse "HH:MM" to compare times
        const parseTime = (t) => {
          if (!t) return null;
          const match = t.match(/(\d{1,2}):(\d{2})/);
          if (!match) return null;
          const hh = parseInt(match[1], 10);
          const mm = parseInt(match[2], 10);
          return hh * 60 + mm;
        };
        const aTime = parseTime(a.dueTime);
        const bTime = parseTime(b.dueTime);
        if (aTime == null && bTime != null) return 1;
        if (aTime != null && bTime == null) return -1;
        if (aTime != null && bTime != null && aTime !== bTime) {
          return aTime - bTime;
        }
        // then priority
        if (aPrio !== bPrio) return bPrio - aPrio;
        // then createdAt
        return aCreated - bCreated;
      } else if (sortBy === "priority") {
        // priority first
        if (aPrio !== bPrio) return bPrio - aPrio;
        // then dueTime
        const parseTime = (t) => {
          if (!t) return null;
          const match = t.match(/(\d{1,2}):(\d{2})/);
          if (!match) return null;
          const hh = parseInt(match[1], 10);
          const mm = parseInt(match[2], 10);
          return hh * 60 + mm;
        };
        const aTime = parseTime(a.dueTime);
        const bTime = parseTime(b.dueTime);
        if (aTime == null && bTime != null) return 1;
        if (aTime != null && bTime == null) return -1;
        if (aTime != null && bTime != null && aTime !== bTime) {
          return aTime - bTime;
        }
        // then createdAt
        return aCreated - bCreated;
      } else {
        // sortBy === "createdAt"
        return aCreated - bCreated;
      }
    });
    return sorted;
  }

  // Group items by time if sortBy=dueTime
  function groupItemsByTime(sortedItems) {
    if (sortBy !== "dueTime") {
      return [{ timeLabel: null, items: sortedItems }];
    }
    // We'll group by "Due by HH:MM" or "No Due Time"
    const groups = {};
    sortedItems.forEach((item) => {
      if (!item.dueTime) {
        const key = "No Due Time";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      } else {
        const key = `Due by ${item.dueTime}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    });
    // sort the keys by time
    const parseTime = (str) => {
      if (str === "No Due Time") return 99999;
      const match = str.match(/(\d{1,2}):(\d{2})$/);
      if (!match) return 99999;
      const hh = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      return hh * 60 + mm;
    };
    const sortedKeys = Object.keys(groups).sort((a, b) => parseTime(a) - parseTime(b));
    return sortedKeys.map((key) => ({ timeLabel: key, items: groups[key] }));
  }

  // =========== RENDER ===========

  function handleBack() {
    navigate("/");
  }

  const sortedItems = getSortedItems();
  const groupedItems = groupItemsByTime(sortedItems);

  return (
    <div className="app-container" style={{ position: "relative" }}>
      {/* Top left "back to tasks" */}
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

      {/* Show the parent task name */}
      {taskError ? (
        <h1>Error loading parent task</h1>
      ) : taskName === null ? (
        <h1>Loading parent task...</h1>
      ) : (
        <h1>Sub-lists for Task: {taskName}</h1>
      )}

      {/* SUB-LISTS SELECTOR (like Spaces) */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        {/* Render sub-lists row */}
        {subLists.map((sl) => (
          <div
            key={sl._id}
            onClick={() => {
              setSelectedSubListId(sl._id);
              setBulkEdit(false);
              setExpandedItems({});
              setEditingItems({});
            }}
            style={{
              padding: "6px 12px",
              backgroundColor: "#2C2C2E",
              borderRadius: "4px",
              cursor: "pointer",
              border: sl._id === selectedSubListId ? "1px solid #61dafb" : "1px solid transparent",
            }}
          >
            {sl.name}
            {/* If in delete mode, show X to delete sub-list */}
            {deleteMode && (
              <button
                onClick={(e) => handleDeleteSubList(e, sl._id)}
                style={{ marginLeft: "8px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                X
              </button>
            )}
          </div>
        ))}

        {/* "Add sub-list" button */}
        {showAddSubList ? (
          <form onSubmit={addSubList} style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="New sub-list..."
              value={newSubListName}
              onChange={(e) => setNewSubListName(e.target.value)}
            />
            <button type="submit">OK</button>
            <button type="button" onClick={() => setShowAddSubList(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button onClick={() => setShowAddSubList(true)}>Add List</button>
        )}

        {/* Toggle "delete mode" */}
        <button onClick={() => setDeleteMode(!deleteMode)}>
          {deleteMode ? "Stop Deleting" : "Delete Lists"}
        </button>
      </div>

      {/* If a sub-list is selected, show the "items" area (like tasks) */}
      {selectedSubListId && (
        <>
          {/* New item form, same style as tasks */}
          <form className="new-task-form" onSubmit={addItem}>
            <div className="form-row">
              <input
                type="text"
                placeholder="New item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
              <select
                value={newItemPriority}
                onChange={(e) => setNewItemPriority(e.target.value)}
              >
                <option value="none">No Priority</option>
                <option value="priority">Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {!showDueTime ? (
              <button
                type="button"
                onClick={() => {
                  setShowDueTime(true);
                  setNewItemDueTime("12:00");
                }}
              >
                Set due time
              </button>
            ) : (
              <>
                <input
                  type="time"
                  value={newItemDueTime}
                  onChange={(e) => setNewItemDueTime(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowDueTime(false);
                    setNewItemDueTime("");
                  }}
                >
                  Remove time
                </button>
              </>
            )}

            <button type="submit">Add</button>
          </form>

          {/* Sort & Bulk Edit for items */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div className="sort-row">
              <label htmlFor="sortBy">Sort By:</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="dueTime">Due Time</option>
                <option value="priority">Priority</option>
                <option value="createdAt">Date Created</option>
              </select>
            </div>

            <button onClick={toggleBulkEdit}>
              {bulkEdit ? "Stop Bulk Edit" : "Edit All"}
            </button>
          </div>

          {/* Grouped items by time if sortBy=dueTime */}
          {groupedItems.map((group) => (
            <div key={group.timeLabel || "no-time"} style={{ marginBottom: "20px" }}>
              {group.timeLabel && (
                <h3 className="date-group-label">{group.timeLabel}</h3>
              )}
              <ul className="tasks-list">
                {group.items.map((item) => {
                  const isExpanded = expandedItems[item._id] || false;
                  const isEditing = editingItems[item._id] || false;

                  let priorityClass = "";
                  if (item.priority === "high") priorityClass = "priority-high";
                  else if (item.priority === "priority") priorityClass = "priority-normal";

                  return (
                    <li
                      key={item._id}
                      className={`tasks-list-item ${priorityClass}`}
                      tabIndex={-1}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          className="mark-complete-checkbox"
                          checked={!!item.completed}
                          onChange={() => markComplete(item)}
                          aria-label={`Mark ${item.text} as complete`}
                        />
                        <div
                          className="task-main-content"
                          style={{ cursor: "pointer", flex: 1 }}
                          onClick={() => {
                            if (!isEditing) toggleExpandItem(item._id);
                          }}
                        >
                          <div className="collapsed-row">
                            <div>
                              {item.text}
                              {item.priority !== "none" && ` (${item.priority})`}
                            </div>
                            <button className="show-more-btn">
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="expanded-row">
                          {!isEditing ? (
                            <div
                              className="actions-row"
                              style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}
                            >
                              <button onClick={() => startEditingItem(item._id)}>Edit</button>

                              <div className="task-created-date" style={{ marginLeft: "auto" }}>
                                Created:{" "}
                                {new Date(item.createdAt).toLocaleString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>

                              <button
                                className="delete-btn"
                                style={{ marginLeft: "auto" }}
                                onClick={() => deleteItem(item._id)}
                              >
                                🗑
                              </button>
                            </div>
                          ) : (
                            <ItemEditForm
                              item={item}
                              onSave={(updated) => saveItemEdits(item, updated)}
                              onCancel={() => stopEditingItem(item._id)}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** Edit form for an item, parallel to the tasks "edit" form. */
function ItemEditForm({ item, onSave, onCancel }) {
  const [editText, setEditText] = useState(item.text);
  const [editPriority, setEditPriority] = useState(item.priority || "none");
  const [editDueTime, setEditDueTime] = useState(item.dueTime || "");
  const [editCompleted, setEditCompleted] = useState(!!item.completed);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      text: editText,
      priority: editPriority,
      dueTime: editDueTime,
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
          type="time"
          value={editDueTime}
          onChange={(e) => setEditDueTime(e.target.value)}
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