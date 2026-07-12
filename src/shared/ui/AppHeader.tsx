import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useI18n } from "@/shared/i18n";
import { IconChevronLeft, IconDumbbell } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { spring } from "@/shared/lib/motion";
import { useBackNavigation } from "@/shared/lib/useBackNavigation";
import styles from "./AppHeader.module.css";

export type AppHeaderProps = {
  title?: string;
  /* Telegram draws close/menu itself; nested screens get a back fallback outside Telegram */
  variant?: "root" | "nested";
  /* trailing slot on root screens, e.g. a settings entry */
  action?: ReactNode;
  className?: string;
};

export function AppHeader({ title, variant = "root", action, className }: AppHeaderProps) {
  if (variant === "root") {
    return (
      <header className={cx(styles.header, styles.root, className)}>
        <Brand />
        <div className={styles.trailing}>{action}</div>
      </header>
    );
  }
  return (
    <header className={cx(styles.header, styles.nested, className)}>
      <BackAction />
      <NestedTitle title={title} />
      <span className={styles.actionPlaceholder} />
    </header>
  );
}

function Brand() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={styles.brand}
      initial={reduceMotion ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={spring.soft}
    >
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.markGlow} />
        <IconDumbbell size={19} />
      </span>
      <span className={styles.wordmark}>{t.common.appName}</span>
    </motion.div>
  );
}

function NestedTitle({ title }: { title?: string }) {
  const { t } = useI18n();
  return <span className={styles.title}>{title ?? t.common.appName}</span>;
}

function BackAction() {
  const { t } = useI18n();
  const { goBack, showFallback } = useBackNavigation();
  if (!showFallback) {
    /* Telegram renders its own BackButton; keep the layout balanced */
    return <span className={styles.actionPlaceholder} />;
  }
  return (
    <button type="button" className={styles.action} onClick={goBack}>
      <IconChevronLeft size={16} />
      {t.common.back}
    </button>
  );
}
