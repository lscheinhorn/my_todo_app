import React, { useState, useEffect } from "react";
import axios from "axios";

const SPACES_API_URL = "https://my-todo-app-mujx.onrender.com/spaces";

function Spaces() {
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
          <li key={space._id}>
            {space.name}
            {/* Add UI to edit name or delete this space */}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Spaces;