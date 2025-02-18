// SubListView.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function SubListView({ subListId, onBack }) {
  const [subList, setSubList] = useState(null);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    fetchSubList();
  }, [subListId]);

  const fetchSubList = () => {
    axios
      .get(`${SUBLISTS_API_URL}/${subListId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error fetching sub-list:", err));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    axios
      .post(`${SUBLISTS_API_URL}/${subListId}/items`, { text: newItemText })
      .then((res) => {
        setNewItemText("");
        setSubList(res.data);
      })
      .catch((err) => console.error("Error adding item:", err));
  };

  const toggleItem = (itemId) => {
    if (!subList) return;
    const item = subList.items.find((i) => i._id === itemId);
    if (!item) return;
    axios
      .put(`${SUBLISTS_API_URL}/${subListId}/items/${itemId}`, {
        completed: !item.completed,
      })
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error toggling item:", err));
  };

  const deleteItem = (itemId) => {
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}/items/${itemId}`)
      .then((res) => setSubList(res.data))
      .catch((err) => console.error("Error deleting item:", err));
  };

  if (!subList) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Loading Sub-List...</h2>
        <button onClick={onBack}>Go Back to Tasks</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>{subList.name}</h2>
      <button onClick={onBack}>Go Back to Tasks</button>

      <form onSubmit={addItem} style={{ marginTop: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="New sub-list item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {subList.items.map((item) => (
          <li
            key={item._id}
            style={{
              marginBottom: "8px",
              textDecoration: item.completed ? "line-through" : "none",
            }}
          >
            <span
              style={{ cursor: "pointer", marginRight: "10px" }}
              onClick={() => toggleItem(item._id)}
            >
              {item.text}
            </span>
            <button onClick={() => deleteItem(item._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SubListView;