// Spaces.js

import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function Spaces({ onSpaceSelect, selectedSpaceId }) {
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    fetchSpaces();
  }, []);

  function fetchSpaces() {
    axios
      .get(SPACES_API_URL)
      .then((res) => setSpaces(res.data))
      .catch((err) => console.error("Error fetching spaces:", err));
  }

  function handleChange(e) {
    onSpaceSelect(e.target.value); // e.g. "ALL", "DELETED", or a space._id
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <label>Spaces: </label>
      <select value={selectedSpaceId} onChange={handleChange}>
        <option value="ALL">All tasks</option>
        {spaces.map((space) => (
          <option key={space._id} value={space._id}>
            {space.name}
          </option>
        ))}
        <option value="DELETED">Deleted tasks</option>
      </select>
    </div>
  );
}

export default Spaces;