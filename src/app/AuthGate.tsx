import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { authenticate } from "@/shared/api/auth";
import { Splash } from "./Splash";

type AuthState = "pending" | "ready" | "error";

/* Min splash time so the intro reads even when auth resolves instantly. */
const MIN_SPLASH_MS = 1800;

export function AuthGate({ children, onReady }: { children: ReactNode; onReady?: () => void }) {
  const [state, setState] = useState<AuthState>("pending");
  const [minElapsed, setMinElapsed] = useState(false);

  const run = useCallback(() => {
    setState("pending");
    authenticate()
      .then(() => setState("ready"))
      .catch(() => setState("error"));
  }, []);

  useEffect(run, [run]);

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  const showSplash = state !== "ready" || !minElapsed;

  return (
    <>
      {state === "ready" && children}
      <AnimatePresence onExitComplete={onReady}>
        {showSplash && (
          <Splash key="splash" status={state === "error" ? "error" : "pending"} onRetry={run} />
        )}
      </AnimatePresence>
    </>
  );
}
