import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useI18n } from "@/shared/i18n";
import { IconDumbbell } from "@/shared/icons";
import { ease, spring } from "@/shared/lib/motion";
import { Button } from "@/shared/ui";
import styles from "./Splash.module.css";

type SplashProps = {
  status: "pending" | "error";
  onRetry: () => void;
};

const WORDMARK = "BuddyGym";

export function Splash({ status, onRetry }: SplashProps) {
  const reduce = useReducedMotion();
  const { t } = useI18n();

  if (reduce) {
    return (
      <div className={styles.splash}>
        <span className={styles.tile}>
          <span className={styles.tileIcon}>
            <IconDumbbell size={54} />
          </span>
        </span>
        <span className={styles.wordmark}>{WORDMARK}</span>
        {status === "error" && <ErrorBlock t={t} onRetry={onRetry} />}
      </div>
    );
  }

  return (
    <motion.div
      className={styles.splash}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.5, ease: ease.exit }}
    >
      <motion.span
        className={styles.bloom}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.85, 0.6], scale: [0.4, 1.15, 1] }}
        transition={{ duration: 1.6, ease: ease.entry, times: [0, 0.5, 1] }}
      />

      <motion.div
        className={styles.tile}
        initial={{ opacity: 0, scale: 0.5, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring.bouncy, delay: 0.1 }}
      >
        <motion.span
          className={styles.tileSheen}
          initial={{ x: "-160%" }}
          animate={{ x: "160%" }}
          transition={{
            duration: 2.2,
            ease: [0.45, 0.05, 0.55, 0.95],
            repeat: Infinity,
            repeatDelay: 1.6,
          }}
        />
        <motion.span
          className={styles.tileIcon}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.32 }}
        >
          <IconDumbbell size={54} />
        </motion.span>
      </motion.div>

      <div className={styles.wordmark} role="img" aria-label={WORDMARK}>
        {WORDMARK.split("").map((ch, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed wordmark, index is stable
            key={i}
            aria-hidden="true"
            className={styles.letter}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...spring.soft, delay: 0.55 + i * 0.045 }}
          >
            {ch}
          </motion.span>
        ))}
      </div>

      <div className={styles.track}>
        <motion.span
          className={styles.trackFill}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: status === "error" ? 0.35 : [0, 0.65, 0.85, 0.97] }}
          transition={{ duration: 2.4, ease: ease.entry, times: [0, 0.35, 0.7, 1] }}
        />
      </div>

      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
          >
            <ErrorBlock t={t} onRetry={onRetry} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ErrorBlock({ t, onRetry }: { t: ReturnType<typeof useI18n>["t"]; onRetry: () => void }) {
  return (
    <div className={styles.error}>
      <p className={styles.errorText}>{t.errors.generic}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </div>
  );
}
