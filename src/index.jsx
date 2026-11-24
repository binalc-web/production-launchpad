import "./lib/sentry.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { attachVitePreloadErrorReload } from "./lib/vitePreloadErrorReload.util.js";
import "./index.css";

attachVitePreloadErrorReload();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
