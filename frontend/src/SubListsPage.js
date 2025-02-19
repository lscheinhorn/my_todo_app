// src/SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import SubListItems from "./SubListItems";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode"); // "add"?
  const listId = searchParams.get("listId");

  const [taskName, setTaskName] = useState(null);
  const [taskError, setTaskError] = useState(false);

  // The selected sub-list
  const [selectedSubListId, setSelectedSubListId] = useState(listId || null);

  // For sub-lists themselves
  const [subLists, setSubLists] = useState([]);

  useEffect(() => {
    fetchTaskName();
    fetchSubLists();
  }, [taskId]);

  function fetchTaskName() {
    axios
      .get(`${TASKS_API_URL}/${taskId}`)
      .then((res) => {
        if (res.data && res.data.text) {
          setTaskName(res.data.text);
        } else {
          setTaskError(true);
        }
      })
      .catch(() => setTaskError(true));
  }

  function fetchSubLists() {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }

  function handleSelectSubList(subListId) {
    navigate(`/sublist/${taskId}?listId=${subListId}`);
  }

  function handleBack() {
    navigate("/");
  }

  return (
    <div className="app-container" style={{ position: "relative" }}>
      <button
        onClick={handleBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          fontSize: "1.2rem",
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
        }}
        aria-label="Return to Tasks"
      >
        ← Return to Tasks
      </button>

      {taskError ? (
        <h1>Error loading task</h1>
      ) : taskName === null ? (
        <h1>Loading...</h1>
      ) : (
        <h1>Task: {taskName}</h1>
      )}

      {/* Simple sub-lists row: If you want a nav bar approach, do that. Or a dropdown. */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {subLists.map((sl) => (
          <div
            key={sl._id}
            style={{
              padding: "6px 12px",
              backgroundColor: "#2C2C2E",
              borderRadius: "4px",
              cursor: "pointer",
              border: sl._id === selectedSubListId ? "1px solid #61dafb" : "1px solid transparent",
            }}
            onClick={() => handleSelectSubList(sl._id)}
          >
            {sl.name}
          </div>
        ))}
        <div
          style={{
            padding: "6px 12px",
            backgroundColor: "#2C2C2E",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/sublist/${taskId}?mode=add`)}
        >
          Add New List
        </div>
      </div>

      {/* If a sub-list is selected, show items */}
      {selectedSubListId && mode !== "add" && (
        <SubListItems subListId={selectedSubListId} />
      )}

      {/* If mode=add, show add new list form or handle in SubListItems if you prefer */}
      {mode === "add" && <p>TODO: Show Add Sub-List Form Here</p>}
    </div>
  );
}

export default SubListsPage;