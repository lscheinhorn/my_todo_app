// SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "./App.css";
import axios from "axios";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsPage:
 * - Shows top-left "←" back button
 * - If mode=add, user sees "Add new sub-list" form
 * - If listId=xxx, user sees that sub-list's items
 * - Completed items reorder to the bottom
 * - Created date is shown in expanded view
 */
function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [taskName, setTaskName] = useState("Loading...");
  const [subLists, setSubLists] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // Items
  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  useEffect(() => {
    fetchTaskName();
    fetchSubLists();
  }, [taskId]);

  // Check query params
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

  // Whenever selectedSubListId changes, fetch items
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
      .catch((err) => console.error("Error fetching task name:", err));
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
        // reorder completed items to bottom
        const reordered = reorderCompleted(res.data.items || []);
        setItems(reordered);
      })
      .catch((err) => console.error("Error fetching sub-list items:", err));
  }

  // Reorder completed items to the bottom
  function reorderCompleted(itemArray) {
    return itemArray.slice().sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      // then by creation date
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
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
        // select the new sub-list
        setSearchParams({ listId: res.data._id });
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  // Navigation logic for sub-lists
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
        const reordered = reorderCompleted(res.data.items || []);
        setItems(reordered);
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
        const reordered = reorderCompleted(res.data.items || []);
        setItems(reordered);
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => {
        const reordered = reorderCompleted(res.data.items || []);
        setItems(reordered);
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
        const reordered = reorderCompleted(res.data.items || []);
        setItems(reordered);
      })
      .catch((err) => console.error("Error adding item:", err));
  }

  // Back button logic
  // If mode=add, pressing back cancels add mode. If no sub-list selected, go back to tasks page
  function handleBack() {
    const mode = searchParams.get("mode");
    const listId = searchParams.get("listId");

    if (mode === "add") {
      // remove mode=add, remain on sub-lists page
      setSearchParams({});
    } else if (!listId) {
      // no list selected, go back to tasks page
      navigate("/");
    } else {
      // if a list is selected, remove it => go to sub-lists main
      setSearchParams({});
    }
  }

  return (
    <div className="app-container">
      {/* Top-left arrow for back */}
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
      >
        ←
      </button>

      <h1 style={{ marginTop: "0" }}>Task: {taskName}</h1>

      {/* Horizontal row of sub-lists. "Add New List" is a button at left. */}
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

      {/* If mode=add, show "Add Sub-List" form */}
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

      {/* If a sub-list is selected, show items */}
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
 * SubListItems: tasks-like UI for sub-list items
 * - reorder completed items to bottom
 * - show created date in expanded
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

  function getPriorityLabel(item) {
    if (item.priority === "high") return "High Priority";
    if (item.priority === "priority") return "Priority";
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

      <ul className="tasks-list">
        {items.map((item) => {
          const isExpanded = expandedItems[item._id] || false;
          const isEditing = editingItems[item._id] || false;
          const priorityClass =
            item.priority === "high"
              ? "priority-high"
              : item.priority === "priority"
              ? "priority-normal"
              : "";
          const priorityLabel = getPriorityLabel(item);

          return (
            <li
              key={item._id}
              className={`tasks-list-item ${priorityClass}`}
              tabIndex={-1}
            >
              {/* Mark complete checkbox */}
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
                      <button onClick={() => onStartEdit(item._id)}>Edit</button>
                      <button
                        className="delete-btn"
                        onClick={() => onDeleteItem(item._id)}
                      >
                        Delete
                      </button>

                      {/* Created date on the right */}
                      <div className="task-created-date">
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
                    <ItemEditForm
                      item={item}
                      onSave={(updated) => onSaveEdit(item._id, updated)}
                      onCancel={() => onStopEdit(item._id)}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** ItemEditForm: inline edit for text, priority, dueTime, plus created date is read-only */
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