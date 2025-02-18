// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsDropdown:
 * - "List: [dropdown of sub-lists] [Add]"
 * - When user picks a sub-list, navigate to /sublist/:subListId
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubLists();
  }, [taskId]);

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function handleAddSubList() {
    if (!newListName.trim()) {
      setShowAddInput(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newListName })
      .then((res) => {
        setNewListName("");
        setShowAddInput(false);
        // Refresh
        fetchSubLists();
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function handleSelectSubList(subListId) {
    // Navigate to /sublist/:subListId
    navigate(`/sublist/${subListId}`);
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <span style={{ marginRight: "8px" }}>List:</span>
      {subLists.length > 0 ? (
        <select
          onChange={(e) => handleSelectSubList(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            -- Select a list --
          </option>
          {subLists.map((sub) => (
            <option key={sub._id} value={sub._id}>
              {sub.name}
            </option>
          ))}
        </select>
      ) : (
        <em>No lists yet</em>
      )}

      {showAddInput ? (
        <>
          <input
            className="add-space-input"
            placeholder="List name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button onClick={handleAddSubList}>OK</button>
        </>
      ) : (
        <button onClick={() => setShowAddInput(true)} style={{ marginLeft: "10px" }}>
          Add
        </button>
      )}
    </div>
  );
}

export default SubListsDropdown;