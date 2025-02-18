// App.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import SubListView from "./SubListView";

const TASKS_API_URL = "https://my-todo-app-mujx.onrender.com/tasks";
const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";
const SUBLISTS_API_URL = "https://my-todo-app-mujx.onrender.com/sublists";

function App() {
  // ... same states as before for tasks, spaces, etc. ...
  const [selectedSpaceId, setSelectedSpaceId] = useState("ALL");
  const [tasks, setTasks] = useState([]);
  // sub-list states
  const [viewingSubList, setViewingSubList] = useState(false);
  const [selectedSubListId, setSelectedSubListId] = useState(null);

  // ... other states and code from your existing App.js ...
  // Only difference: rename "undeleteTask" to "restoreTask"
  const restoreTask = (taskId) => {
    axios
      .put(`${TASKS_API_URL}/${taskId}/restore`)
      .then(() => fetchTasks())
      .catch((err) => console.error("Error restoring task:", err));
  };

  // After you fetch tasks, we can fetch sub-lists on demand for each task
  // or just when the user clicks "Show Lists" or "Add List"

  // Add a new sub-list for a given task
  const addSubList = (taskId) => {
    axios
      .post(SUBLISTS_API_URL, { taskId, name: "New List" })
      .then((res) => {
        // We have created a new sub-list. Navigate to it
        setSelectedSubListId(res.data._id);
        setViewingSubList(true);
      })
      .catch((err) => console.error("Error creating sub-list:", err));
  };

  // If the task already has sub-lists, we can show them in a small dropdown or a simple button
  // For simplicity, let's just pick the first sub-list and show it
  const viewSubList = (subListId) => {
    setSelectedSubListId(subListId);
    setViewingSubList(true);
  };

  // If we are currently viewing a sub-list, show SubListView
  if (viewingSubList && selectedSubListId) {
    return (
      <SubListView
        subListId={selectedSubListId}
        onBack={() => {
          // go back to tasks
          setViewingSubList(false);
          setSelectedSubListId(null);
        }}
      />
    );
  }

  // ... The rest of your App.js code for rendering tasks, etc. ...
  // Replace references to "undeleteTask" with "restoreTask"
  // Add a button for "Add List" or "Show List" in your expanded task UI

  return (
    <div className="app-container">
      {/* ... your existing heading, spaces dropdown, new-task form, etc. ... */}

      <div className="tasks-container">
        {groupedTasks.map((group) => (
          <div key={group.dateLabel || "no-date"} className="date-group">
            {group.dateLabel && (
              <h2 className="date-group-label">{group.dateLabel}</h2>
            )}
            <ul className="tasks-list">
              {group.tasks.map((task) => {
                // ...
                const isExpanded = bulkEdit || expandedTasks[task._id] || false;
                return (
                  <li
                    key={task._id}
                    className={`tasks-list-item ${priorityClass}`}
                  >
                    {/* Collapsed view */}
                    <div className="task-collapsed">
                      <button
                        type="button"
                        className="task-title-button"
                        onClick={() => toggleExpandTask(task._id)}
                        aria-expanded={isExpanded}
                      >
                        {task.text}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="task-expanded">
                        {selectedSpaceId === "DELETED" ? (
                          <div className="task-actions">
                            <button onClick={() => restoreTask(task._id)}>
                              Restore
                            </button>
                          </div>
                        ) : (
                          <div className="task-actions">
                            <button onClick={() => markComplete(task)}>
                              {task.completed ? "Mark Incomplete" : "Mark Complete"}
                            </button>
                            {/* ... Edit, Delete, etc. ... */}

                            {/* Show or Add a Sub-List */}
                            <SubListButtons
                              taskId={task._id}
                              onAddSubList={addSubList}
                              onViewSubList={viewSubList}
                            />
                          </div>
                        )}
                        {/* Show created date, due date, etc. ... */}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// A small helper component for sub-lists
function SubListButtons({ taskId, onAddSubList, onViewSubList }) {
  const [subLists, setSubLists] = useState([]);

  // Fetch sub-lists for this task
  useEffect(() => {
    axios
      .get(`${SUBLISTS_API_URL}?taskId=${taskId}`)
      .then((res) => setSubLists(res.data))
      .catch((err) => console.error("Error fetching sub-lists:", err));
  }, [taskId]);

  if (!subLists.length) {
    return (
      <button onClick={() => onAddSubList(taskId)}>Add List</button>
    );
  }

  // If there's at least one sub-list, you can show them in a dropdown or just show the first
  // For simplicity, let's show the first sub-list with "View" button
  return (
    <>
      {subLists.map((list) => (
        <button key={list._id} onClick={() => onViewSubList(list._id)}>
          Show List: {list.name}
        </button>
      ))}
      <button onClick={() => onAddSubList(taskId)}>Add Another List</button>
    </>
  );
}

export default App;