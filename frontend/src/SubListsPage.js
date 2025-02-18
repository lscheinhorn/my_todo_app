// SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsPage:
 * A separate page for managing sub-lists of a given task.
 * The heading is the task's name. Then a row of sub-lists with "Add new sub-list" at top,
 * plus a form if mode=add. If a listId is chosen, we show that sub-list's items below.
 */
function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [taskName, setTaskName] = useState("Loading...");
  const [subLists, setSubLists] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Which sub-list is selected
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // Items for the selected sub-list
  const [items, setItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  useEffect(() => {
    fetchTaskName();
    fetchSubLists();
  }, [taskId]);

  // On mount or param change, see if we have mode=add or listId=xxx
  useEffect(() => {
    const mode = searchParams.get("mode");
    const listId = searchParams.get("listId");
    if (mode === "add") {
      setShowAddList(true);
      setSelectedSubListId(null);
    } else if (listId) {
      setSelectedSubListId(listId);
      setShowAddList(false);
    }
  }, [searchParams]);

  // If selectedSubListId changes, fetch items
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
      .catch((err) => console.error("Error fetching task:", err));
  }

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
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
        // auto-select the new list
        setSearchParams({ listId: res.data._id });
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

  // Switch sub-list
  function selectSubList(listId) {
    setSearchParams({ listId });
  }

  // Switch to "add new sub-list" mode
  function selectAddNewList() {
    setSearchParams({ mode: "add" });
  }

  // Items logic
  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => setItems(res.data.items || []))
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
        setItems(res.data.items || []);
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => setItems(res.data.items || []))
      .catch((err) => console.error("Error deleting item:", err));
  }

  function addNewItem(text, priority, dueTime) {
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
    <div className="app-container">
      <h1>Task: {taskName}</h1>
      <button onClick={() => navigate(-1)}>Back</button>

      {/* Horizontal row of sub-lists. "Add New List" is at the top. */}
      <div className="sub-lists-row">
        <span>Sub-lists:</span>
        <div
          className="space-item"
          style={{ display: "inline-block" }}
          onClick={selectAddNewList}
        >
          Add New List
        </div>

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
 * SubListItems: the same tasks-like UI for sub-list items
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

          // Priority highlighting
          let priorityClass = "";
          if (item.priority === "high") priorityClass = "priority-high";
          if (item.priority === "priority") priorityClass = "priority-normal";

          return (
            <li
              key={item._id}
              className={`tasks-list-item ${priorityClass}`}
              tabIndex={-1}
            >
              {/* Mark as complete checkbox */}
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
                    {item.priority !== "none" && ` (Priority: ${item.priority})`}
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
                      <button className="delete-btn" onClick={() => onDeleteItem(item._id)}>
                        Delete
                      </button>
                      <button onClick={() => onStartEdit(item._id)}>Edit</button>
                      {item.dueTime && <p>Due Time: {item.dueTime}</p>}
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

/** ItemEditForm: inline edit for text, priority, dueTime */
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