import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { authenticate } from "@/shared/api/auth";
import { useI18n } from "@/shared/i18n";
import { IconDumbbell } from "@/shared/icons";
import { Button } from "@/shared/ui";
import styles from "./AuthGate.module.css";

type AuthState = "pending" | "ready" | "error";

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("pending");
  const { t } = useI18n();

  const run = useCallback(() => {
    setState("pending");
    authenticate()
      .then(() => setState("ready"))
      .catch(() => setState("error"));
  }, []);

  useEffect(run, [run]);

  if (state === "ready") {
    return children;
  }

  return (
    <div className={styles.splash}>
      <motion.span
        className={styles.logo}
        animate={state === "pending" ? { scale: [1, 1.08, 1] } : undefined}
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
      >
        <IconDumbbell size={44} />
      </motion.span>
      <span className={styles.name}>{t.common.appName}</span>
      {state === "error" && (
        <div className={styles.error}>
          <p className={styles.errorText}>{t.errors.generic}</p>
          <Button variant="secondary" size="sm" onClick={run}>
            {t.common.retry}
          </Button>
        </div>
      )}
    </div>
  );
}
