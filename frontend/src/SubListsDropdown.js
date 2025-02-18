// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsDropdown:
 * "Lists: [dropdown of sub-lists], [Add sub-list form],
 * then show items for the selected sub-list below"
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Items for the selected sub-list
  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  useEffect(() => {
    fetchSubLists();
  }, [taskId]);

  useEffect(() => {
    if (selectedSubListId) {
      fetchItems(selectedSubListId);
    } else {
      setItems([]);
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

  function handleAddSubList(e) {
    e.preventDefault();
    if (!newListName.trim()) {
      setShowAdd(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newListName })
      .then((res) => {
        setNewListName("");
        setShowAdd(false);
        fetchSubLists();
        setSelectedSubListId(res.data._id);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function fetchItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        setItems(res.data.items || []);
      })
      .catch((err) => console.error("Error fetching sub-list items:", err));
  }

  // Mark item complete
  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => setItems(res.data.items || []))
      .catch((err) => console.error("Error toggling item:", err));
  }

  // Expand / collapse item
  function toggleExpandItem(itemId) {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  // Start / stop editing
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
        setItems(res.data.items || []);
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  // Delete item
  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => setItems(res.data.items || []))
      .catch((err) => console.error("Error deleting item:", err));
  }

  // Add new item
  function addItem(text, priority, dueTime) {
    if (!selectedSubListId) return;
    axios
      .post(`${SUBLISTS_API_URL}/${selectedSubListId}/items`, {
        text,
        priority,
        dueTime,
      })
      .then((res) => setItems(res.data.items || []))
      .catch((err) => console.error("Error adding item:", err));
  }

  return (
    <div className="sub-lists-row">
      <span>Lists:</span>
      {subLists.length > 0 ? (
        <select
          value={selectedSubListId || ""}
          onChange={(e) => setSelectedSubListId(e.target.value)}
        >
          {subLists.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : (
        <em>No lists yet</em>
      )}

      {showAdd ? (
        <form onSubmit={handleAddSubList} style={{ display: "inline-flex", gap: "6px" }}>
          <input
            className="add-space-input"
            placeholder="List name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)}>Add</button>
      )}

      {/* If a sub-list is selected, show its items in a tasks-like UI */}
      {selectedSubListId && (
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
          onAddItem={addItem}
        />
      )}
    </div>
  );
}

/**
 * SubListItems: Renders the items in a tasks-like UI, 
 * with a form to add new items, priority, dueTime, etc.
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

  return (
    <div style={{ marginTop: "10px", display: "block" }}>
      <form onSubmit={handleAddItem} className="new-task-form">
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

          // Priority highlight
          let priorityClass = "";
          if (item.priority === "high") priorityClass = "priority-high";
          if (item.priority === "priority") priorityClass = "priority-normal";

          return (
            <li
              key={item._id}
              className={`items-list-item ${priorityClass}`}
              tabIndex={-1}
            >
              {/* Mark as complete on the left */}
              <input
                type="checkbox"
                className="mark-complete-item-checkbox"
                checked={item.completed}
                onChange={() => onToggleComplete(item)}
                aria-label={`Mark ${item.text} as complete`}
              />

              {/* The main content is clickable to expand */}
              <div
                className="item-main-content"
                onClick={() => onToggleExpand(item._id)}
                aria-expanded={isExpanded}
              >
                {item.text}
                {item.priority !== "none" && ` (Priority: ${item.priority})`}
              </div>

              {isExpanded && (
                <div className="expanded-row" style={{ width: "100%" }}>
                  {/* If not editing, show Edit, Delete, etc. */}
                  {!isEditing ? (
                    <div className="actions-row">
                      <button onClick={() => onStartEdit(item._id)}>Edit</button>
                      <button className="delete-btn" onClick={() => onDeleteItem(item._id)}>
                        Delete
                      </button>
                      {item.dueTime && <p>Due Time: {item.dueTime}</p>}
                    </div>
                  ) : (
                    <ItemEditForm
                      item={item}
                      onSave={onSaveEdit}
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
    onSave(item._id, {
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

export default SubListsDropdown;