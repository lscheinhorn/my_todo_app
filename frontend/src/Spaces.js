// Spaces.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function Spaces({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);
  const [newSpaceName, setNewSpaceName] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = () => {
    axios.get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  };

  const addSpace = () => {
    if (newSpaceName.trim()) {
      axios.post(SPACES_API_URL, { name: newSpaceName })
        .then(() => {
          setNewSpaceName("");
          fetchSpaces();
        })
        .catch((err) => console.error("Error creating space:", err));
    }
  };

  const updateSpace = (id, newName) => {
    axios.put(`${SPACES_API_URL}/${id}`, { name: newName })
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error updating space:", err));
  };

  const deleteSpace = (id) => {
    axios.delete(`${SPACES_API_URL}/${id}`)
      .then(() => fetchSpaces())
      .catch((err) => console.error("Error deleting space:", err));
  };

  return (
    <div>
      <h2>Spaces</h2>
      <input
        value={newSpaceName}
        onChange={(e) => setNewSpaceName(e.target.value)}
        placeholder="New space name..."
      />
      <button onClick={addSpace}>Add Space</button>

      <ul>
        {spaces.map((space) => (
          <li
            key={space._id}
            style={{
              cursor: "pointer",
              backgroundColor: space._id === selectedSpaceId ? "gray" : "transparent"
            }}
            onClick={() => onSpaceSelect(space._id)}
          >
            {space.name}
            {" "}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent clicking the li
                deleteSpace(space._id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Spaces;