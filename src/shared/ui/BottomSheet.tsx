import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconCross } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticTap } from "@/shared/lib/haptics";
import styles from "./BottomSheet.module.css";

/* Spring-like rise from the handoff: 0.65s cubic-bezier(.22,1.15,.32,1). */
const SHEET_EASE = [0.22, 1.15, 0.32, 1] as const;

export const sheetItemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const reduceMotion = useReducedMotion();

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={styles.layer}>
          <motion.div
            className={styles.dim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(styles.sheet, className)}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? { opacity: 0 } : { y: "105%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "105%" }}
            transition={reduceMotion ? { duration: 0.15 } : { duration: 0.65, ease: SHEET_EASE }}
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 800) {
                onClose();
              }
            }}
          >
            <span className={styles.aura} aria-hidden="true" />
            <span className={styles.handle} aria-hidden="true" />
            <motion.div
              className={styles.content}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
              }}
            >
              <motion.div className={styles.header} variants={sheetItemVariants}>
                <h2 className={styles.title}>{title}</h2>
                <button
                  type="button"
                  className={styles.close}
                  aria-label="close"
                  onClick={() => {
                    hapticTap();
                    onClose();
                  }}
                >
                  <IconCross size={13} />
                </button>
              </motion.div>
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
