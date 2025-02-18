// SubListsDropdown.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

/**
 * SubListsDropdown:
 * "List: [count] [Go to Sub-lists page]" + [Add Sub-list form]
 * We do not pick sub-lists here; we just navigate to /sublist/:taskId
 */
function SubListsDropdown({ taskId }) {
  const [subLists, setSubLists] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
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

  function handleAdd(e) {
    e.preventDefault();
    if (!newListName.trim()) {
      setShowAdd(false);
      return;
    }
    axios
      .post(SUBLISTS_API_URL, { taskId, name: newListName })
      .then(() => {
        setNewListName("");
        setShowAdd(false);
        fetchSubLists();
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  }

  function goToSubListsPage() {
    navigate(`/sublist/${taskId}`);
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <span>Lists: {subLists.length}</span>{" "}
      <button onClick={goToSubListsPage}>Open</button>

      {showAdd ? (
        <form onSubmit={handleAdd} style={{ display: "inline-block", marginLeft: "10px" }}>
          <input
            className="add-space-input"
            placeholder="List name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{ marginLeft: "10px" }}>
          Add
        </button>
      )}
    </div>
  );
}

export default SubListsDropdown;