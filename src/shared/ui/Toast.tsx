import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlert, IconCheck, IconInfo } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import styles from "./Toast.module.css";

const TOAST_TTL_MS = 4000;

export type ToastTone = "error" | "warning" | "success";

/* every toast carries a mark: a caller may pass its own, otherwise the tone picks one */
function toneIcon(tone: ToastTone | undefined) {
  if (tone === "success") {
    return <IconCheck size={20} />;
  }
  return tone === "warning" ? <IconInfo size={20} /> : <IconAlert size={20} />;
}

export type ToastInput = {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: ToastTone;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    hapticNotify(
      toast.tone === "success" ? "success" : toast.tone === "warning" ? "warning" : "error",
    );
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={styles.stack}>
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                className={styles.toast}
                data-tone={toast.tone ?? "error"}
                initial={{ opacity: 0, y: -24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              >
                <span className={styles.icon} data-tone={toast.tone ?? "error"} aria-hidden="true">
                  {toast.icon ?? toneIcon(toast.tone)}
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>{toast.title}</span>
                  {toast.description && (
                    <span className={styles.description}>{toast.description}</span>
                  )}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
