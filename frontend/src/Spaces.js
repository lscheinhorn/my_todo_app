// Spaces.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-frontend-catn.onrender.com/spaces";

function Spaces({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [editingSpaces, setEditingSpaces] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, []);

  function fetchSpaces() {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  }

  function handleAddSpace(e) {
    e.preventDefault();
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
    e.stopPropagation();
    axios
      .delete(`${SPACES_API_URL}/${spaceId}`)
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error deleting space:", err));
  }

  return (
    <div
      className={`spaces-inline ${editingSpaces ? "editing-spaces" : ""}`}
      style={{ flexWrap: "wrap" }}
    >
      <div
        className={`space-item ${selectedSpaceId === "ALL" ? "selected" : ""}`}
        onClick={() => onSpaceSelect("ALL")}
      >
        All tasks
      </div>

      {spaces.map((space) => (
        <div
          key={space._id}
          className={`space-item ${
            space._id === selectedSpaceId ? "selected" : ""
          }`}
          onClick={() => onSpaceSelect(space._id)}
        >
          {space.name}
          <button
            className="delete-space-btn"
            onClick={(e) => handleDeleteSpace(space._id, e)}
            aria-label="Delete Space"
          >
            X
          </button>
        </div>
      ))}

      <div
        className={`space-item ${
          selectedSpaceId === "DELETED" ? "selected" : ""
        }`}
        onClick={() => onSpaceSelect("DELETED")}
      >
        Deleted tasks
      </div>

      {showAddInput ? (
        <form onSubmit={handleAddSpace} style={{ display: "inline-flex", gap: "6px" }}>
          <input
            className="add-space-input"
            placeholder="Space name..."
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      ) : (
        <button onClick={() => setShowAddInput(true)}>Add Space</button>
      )}

      <button
        type="button"
        onClick={() => setEditingSpaces(!editingSpaces)}
        style={{ marginLeft: "10px" }}
      >
        {editingSpaces ? "Stop Editing" : "Edit Spaces"}
      </button>
    </div>
  );
}

export default Spaces;