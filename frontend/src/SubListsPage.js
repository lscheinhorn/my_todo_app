// SubListsPage.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./App.css";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsPage:
 * A page to manage all sub-lists of a single task (identified by taskId).
 * We show a row of sub-lists at the top, letting the user pick which one is active,
 * plus an "Add" form for new sub-lists. Then we display items of the selected sub-list
 * in a tasks-like UI with an edit option for priority and due time.
 */
function SubListsPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [subLists, setSubLists] = useState([]);
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  const [showAddInput, setShowAddInput] = useState(false);
  const [newSubListName, setNewSubListName] = useState("");

  // For the currently selected sub-list's items
  const [subListItems, setSubListItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  useEffect(() => {
    fetchSubLists();
  }, [taskId]);

  // Whenever selectedSubListId changes, fetch that sub-list's items
  useEffect(() => {
    if (selectedSubListId) {
      fetchSubListItems(selectedSubListId);
    } else {
      setSubListItems([]);
    }
  }, [selectedSubListId]);

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => {
        setSubLists(res.data);
        if (res.data.length > 0) {
          setSelectedSubListId(res.data[0]._id); // auto-select first
        }
      })
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function addSubList(e) {
    e.preventDefault();
    if (!newSubListName.trim()) {
      setShowAddInput(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newSubListName })
      .then((res) => {
        setNewSubListName("");
        setShowAddInput(false);
        fetchSubLists();
        setSelectedSubListId(res.data._id);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function fetchSubListItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        setSubListItems(res.data.items || []);
      })
      .catch((err) => console.error("Error fetching sub-list:", err));
  }

  // Items logic
  function addItemToSubList(text, priority, dueTime) {
    if (!selectedSubListId) return;
    axios
      .post(`${SUBLISTS_API_URL}/${selectedSubListId}/items`, {
        text,
        priority,
        dueTime,
      })
      .then((res) => setSubListItems(res.data.items || []))
      .catch((err) => console.error("Error adding item:", err));
  }

  function toggleExpandItem(itemId) {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => setSubListItems(res.data.items || []))
      .catch((err) => console.error("Error toggling item:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => setSubListItems(res.data.items || []))
      .catch((err) => console.error("Error deleting item:", err));
  }

  // Editing item
  function startEditingItem(itemId) {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: true,
    }));
  }

  function stopEditingItem(itemId) {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: false,
    }));
  }

  function saveItemEdits(itemId, updatedFields) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`, updatedFields)
      .then((res) => {
        setSubListItems(res.data.items || []);
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  return (
    <div className="sub-list-container">
      <h2>Sub-Lists for Task</h2>
      <button onClick={() => navigate(-1)}>Back</button>

      {/* Horizontal row of sub-lists, just like spaces */}
      <div className="sub-lists-inline">
        {subLists.map((sub) => (
          <div
            key={sub._id}
            className={`sub-list-item ${
              sub._id === selectedSubListId ? "selected" : ""
            }`}
            onClick={() => setSelectedSubListId(sub._id)}
          >
            {sub.name}
          </div>
        ))}

        {showAddInput ? (
          <form onSubmit={addSubList} style={{ display: "inline-flex", gap: "8px" }}>
            <input
              className="add-sublist-input"
              value={newSubListName}
              onChange={(e) => setNewSubListName(e.target.value)}
              placeholder="List name..."
            />
            <button type="submit">OK</button>
          </form>
        ) : (
          <button onClick={() => setShowAddInput(true)}>Add</button>
        )}
      </div>

      {/* If a sub-list is selected, show its items */}
      {selectedSubListId && (
        <SubListItemsUI
          items={subListItems}
          expandedItems={expandedItems}
          editingItems={editingItems}
          onExpand={toggleExpandItem}
          onStartEdit={startEditingItem}
          onStopEdit={stopEditingItem}
          onSaveEdit={saveItemEdits}
          onToggleComplete={toggleCompleteItem}
          onDelete={deleteItem}
          onAddItem={addItemToSubList}
        />
      )}
    </div>
  );
}

/**
 * SubListItemsUI:
 * Renders items in a tasks-like UI with "Show More" -> "Mark Complete," "Delete," "Edit," etc.
 * Also has a form to add a new item with optional priority and dueTime.
 */
function SubListItemsUI({
  items,
  expandedItems,
  editingItems,
  onExpand,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
  onToggleComplete,
  onDelete,
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

  return (
    <div style={{ width: "100%", maxWidth: "600px" }}>
      <form className="new-item-form" onSubmit={handleAddItem}>
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

      <ul className="items-list">
        {items.map((item) => {
          const isExpanded = expandedItems[item._id] || false;
          const isEditing = editingItems[item._id] || false;
          // For screen readers: text + priority
          const readText = `${item.text}${
            item.priority !== "none" ? `, Priority: ${item.priority}` : ""
          }`;

          return (
            <li
              key={item._id}
              className="items-list-item"
              style={{
                textDecoration: item.completed ? "line-through" : "none",
              }}
              tabIndex={-1}
            >
              {/* Collapsed row */}
              <div className="collapsed-row">
                <div className="text-with-priority" aria-label={readText}>
                  {readText}
                </div>
                <button
                  className="show-more-btn"
                  onClick={() => onExpand(item._id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "Hide" : "Show More"}
                </button>
              </div>

              {isExpanded && (
                <div className="expanded-row">
                  {/* If not editing, show MarkComplete, Delete, Edit */}
                  {!isEditing ? (
                    <div className="actions-row">
                      <button onClick={() => onToggleComplete(item)}>
                        {item.completed ? "Mark Incomplete" : "Mark Complete"}
                      </button>
                      <button className="delete-btn" onClick={() => onDelete(item._id)}>
                        Delete
                      </button>
                      <button onClick={() => onStartEdit(item._id)}>Edit</button>
                      {item.dueTime && <p>Due Time: {item.dueTime}</p>}
                      {item.priority !== "none" && <p>Priority: {item.priority}</p>}
                    </div>
                  ) : (
                    <ItemEditForm
                      item={item}
                      onSave={(updatedFields) => onSaveEdit(item._id, updatedFields)}
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

/**
 * ItemEditForm: inline edit for text, priority, dueTime
 */
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