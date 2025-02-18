// Spaces.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function Spaces({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);
  const [newSpaceName, setNewSpaceName] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = () => {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  };

  const addSpace = () => {
    if (newSpaceName.trim()) {
      axios
        .post(SPACES_API_URL, { name: newSpaceName })
        .then(() => {
          setNewSpaceName("");
          fetchSpaces();
        })
        .catch((err) => console.error("Error creating space:", err));
    }
  };

  const deleteSpace = (id) => {
    axios
      .delete(`${SPACES_API_URL}/${id}`)
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error deleting space:", err));
  };

  return (
    <div className="spaces-container">
      <h2>Spaces</h2>
      <div className="spaces-input-row">
        <input
          value={newSpaceName}
          onChange={(e) => setNewSpaceName(e.target.value)}
          placeholder="New space name..."
        />
        <button onClick={addSpace}>Add Space</button>
      </div>

      <ul className="spaces-list">
        {/* “View All” item */}
        <li
          className={
            selectedSpaceId === "ALL" ? "spaces-list-item selected" : "spaces-list-item"
          }
          onClick={() => onSpaceSelect("ALL")}
        >
          View All
        </li>

        {spaces.map((space) => (
          <li
            key={space._id}
            className={
              space._id === selectedSpaceId
                ? "spaces-list-item selected"
                : "spaces-list-item"
            }
            onClick={() => onSpaceSelect(space._id)}
          >
            <div className="space-name">{space.name}</div>
            <button
              className="delete-space-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent selecting space
                deleteSpace(space._id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Spaces;