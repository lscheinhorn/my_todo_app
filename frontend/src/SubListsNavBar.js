// src/SubListsNavBar.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./NavBar.css";

const SUBLISTS_API_URL = process.env.REACT_APP_API_URL + "/sublists";

/**
 * For nested sub-lists:
 * - If we have a parentTaskId, we fetch sub-lists with ?taskId=xxx
 * - If we have a parentSubListId, we fetch sub-lists with ?parentSubListId=xxx
 */
function SubListsNavBar({
  parentTaskId,
  parentSubListId,
  selectedSubListId,
  onSubListSelect,
}) {
  const [subLists, setSubLists] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchSubLists();
  }, [parentTaskId, parentSubListId]);

  function fetchSubLists() {
    let url = `${SUBLISTS_API_URL}?`;
    if (parentTaskId) {
      url += `taskId=${parentTaskId}`;
    } else if (parentSubListId) {
      url += `parentSubListId=${parentSubListId}`;
    }

    axios
      .get(url)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function toggleDeleteMode() {
    setDeleteMode(!deleteMode);
  }

  function handleDeleteSubList(e, subListId) {
    e.stopPropagation();
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}`)
      .then(() => fetchSubLists())
      .catch((err) => console.error("Error deleting sub-list:", err));
  }

  function handleSelectSubList(id) {
    onSubListSelect(id);
    setShowMenu(false);
  }

  function handleAddSubList(e) {
    e.preventDefault();
    if (!newName.trim()) {
      setShowAdd(false);
      return;
    }
    const payload = {};
    if (parentTaskId) payload.taskId = parentTaskId;
    if (parentSubListId) payload.parentSubListId = parentSubListId;
    payload.name = newName;

    axios
      .post(SUBLISTS_API_URL, payload)
      .then((res) => {
        setNewName("");
        setShowAdd(false);
        fetchSubLists();
        onSubListSelect(res.data._id);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  return (
    <nav className="nav-bar">
      <button
        className="hamburger-btn"
        aria-label="Toggle sub-lists menu"
        onClick={() => setShowMenu(!showMenu)}
      >
        ☰
      </button>

      <div className={`nav-menu ${showMenu ? "show" : ""}`}>
        {subLists.map((sl) => (
          <div
            key={sl._id}
            className={`nav-item ${sl._id === selectedSubListId ? "selected" : ""}`}
            onClick={() => handleSelectSubList(sl._id)}
          >
            {sl.name}
            {deleteMode && (
              <button
                className="nav-delete-x"
                onClick={(e) => handleDeleteSubList(e, sl._id)}
              >
                X
              </button>
            )}
          </div>
        ))}

        {showAdd ? (
          <form onSubmit={handleAddSubList} style={{ display: "inline-flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="New sub-list name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit">OK</button>
            <button type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="add-btn"
            aria-label="Add sub-list"
            onClick={() => setShowAdd(true)}
          >
            ➕
          </button>
        )}

        <button
          className="toggle-delete-btn"
          aria-label={deleteMode ? "Stop deleting sub-lists" : "Delete sub-lists"}
          onClick={toggleDeleteMode}
        >
          {deleteMode ? "🗑️(Stop)" : "🗑️"}
        </button>
      </div>
    </nav>
  );
}

export default SubListsNavBar;