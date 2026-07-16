import "@fontsource-variable/onest/index.css";
import "@fontsource-variable/sora/index.css";
import "@/shared/theme/tokens.css";
import "@/shared/theme/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { initTelegram } from "@/shared/lib/telegram";

async function bootstrap() {
  initTelegram();

  if (import.meta.env.VITE_API_MOCK === "1") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  const root = document.getElementById("root");
  if (!root) {
    throw new Error("missing #root element");
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
