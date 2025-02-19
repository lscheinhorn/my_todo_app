// src/SpacesNavBar.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./NavBar.css";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function SpacesNavBar({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  function fetchSpaces() {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  }

  function handleSelectSpace(spaceId) {
    onSpaceSelect(spaceId);
    setShowMenu(false);
  }

  function toggleDeleteMode() {
    setDeleteMode(!deleteMode);
  }

  function handleDeleteSpace(e, spaceId) {
    e.stopPropagation();
    axios
      .delete(`${SPACES_API_URL}/${spaceId}`)
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error deleting space:", err));
  }

  function handleAddSpace(e) {
    e.preventDefault();
    if (!newName.trim()) {
      setShowAdd(false);
      return;
    }
    axios
      .post(SPACES_API_URL, { name: newName })
      .then(() => {
        setNewName("");
        setShowAdd(false);
        fetchSpaces();
      })
      .catch((err) => console.error("Error creating space:", err));
  }

  return (
    <nav className="nav-bar">
      <button
        className="hamburger-btn"
        aria-label="Toggle spaces menu"
        onClick={() => setShowMenu(!showMenu)}
      >
        ☰
      </button>

      <div className={`nav-menu ${showMenu ? "show" : ""}`}>
        {/* "All" */}
        <div
          className={`nav-item ${selectedSpaceId === "ALL" ? "selected" : ""}`}
          onClick={() => handleSelectSpace("ALL")}
        >
          All
        </div>

        {/* spaces */}
        {spaces.map((space) => (
          <div
            key={space._id}
            className={`nav-item ${space._id === selectedSpaceId ? "selected" : ""}`}
            onClick={() => handleSelectSpace(space._id)}
          >
            {space.name}
            {deleteMode && (
              <button
                className="nav-delete-x"
                onClick={(e) => handleDeleteSpace(e, space._id)}
              >
                X
              </button>
            )}
          </div>
        ))}

        {/* "Deleted" */}
        <div
          className={`nav-item ${selectedSpaceId === "DELETED" ? "selected" : ""}`}
          onClick={() => handleSelectSpace("DELETED")}
        >
          Deleted
        </div>

        {showAdd ? (
          <form onSubmit={handleAddSpace} style={{ display: "inline-flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="New space name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit">OK</button>
            <button type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button className="add-btn" aria-label="Add space" onClick={() => setShowAdd(true)}>
            ➕
          </button>
        )}

        <button
          className="toggle-delete-btn"
          aria-label={deleteMode ? "Stop deleting spaces" : "Delete spaces"}
          onClick={toggleDeleteMode}
        >
          {deleteMode ? "🗑️(Stop)" : "🗑️"}
        </button>
      </div>
    </nav>
  );
}

export default SpacesNavBar;