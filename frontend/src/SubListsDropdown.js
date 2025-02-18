// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * Minimal sub-lists dropdown plus an "Edit Lists" toggle 
 * to show X for deleting sub-lists
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
  const [editingLists, setEditingLists] = useState(false);
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

  function handleChange(e) {
    const value = e.target.value;
    if (value === "ADD_NEW") {
      navigate(`/sublist/${taskId}?mode=add`);
    } else {
      navigate(`/sublist/${taskId}?listId=${value}`);
    }
  }

  function handleDeleteSubList(e, subListId) {
    e.stopPropagation();
    axios
      .delete(`${SUBLISTS_API_URL}/${subListId}`)
      .then(() => fetchSubLists())
      .catch((err) => console.error("Error deleting sub-list:", err));
  }

  return (
    <div
      className={`sub-lists-row ${editingLists ? "editing-lists" : ""}`}
      style={{ flexWrap: "wrap" }}
    >
      <span>Lists:</span>
      <select defaultValue="" onChange={handleChange}>
        <option value="" disabled>
          -- Select a list --
        </option>
        <option value="ADD_NEW">Add New List</option>
        {subLists.map((sub) => (
          <option key={sub._id} value={sub._id}>
            {sub.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setEditingLists(!editingLists)}
        style={{ marginLeft: "10px" }}
      >
        {editingLists ? "Stop Editing" : "Edit Lists"}
      </button>

      {/* If editing is on, show sub-lists with X to delete */}
      {editingLists &&
        subLists.map((sub) => (
          <div
            key={sub._id}
            className={`sub-list-item`}
            style={{ position: "relative" }}
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
    </div>
  );
}

export default SubListsDropdown;