import { useI18n } from "@/shared/i18n";
import { IconChevronLeft } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { useBackNavigation } from "@/shared/lib/useBackNavigation";
import styles from "./AppHeader.module.css";

export type AppHeaderProps = {
  title?: string;
  /* Telegram draws close/menu itself; nested screens get a back fallback outside Telegram */
  variant?: "root" | "nested";
  className?: string;
};

export function AppHeader({ title, variant = "root", className }: AppHeaderProps) {
  const { t } = useI18n();
  return (
    <header className={cx(styles.header, className)}>
      {variant === "nested" ? <BackAction /> : <span className={styles.actionPlaceholder} />}
      <span className={styles.title}>{title ?? t.common.appName}</span>
      <span className={styles.actionPlaceholder} />
    </header>
  );
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
