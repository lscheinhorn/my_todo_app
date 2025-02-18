// SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "./App.css";
import axios from "axios";

const TASKS_API_URL = "https://my-todo-app-frontend-catn.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [taskName, setTaskName] = useState(null);
  const [taskError, setTaskError] = useState(false);

  const [subLists, setSubLists] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingLists, setEditingLists] = useState(false);

  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // groupedItems => array of {timeLabel, items:[]}
  const [groupedItems, setGroupedItems] = useState([]);
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
      setGroupedItems([]);
    }
  }, [selectedSubListId]);

  function fetchTaskName() {
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

  function fetchItems(subListId) {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => {
        setGroupedItems(groupItemsByDueTime(res.data.items || []));
      })
      .catch((err) => console.error("Error fetching sub-list items:", err));
  }

  // Group items by dueTime
  function groupItemsByDueTime(itemsArr) {
    const groups = {};
    itemsArr.forEach((item) => {
      const timeKey = item.dueTime ? `Due by ${item.dueTime}` : "No Due Time";
      if (!groups[timeKey]) groups[timeKey] = [];
      groups[timeKey].push(item);
    });

    // sort time ascending
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

    // reorder completed to bottom
    const result = sortedKeys.map((key) => {
      const arr = groups[key].slice().sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
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

  function toggleEditingLists() {
    setEditingLists(!editingLists);
  }

  function handleDeleteSubList(e, subListId) {
    e.stopPropagation();
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}`)
      .then(() => {
        fetchSubLists();
        // if we deleted the selected sub-list, unselect it
        if (subListId === selectedSubListId) {
          setSearchParams({});
        }
      })
      .catch((err) => console.error("Error deleting sub-list:", err));
  }

  // Items logic
  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => {
        setGroupedItems(groupItemsByDueTime(res.data.items || []));
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
        setGroupedItems(groupItemsByDueTime(res.data.items || []));
        stopEditingItem(itemId);
      })
      .catch((err) => console.error("Error saving item edits:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${selectedSubListId}/items/${itemId}`)
      .then((res) => {
        setGroupedItems(groupItemsByDueTime(res.data.items || []));
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
        setGroupedItems(groupItemsByDueTime(res.data.items || []));
      })
      .catch((err) => console.error("Error adding item:", err));
  }

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
        <h1>Error loading task</h1>
      ) : taskName === null ? (
        <h1>Loading...</h1>
      ) : (
        <h1>Task: {taskName}</h1>
      )}

      <div
        className={`sub-lists-row ${editingLists ? "editing-lists" : ""}`}
        style={{ flexWrap: "wrap" }}
      >
        {subLists.map((sub) => (
          <div
            key={sub._id}
            className={`sub-list-item ${
              sub._id === selectedSubListId ? "selected" : ""
            }`}
            onClick={() => selectSubList(sub._id)}
          >
            {sub.name}
            <button
              className="delete-sublist-btn"
              onClick={(e) => handleDeleteSubList(e, sub._id)}
              aria-label="Delete Sub-list"
            >
              X
            </button>
          </div>
        ))}

        <div className="sub-list-item" onClick={selectAddNewList}>
          Add New List
        </div>

        <button type="button" onClick={toggleEditingLists} style={{ marginLeft: "10px" }}>
          {editingLists ? "Stop Editing" : "Edit Lists"}
        </button>
      </div>

      {showAddList && (
        <form onSubmit={addSubList} style={{ marginBottom: "20px" }}>
          <input
            className="add-sublist-input"
            placeholder="Sub-list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      )}

      {selectedSubListId && !showAddList && (
        <SubListItems
          groupedItems={groupedItems}
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
 * SubListItems
 * - groupedItems => array of { timeLabel: "No Due Time" or "Due by 03:30", items: [...] }
 * - We show a heading for each group, and items with a custom checkbox, expand, edit, etc.
 */
function SubListItems({
  groupedItems,
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

      {groupedItems.map((group) => (
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
                  {/* Inline checkbox with the title */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="mark-complete-checkbox"
                      checked={item.completed}
                      onChange={() => onToggleComplete(item)}
                      aria-label={`Mark ${item.text} as complete`}
                    />
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
                  </div>

                  {isExpanded && (
                    <div className="expanded-row">
                      {!isEditing ? (
                        <div
                          className="actions-row"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <button onClick={() => onStartEdit(item._id)}>
                            Edit
                          </button>

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

                          {/* Trash can on far right */}
                          <button
                            className="delete-btn"
                            onClick={() => onDeleteItem(item._id)}
                            aria-label="Delete Item"
                            style={{ marginLeft: "auto" }}
                          >
                            🗑
                          </button>
                        </div>
                      ) : (
                        <>
                          <ItemEditForm
                            item={item}
                            onSave={(updated) => onSaveEdit(item._id, updated)}
                            onCancel={() => onStopEdit(item._id)}
                          />
                          <div
                            className="task-created-date"
                            style={{ textAlign: "right" }}
                          >
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