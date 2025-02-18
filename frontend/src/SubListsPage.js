// SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "./App.css";
import axios from "axios";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsPage:
 * - Title with the task name (or "Loading..." if not yet fetched).
 * - Left arrow near top-left to go back directly to tasks page.
 * - Row of sub-lists, plus "Add New List" if mode=add is not set. If mode=add => show add form.
 * - Each sub-list's items are grouped by time (like "Due by 03:30" sections). Completed items go last.
 */
function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [taskName, setTaskName] = useState(null); // null => not loaded yet
  const [subLists, setSubLists] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // Items for the selected sub-list
  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  useEffect(() => {
    fetchTaskName();
    fetchSubLists();
  }, [taskId]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const listId = searchParams.get("listId");
    if (mode === "add") {
      setShowAddList(true);
      setSelectedSubListId(null);
    } else {
      setShowAddList(false);
      if (listId) {
        setSelectedSubListId(listId);
      } else {
        setSelectedSubListId(null);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedSubListId) {
      fetchItems(selectedSubListId);
    } else {
      setItems([]);
    }
  }, [selectedSubListId]);

  function fetchTaskName() {
    axios
      .get(`${TASKS_API_URL}/${taskId}`)
      .then((res) => {
        setTaskName(res.data.text || "Untitled Task");
      })
      .catch(() => setTaskName("Error loading task"));
  }

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function fetchItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        const grouped = groupItemsByDueTime(res.data.items || []);
        setItems(grouped);
      })
      .catch((err) => console.error("Error fetching sub-list items:", err));
  }

  // Group items by time, reorder completed items to bottom
  // We'll produce an array of { timeLabel: "Due by 03:30", items: [...] }
  function groupItemsByDueTime(itemArray) {
    const groups = {};
    itemArray.forEach((item) => {
      if (!item.dueTime) {
        if (!groups["No Due Time"]) groups["No Due Time"] = [];
        groups["No Due Time"].push(item);
      } else {
        const label = `Due by ${item.dueTime}`;
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      }
    });

    // Sort times ascending
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "No Due Time") return 1;
      if (b === "No Due Time") return -1;
      // parse "Due by HH:MM"
      const parseTime = (str) => {
        const match = str.match(/(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const hh = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        return hh * 60 + mm;
      };
      return parseTime(a) - parseTime(b);
    });

    // For each group, reorder completed items to bottom
    const result = sortedKeys.map((key) => {
      const arr = groups[key].slice().sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        // then by created date
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      return { timeLabel: key, items: arr };
    });
    return result;
  }

  function addSubList(e) {
    e.preventDefault();
    if (!newListName.trim()) {
      setShowAddList(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newListName })
      .then((res) => {
        setNewListName("");
        setShowAddList(false);
        fetchSubLists();
        setSearchParams({ listId: res.data._id });
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function selectSubList(listId) {
    setSearchParams({ listId });
  }

  function selectAddNewList() {
    setSearchParams({ mode: "add" });
  }

  // Items logic
  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => {
        const grouped = groupItemsByDueTime(res.data.items || []);
        setItems(grouped);
      })
      .catch((err) => console.error("Error toggling item:", err));
  }

  function toggleExpandItem(itemId) {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  function startEditingItem(itemId) {
    setEditingItems((prev) => ({ ...prev, [itemId]: true }));
  }

  function stopEditingItem(itemId) {
    setEditingItems((prev) => ({ ...prev, [itemId]: false }));
  }

  function saveItemEdits(itemId, updatedFields) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`, updatedFields)
      .then((res) => {
        const grouped = groupItemsByDueTime(res.data.items || []);
        setItems(grouped);
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => {
        const grouped = groupItemsByDueTime(res.data.items || []);
        setItems(grouped);
      })
      .catch((err) => console.error("Error deleting item:", err));
  }

  function addNewItem(text, priority, dueTime) {
    axios
      .post(`${SUBLISTS_API_URL}/${selectedSubListId}/items`, {
        text,
        priority,
        dueTime,
      })
      .then((res) => {
        const grouped = groupItemsByDueTime(res.data.items || []);
        setItems(grouped);
      })
      .catch((err) => console.error("Error adding item:", err));
  }

  // Always go straight back to tasks page
  function handleBack() {
    navigate("/");
  }

  return (
    <div className="app-container" style={{ position: "relative" }}>
      {/* A bigger arrow, not too far left */}
      <button
        onClick={handleBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          fontSize: "1.5rem",
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
        }}
        aria-label="Go back to tasks"
      >
        ⬅
      </button>

      <h1 style={{ marginTop: "0" }}>
        {taskName === null ? "Loading..." : `Task: ${taskName}`}
      </h1>

      {/* Row of sub-lists */}
      <div className="sub-lists-row">
        {subLists.map((sub) => (
          <div
            key={sub._id}
            className={`space-item ${
              sub._id === selectedSubListId ? "selected" : ""
            }`}
            onClick={() => selectSubList(sub._id)}
          >
            {sub.name}
          </div>
        ))}

        <div className="space-item" onClick={selectAddNewList}>
          Add New List
        </div>
      </div>

      {showAddList && (
        <form onSubmit={addSubList} style={{ marginBottom: "20px" }}>
          <input
            className="add-space-input"
            placeholder="Sub-list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      )}

      {/* If a sub-list is selected, show items grouped by time */}
      {selectedSubListId && !showAddList && (
        <SubListItems
          items={items}
          expandedItems={expandedItems}
          editingItems={editingItems}
          onToggleComplete={toggleCompleteItem}
          onToggleExpand={toggleExpandItem}
          onStartEdit={startEditingItem}
          onStopEdit={stopEditingItem}
          onSaveEdit={saveItemEdits}
          onDeleteItem={deleteItem}
          onAddItem={addNewItem}
        />
      )}
    </div>
  );
}

/**
 * SubListItems:
 * - Grouped by time (like "No Due Time," "Due by 03:30," etc.).
 * - Each group has items with a checkbox, "Show More," "Edit," "Delete," and "Created date."
 */
function SubListItems({
  items,
  expandedItems,
  editingItems,
  onToggleComplete,
  onToggleExpand,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
  onDeleteItem,
  onAddItem,
}) {
  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState("none");
  const [showDueTime, setShowDueTime] = useState(false);
  const [newItemDueTime, setNewItemDueTime] = useState("");

  function handleAddItem(e) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddItem(newItemText, newItemPriority, showDueTime ? newItemDueTime : "");
    setNewItemText("");
    setNewItemPriority("none");
    setShowDueTime(false);
    setNewItemDueTime("");
  }

  function getPriorityLabel(priority) {
    if (priority === "high") return "High Priority";
    if (priority === "priority") return "Priority";
    return "";
  }

  return (
    <div className="tasks-container">
      {/* Add item form */}
      <form className="new-task-form" onSubmit={handleAddItem}>
        <div className="form-row">
          <input
            type="text"
            placeholder="New list item..."
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

      {/* 'items' is an array of groups: [{timeLabel, items:[]}, ...] */}
      {items.map((group) => (
        <div key={group.timeLabel} style={{ marginBottom: "20px" }}>
          <h3 className="time-group-label">{group.timeLabel}</h3>
          <ul className="tasks-list">
            {group.items.map((item) => {
              const isExpanded = expandedItems[item._id] || false;
              const isEditing = editingItems[item._id] || false;
              const priorityLabel = getPriorityLabel(item.priority);
              let priorityClass = "";
              if (item.priority === "high") priorityClass = "priority-high";
              else if (item.priority === "priority") priorityClass = "priority-normal";

              return (
                <li
                  key={item._id}
                  className={`tasks-list-item ${priorityClass}`}
                  tabIndex={-1}
                >
                  {/* Mark complete on the left (green check) */}
                  <input
                    type="checkbox"
                    className="mark-complete-checkbox"
                    checked={item.completed}
                    onChange={() => onToggleComplete(item)}
                    aria-label={`Mark ${item.text} as complete`}
                  />

                  {/* Main content clickable to expand */}
                  <div
                    className="task-main-content"
                    onClick={() => onToggleExpand(item._id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="collapsed-row">
                      <div className="text-with-priority">
                        {item.text}
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
                      {!isEditing ? (
                        <div className="actions-row">
                          {/* Delete icon on the far left */}
                          <button
                            className="delete-btn"
                            onClick={() => onDeleteItem(item._id)}
                            title="Delete Item"
                          >
                            🗑
                          </button>
                          <button onClick={() => onStartEdit(item._id)}>Edit</button>

                          {/* Created date on the right */}
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
                        </div>
                      ) : (
                        <>
                          <ItemEditForm
                            item={item}
                            onSave={(updated) => onSaveEdit(item._id, updated)}
                            onCancel={() => onStopEdit(item._id)}
                          />
                          <div className="task-created-date" style={{ textAlign: "right" }}>
                            Created:{" "}
                            {new Date(item.createdAt).toLocaleString(undefined, {
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
  );
}

/** ItemEditForm: inline edit for text, priority, dueTime, completed */
function ItemEditForm({ item, onSave, onCancel }) {
  const [editText, setEditText] = useState(item.text);
  const [editPriority, setEditPriority] = useState(item.priority || "none");
  const [editDueTime, setEditDueTime] = useState(item.dueTime || "");
  const [editCompleted, setEditCompleted] = useState(item.completed || false);

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