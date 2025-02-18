// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * Renders a "List: [dropdown of sub-lists] {Add}" row,
 * plus the sub-list items displayed in a tasks-like UI.
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
  const [selectedSubListId, setSelectedSubListId] = useState(null);
  const [showAddSubListInput, setShowAddSubListInput] = useState(false);
  const [newSubListName, setNewSubListName] = useState("");

  // For sub-list items UI
  const [subListItems, setSubListItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});

  // On mount or when taskId changes, fetch sub-lists
  useEffect(() => {
    if (!taskId) return;
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
        // If only one sub-list, select it automatically
        if (res.data.length === 1) {
          setSelectedSubListId(res.data[0]._id);
        }
      })
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function fetchSubListItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        // We store items in subListItems in a tasks-like approach
        setSubListItems(res.data.items || []);
      })
      .catch((err) => console.error("Error fetching sub-list:", err));
  }

  function handleAddSubList() {
    if (!newSubListName.trim()) {
      setShowAddSubListInput(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newSubListName })
      .then((res) => {
        setNewSubListName("");
        setShowAddSubListInput(false);
        // Refresh sub-lists
        fetchSubLists();
        // Optionally select the newly created sub-list
        setSelectedSubListId(res.data._id);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  // For sub-list items: same collapsible approach as tasks
  function toggleExpandItem(itemId) {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  function addSubListItem(text) {
    if (!selectedSubListId || !text.trim()) return;
    axios
      .post(`${SUBLISTS_API_URL}/${selectedSubListId}/items`, { text })
      .then((res) => {
        setSubListItems(res.data.items || []);
      })
      .catch((err) => console.error("Error adding item:", err));
  }

  function toggleItemComplete(item) {
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

  // Render
  return (
    <div>
      {/* "List: [dropdown or single name] [Add]" row */}
      <div className="sub-lists-row">
        <span>List:</span>

        {/* If multiple sub-lists, show a dropdown. If only one, just show its name. */}
        {subLists.length > 1 ? (
          <select
            value={selectedSubListId || ""}
            onChange={(e) => setSelectedSubListId(e.target.value)}
          >
            <option value="">-- Select a list --</option>
            {subLists.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}
              </option>
            ))}
          </select>
        ) : subLists.length === 1 ? (
          <strong>{subLists[0].name}</strong>
        ) : (
          <em>No lists yet</em>
        )}

        {/* Add sub-list button or inline input */}
        {showAddSubListInput ? (
          <>
            <input
              className="add-space-input"
              placeholder="List name..."
              value={newSubListName}
              onChange={(e) => setNewSubListName(e.target.value)}
            />
            <button onClick={handleAddSubList}>OK</button>
          </>
        ) : (
          <button onClick={() => setShowAddSubListInput(true)}>Add</button>
        )}
      </div>

      {/* If a sub-list is selected, show its items in a tasks-like UI */}
      {selectedSubListId && (
        <SubListItemsUI
          items={subListItems}
          toggleExpandItem={toggleExpandItem}
          expandedItems={expandedItems}
          onToggleComplete={toggleItemComplete}
          onDeleteItem={deleteItem}
          onAddItem={addSubListItem}
        />
      )}
    </div>
  );
}

/**
 * SubListItemsUI:
 * A tasks-like UI for sub-list items: each item is collapsible, 
 * can be marked complete, or deleted, etc.
 */
function SubListItemsUI({
  items,
  expandedItems,
  toggleExpandItem,
  onToggleComplete,
  onDeleteItem,
  onAddItem,
}) {
  const [newItemText, setNewItemText] = useState("");

  function handleAddItem(e) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddItem(newItemText);
    setNewItemText("");
  }

  return (
    <div style={{ marginTop: "10px" }}>
      {/* "Add item" form, same style as new-task-form but simpler */}
      <form onSubmit={handleAddItem} style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="New list item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          style={{ padding: "6px", marginRight: "6px" }}
        />
        <button type="submit">Add</button>
      </form>

      <ul className="sublist-items">
        {items.map((item) => {
          const isExpanded = expandedItems[item._id] || false;
          return (
            <li
              key={item._id}
              className="sublist-item"
              tabIndex={-1}
              style={{
                textDecoration: item.completed ? "line-through" : "none",
              }}
            >
              {/* Collapsed view */}
              <div className="sublist-item-collapsed">
                <button
                  type="button"
                  className="task-title-button"
                  onClick={() => toggleExpandItem(item._id)}
                  aria-expanded={isExpanded}
                  style={{ flex: 1, textAlign: "left" }}
                >
                  {item.text}
                </button>
              </div>

              {/* Expanded view */}
              {isExpanded && (
                <div className="sublist-item-expanded">
                  <div className="task-actions">
                    <button onClick={() => onToggleComplete(item)}>
                      {item.completed ? "Mark Incomplete" : "Mark Complete"}
                    </button>
                    <button className="delete-btn" onClick={() => onDeleteItem(item._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SubListsDropdown;