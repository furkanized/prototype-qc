import React from "react";
import ReactDOM from "react-dom/client";
import { FlightSearchPage } from "./features/cargo/FlightSearchPage";
import "./styles.css";
import "@takeoff-ui/core/dist/core/core.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FlightSearchPage />
  </React.StrictMode>,
);
