// App.js

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TasksPage from "./TasksPage";
import SubListPage from "./SubListPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main tasks UI */}
        <Route path="/" element={<TasksPage />} />

        {/* Sub-list page */}
        <Route path="/sublist/:subListId" element={<SubListPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;