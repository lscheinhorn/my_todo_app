// src/SubListsPage.js

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import SubListsNavBar from "./SubListsNavBar"; // The nav bar approach
import SubListItems from "./SubListItems"; // a separate component for items, if you prefer

// NOTE: use the backend domain
const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";

function SubListsPage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode");
  const listId = searchParams.get("listId");

  const [taskName, setTaskName] = useState(null);
  const [taskError, setTaskError] = useState(false);

  // If you want sub-lists of sub-lists, you'd have parentSubListId, etc.
  // For now, we only do parentTaskId = taskId
  const [selectedSubListId, setSelectedSubListId] = useState(listId || null);

  useEffect(() => {
    fetchTaskName();
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

  function handleSubListSelect(subListId) {
    // e.g. navigate to /sublist/:taskId?listId=xxx
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

      {/* If you want sub-lists of sub-lists, pass parentTaskId=taskId, parentSubListId=null */}
      <SubListsNavBar
        parentTaskId={taskId}
        parentSubListId={null}
        selectedSubListId={selectedSubListId}
        onSubListSelect={(id) => handleSubListSelect(id)}
      />

      {/* Show sub-list items if selected */}
      {selectedSubListId && <SubListItems subListId={selectedSubListId} />}
    </div>
  );
}

export default SubListsPage;