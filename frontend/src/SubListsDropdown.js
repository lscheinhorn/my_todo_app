// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * Minimal sub-lists dropdown:
 * "Lists: [Add New List, ...existing sub-lists...]"
 * Selecting any navigates to /sublist/:taskId?mode=add or ?listId=xxx
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
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
      // value is the subListId
      navigate(`/sublist/${taskId}?listId=${value}`);
    }
  }

  return (
    <div className="sub-lists-row">
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
    </div>
  );
}

export default SubListsDropdown;