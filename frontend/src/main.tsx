import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// Initialise theme before mount to avoid a flash.
const stored = localStorage.getItem("theme");
const prefersLight = stored === "light";
document.documentElement.classList.toggle("dark", !prefersLight);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
