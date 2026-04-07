// src/main.jsx
// Replace your existing main.jsx with this.
// Wraps the app in React Router so /designer and /designer/:id work.

import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router/index.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
