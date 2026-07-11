import "@fontsource-variable/onest/index.css";
import "@fontsource-variable/unbounded/index.css";
import "@/shared/theme/tokens.css";
import "@/shared/theme/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
