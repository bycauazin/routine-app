import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SiteIntro } from "./components/layout/SiteIntro";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SiteIntro />
    <App />
  </StrictMode>,
);
