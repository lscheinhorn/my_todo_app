// Spaces.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

/**
 * Inline row of spaces:
 * [All tasks] [Space1] [Space2] ... [Deleted tasks] [Add]
 */
function Spaces({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  function fetchSpaces() {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  }

  function handleAddSpace() {
    if (!newSpaceName.trim()) {
      setShowAddInput(false);
      return;
    }
    axios
      .post(SPACES_API_URL, { name: newSpaceName })
      .then(() => {
        setNewSpaceName("");
        setShowAddInput(false);
        fetchSpaces();
      })
      .catch((err) => console.error("Error creating space:", err));
  }

  function handleDeleteSpace(spaceId, e) {
    e.stopPropagation(); // Prevent selecting the space
    axios
      .delete(`${SPACES_API_URL}/${spaceId}`)
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error deleting space:", err));
  }

  return (
    <div className="spaces-inline">
      {/* All tasks */}
      <div
        className={`space-item ${selectedSpaceId === "ALL" ? "selected" : ""}`}
        onClick={() => onSpaceSelect("ALL")}
      >
        All tasks
      </div>

      {/* Actual spaces */}
      {spaces.map((space) => (
        <div
          key={space._id}
          className={`space-item ${space._id === selectedSpaceId ? "selected" : ""}`}
          onClick={() => onSpaceSelect(space._id)}
        >
          {space.name}
          <button
            className="delete-space-btn"
            onClick={(e) => handleDeleteSpace(space._id, e)}
          >
            X
          </button>
        </div>
      ))}

      {/* Deleted tasks */}
      <div
        className={`space-item ${selectedSpaceId === "DELETED" ? "selected" : ""}`}
        onClick={() => onSpaceSelect("DELETED")}
      >
        Deleted tasks
      </div>

      {/* Add button or inline input */}
      {showAddInput ? (
        <>
          <input
            className="add-space-input"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            placeholder="Space name..."
          />
          <button onClick={handleAddSpace}>OK</button>
        </>
      ) : (
        <button onClick={() => setShowAddInput(true)}>Add</button>
      )}
    </div>
  );
}

export default Spaces;