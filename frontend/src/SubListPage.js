// SubListPage.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListPage:
 * A mini to-do app for sub-list items. 
 * We store an optional "dueTime" (HH:MM) and "priority," 
 * then sort by time if set, then priority, then createdAt.
 */
function SubListPage() {
  const { subListId } = useParams();
  const navigate = useNavigate();

  const [subList, setSubList] = useState(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState("none");
  const [showDueTime, setShowDueTime] = useState(false);
  const [newItemDueTime, setNewItemDueTime] = useState("");

  // Which items are expanded
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchSubList();
  }, [subListId]);

  function fetchSubList() {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error fetching sub-list:", err));
  }

  function handleAddItem(e) {
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
      .catch((err) => console.error("Error adding sub-list item:", err));
  }

  function toggleExpandItem(itemId) {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  function toggleCompleteItem(item) {
    axios
      .put(`${SUBLISTS_API_URL}/${subListId}/items/${item._id}`, {
        completed: !item.completed,
      })
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error toggling item:", err));
  }

  function deleteItem(itemId) {
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}/items/${itemId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error deleting item:", err));
  }

  // Sort items by dueTime if set, then priority, then createdAt
  function getSortedItems() {
    if (!subList) return [];
    const sorted = [...subList.items];

    sorted.sort((a, b) => {
      // completed last?
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      const priorityRank = { high: 2, priority: 1, none: 0 };
      const aPrio = priorityRank[a.priority] || 0;
      const bPrio = priorityRank[b.priority] || 0;

      // parse a.dueTime, b.dueTime as HH:MM
      function parseTime(t) {
        if (!t) return null;
        const [hh, mm] = t.split(":");
        if (!hh || !mm) return null;
        return parseInt(hh, 10) * 60 + parseInt(mm, 10);
      }
      const aTime = parseTime(a.dueTime);
      const bTime = parseTime(b.dueTime);

      if (aTime && !bTime) return -1; // a first
      if (!aTime && bTime) return 1;  // b first
      if (aTime && bTime && aTime !== bTime) {
        return aTime - bTime; // earlier time first
      }
      // if times are same or both missing, compare priority desc
      if (aPrio !== bPrio) {
        return bPrio - aPrio;
      }
      // finally compare creation date
      const aCreated = new Date(a.createdAt);
      const bCreated = new Date(b.createdAt);
      return aCreated - bCreated;
    });

    return sorted;
  }

  const sortedItems = getSortedItems();

  if (!subList) {
    return (
      <div className="sub-list-container">
        <h2>Loading Sub-List...</h2>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  return (
    <div className="sub-list-container">
      <h2>{subList.name}</h2>
      <button onClick={() => navigate(-1)}>Back</button>

      {/* Add new item form */}
      <form onSubmit={handleAddItem} style={{ marginTop: "10px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="New list item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #333" }}
          />
          <select
            value={newItemPriority}
            onChange={(e) => setNewItemPriority(e.target.value)}
            style={{ backgroundColor: "#2C2C2E", color: "#fff", borderRadius: "4px" }}
          >
            <option value="none">No Priority</option>
            <option value="priority">Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        {/* Toggle due time input */}
        {!showDueTime ? (
          <button type="button" onClick={() => {
            setShowDueTime(true);
            setNewItemDueTime("12:00");
          }}>
            Set deadline time
          </button>
        ) : (
          <>
            <input
              type="time"
              value={newItemDueTime}
              onChange={(e) => setNewItemDueTime(e.target.value)}
            />
            <button type="button" onClick={() => {
              setShowDueTime(false);
              setNewItemDueTime("");
            }}>
              Remove time
            </button>
          </>
        )}

        <button type="submit">Add</button>
      </form>

      {/* Render items, tasks-like UI */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {sortedItems.map((item) => {
          const isExpanded = expandedItems[item._id] || false;
          return (
            <li
              key={item._id}
              className="tasks-list-item"
              style={{
                textDecoration: item.completed ? "line-through" : "none",
                marginBottom: "8px",
              }}
              tabIndex={-1}
            >
              {/* Collapsed */}
              <div className="task-collapsed">
                <button
                  type="button"
                  className="task-title-button"
                  onClick={() => toggleExpandItem(item._id)}
                  aria-expanded={isExpanded}
                >
                  {item.text}
                </button>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="task-expanded">
                  <div className="task-actions">
                    <button onClick={() => toggleCompleteItem(item)}>
                      {item.completed ? "Mark Incomplete" : "Mark Complete"}
                    </button>
                    <button className="delete-btn" onClick={() => deleteItem(item._id)}>
                      Delete
                    </button>
                  </div>
                  {item.dueTime && <p>Deadline: {item.dueTime}</p>}
                  {item.priority !== "none" && <p>Priority: {item.priority}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SubListPage;