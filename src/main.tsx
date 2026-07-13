import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./qc-experience.css";
import "@takeoff-ui/core/dist/core/core.css";

// Material Symbols glyphs are ligatures; until the font loads they render as
// raw text ("space_dashboard"). Hide icons until fonts are ready, with a
// timeout fallback so icons are never lost if a font fails to load.
const revealIcons = () => document.documentElement.classList.add("qcx-fonts-ready");
document.fonts.load('20px "Material Symbols Rounded"').then(revealIcons, revealIcons);
window.setTimeout(revealIcons, 2500);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
