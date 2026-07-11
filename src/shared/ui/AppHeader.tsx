import { useI18n } from "@/shared/i18n";
import { IconChevronDown, IconChevronLeft, IconMenuDots } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { closeMiniApp } from "@/shared/lib/telegram";
import { useBackNavigation } from "@/shared/lib/useBackNavigation";
import styles from "./AppHeader.module.css";

export type AppHeaderProps = {
  title?: string;
  /* root screens offer "Close", nested ones navigate back */
  variant?: "root" | "nested";
  className?: string;
};

export function AppHeader({ title, variant = "root", className }: AppHeaderProps) {
  const { t } = useI18n();
  return (
    <header className={cx(styles.header, className)}>
      {variant === "root" ? (
        <button type="button" className={styles.action} onClick={closeMiniApp}>
          {t.common.close}
        </button>
      ) : (
        <BackAction />
      )}
      <span className={styles.title}>{title ?? t.common.appName}</span>
      <span className={styles.menu} aria-hidden="true">
        <IconMenuDots size={15} />
        <span className={styles.menuDivider} />
        <IconChevronDown size={13} />
      </span>
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
