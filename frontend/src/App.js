// src/App.js

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TasksPage from "./TasksPage";
import SubListsPage from "./SubListsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main tasks page */}
        <Route path="/" element={<TasksPage />} />
        {/* Sub-lists page for a specific task */}
        <Route path="/sublist/:taskId" element={<SubListsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;