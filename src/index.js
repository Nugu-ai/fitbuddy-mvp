// src/index.js

import React from "react";
import { createRoot } from "react-dom/client"; // React 18 이상에서는 여기서 createRoot를 import
import "./index.css";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
