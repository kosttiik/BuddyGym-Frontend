import { motion } from "motion/react";
import { useState } from "react";
import { useMe, useUpdateTheme } from "@/entities/user";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { type Locale, useI18n } from "@/shared/i18n";
import { IconCheck, IconLock, IconSparkles } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { riseItem, stagger } from "@/shared/lib/motion";
import { useFirstReveal } from "@/shared/lib/playOnce";
import { type UiTheme, useTheme } from "@/shared/theme/ThemeProvider";
import { AppHeader, Button, Page, SegmentedControl, Skeleton } from "@/shared/ui";
import { ProfileBody } from "./ProfileBody";
import styles from "./ProfilePage.module.css";
import { StatusSheet } from "./StatusSheet";

export function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const me = useMe();
  const updateTheme = useUpdateTheme();
  const firstReveal = useFirstReveal("profile");
  const [statusOpen, setStatusOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const applyTheme = (next: UiTheme) => {
    setTheme(next);
    updateTheme.mutate(next === "dark" ? "dark" : "default");
  };

  if (me.isPending || me.isError) {
    return (
      <>
        <AppHeader />
        <Page bottomSpace>
          <div className={styles.head}>
            <Skeleton width={84} height={84} radius={42} />
            <Skeleton width={140} height={18} />
          </div>
        </Page>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <Page bottomSpace>
        <motion.div
          style={{ display: "contents" }}
          variants={stagger(0.07)}
          initial={firstReveal ? "hidden" : false}
          animate="visible"
        >
          <ProfileBody
            user={me.data.user}
            achievements={me.data.achievements}
            stats={me.data.stats}
            bestStreak={me.data.best_streak}
            editable
            onEditStatus={() => setStatusOpen(true)}
          />

          <motion.h2 className={styles.sectionTitle} variants={riseItem}>
            {t.profile.theme}
          </motion.h2>
          <motion.div className={styles.themes} variants={riseItem}>
            <ThemeSwatch
              label={t.profile.themeLight}
              kind="light"
              selected={theme === "light"}
              onSelect={() => applyTheme("light")}
            />
            <ThemeSwatch
              label={t.profile.themeDark}
              kind="dark"
              selected={theme === "dark"}
              onSelect={() => applyTheme("dark")}
            />
            <ThemeSwatch label={t.profile.themeSoon} kind="neon" locked />
          </motion.div>

          <motion.div variants={riseItem}>
            <SegmentedControl<Locale>
              options={[
                { key: "ru", label: "Русский" },
                { key: "en", label: "English" },
              ]}
              value={locale}
              onChange={setLocale}
              className={styles.language}
            />
          </motion.div>

          <motion.div variants={riseItem}>
            <Button
              variant="secondary"
              block
              className={styles.tour}
              icon={<IconSparkles size={15} />}
              onClick={() => setTourOpen(true)}
            >
              {t.onboarding.replay}
            </Button>
          </motion.div>
        </motion.div>
      </Page>

      <StatusSheet user={me.data.user} open={statusOpen} onClose={() => setStatusOpen(false)} />
      <Onboarding open={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  );
}

function ThemeSwatch({
  label,
  kind,
  selected = false,
  locked = false,
  onSelect,
}: {
  label: string;
  kind: "light" | "dark" | "neon";
  selected?: boolean;
  locked?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(styles.swatch, locked && styles.swatchLocked)}
      onClick={onSelect}
      disabled={locked}
    >
      <span
        className={cx(
          styles.swatchPreview,
          styles[`preview-${kind}`],
          selected && styles.swatchSelected,
        )}
      >
        <span className={styles.previewStripe} />
        <span className={styles.previewButton} />
        {locked && (
          <span className={styles.swatchLock}>
            <IconLock size={14} />
          </span>
        )}
      </span>
      <span className={styles.swatchLabel}>
        {label}
        {selected && <IconCheck size={11} className={styles.swatchCheck} />}
      </span>
    </button>
  );
}
