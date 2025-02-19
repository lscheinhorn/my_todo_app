// src/SubListItems.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function SubListItems({ subListId }) {
  const [subList, setSubList] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});
  const [bulkDelete, setBulkDelete] = useState(false);

  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState("none");
  const [showDueTime, setShowDueTime] = useState(false);
  const [newItemDueTime, setNewItemDueTime] = useState("");

  useEffect(() => {
    fetchSubList();
  }, [subListId]);

  function fetchSubList() {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error fetching sub-list:", err));
  }

  function reorderCompleted(items) {
    return items.slice().sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  function addItem(e) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    axios
      .post(`${SUBLISTS_API_URL}/${subListId}/items`, {
        text: newItemText,
        priority: newItemPriority,
        dueTime: showDueTime ? newItemDueTime : "",
      })
      .then((res) => {
        setSubList(res.data);
        setNewItemText("");
        setNewItemPriority("none");
        setShowDueTime(false);
        setNewItemDueTime("");
      })
      .catch((err) => console.error("Error adding item:", err));
  }

  function toggleComplete(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${subListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error toggling complete:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}/items/${itemId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error deleting item:", err));
  }

  function removeCompletedItems() {
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}/items/completed`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error removing completed items:", err));
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

  function saveItemEdit(item, updated) {
    axios
      .put(`${SUBLISTS_API_URL}/${subListId}/items/${item._id}`, updated)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error saving item edit:", err));
  }

  if (!subList) {
    return <div style={{ marginTop: "20px" }}>Loading sub-list...</div>;
  }

  // reorder completed items
  const items = reorderCompleted(subList.items);

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>{subList.name}</h2>

      {/* "Remove completed items" button */}
      <button onClick={removeCompletedItems}>Remove Completed Items</button>

      {/* Bulk delete toggle */}
      <button onClick={() => setBulkDelete(!bulkDelete)}>
        {bulkDelete ? "Stop Bulk Delete" : "Bulk Delete"}
      </button>

      {/* Add item form */}
      <form onSubmit={addItem} style={{ marginTop: "10px", marginBottom: "20px" }}>
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
          <option value="high">High</option>
        </select>
        {!showDueTime ? (
          <button type="button" onClick={() => { setShowDueTime(true); setNewItemDueTime("12:00"); }}>
            Set due time
          </button>
        ) : (
          <>
            <input
              type="time"
              value={newItemDueTime}
              onChange={(e) => setNewItemDueTime(e.target.value)}
            />
            <button type="button" onClick={() => { setShowDueTime(false); setNewItemDueTime(""); }}>
              Remove time
            </button>
          </>
        )}
        <button type="submit">Add</button>
      </form>

      {items.map((item) => {
        const isExpanded = expandedItems[item._id] && !bulkDelete;
        const isEditing = editingItems[item._id] || false;

        let priorityClass = "";
        if (item.priority === "high") priorityClass = "priority-high";
        else if (item.priority === "priority") priorityClass = "priority-normal";

        return (
          <div key={item._id} className={`tasks-list-item ${priorityClass}`} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                className="mark-complete-checkbox"
                checked={item.completed}
                onChange={() => toggleComplete(item)}
              />
              {!bulkDelete && (
                <div
                  className="task-main-content"
                  onClick={() => { if (!isEditing) toggleExpandItem(item._id); }}
                >
                  <div className="collapsed-row">
                    <div>{item.text}{item.priority !== "none" && ` (${item.priority})`}</div>
                    <button className="show-more-btn">{isExpanded ? "▲" : "▼"}</button>
                  </div>
                </div>
              )}
              {bulkDelete && (
                <button
                  className="delete-btn"
                  style={{ marginLeft: "auto" }}
                  onClick={() => deleteItem(item._id)}
                >
                  🗑
                </button>
              )}
            </div>
            {isExpanded && (
              <div className="expanded-row">
                {!isEditing ? (
                  <div className="actions-row" style={{ display: "flex", flexWrap: "wrap" }}>
                    <button onClick={() => startEditingItem(item._id)}>Edit</button>
                    <div style={{ marginLeft: "auto" }}>
                      Created: {new Date(item.createdAt).toLocaleString()}
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => deleteItem(item._id)}
                      style={{ marginLeft: "auto" }}
                    >
                      🗑
                    </button>
                  </div>
                ) : (
                  <ItemEditForm
                    item={item}
                    onSave={(updated) => {
                      saveItemEdit(item, updated);
                      stopEditingItem(item._id);
                    }}
                    onCancel={() => stopEditingItem(item._id)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

export default SubListItems;