import { useMe, useUpdateTheme } from "@/entities/user";
import type { AchievementKey, UserStatus } from "@/shared/api/types";
import { type Locale, useI18n } from "@/shared/i18n";
import {
  IconCheck,
  IconCheckBold,
  IconDumbbell,
  IconFire,
  IconLightning,
  IconLock,
  IconMedal,
  IconPlus,
  IconStar,
  IconTrophy,
} from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { type UiTheme, useTheme } from "@/shared/theme/ThemeProvider";
import {
  AppHeader,
  Avatar,
  Badge,
  GlassCard,
  Page,
  ProgressBar,
  ProgressCounter,
  SegmentedControl,
  Skeleton,
} from "@/shared/ui";
import styles from "./ProfilePage.module.css";

const ALL_ACHIEVEMENTS: AchievementKey[] = [
  "first_checkin",
  "workouts_10",
  "workouts_50",
  "workouts_100",
  "streak_7",
];

const ACHIEVEMENT_ICONS: Record<AchievementKey, typeof IconCheckBold> = {
  first_checkin: IconCheckBold,
  workouts_10: IconDumbbell,
  workouts_50: IconMedal,
  workouts_100: IconTrophy,
  streak_7: IconFire,
};

/* /me has no total workout counter, so the lower bound comes from milestones */
function inferWorkouts(earned: Set<AchievementKey>): number {
  if (earned.has("workouts_100")) return 100;
  if (earned.has("workouts_50")) return 50;
  if (earned.has("workouts_10")) return 10;
  if (earned.has("first_checkin")) return 1;
  return 0;
}

export function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const me = useMe();
  const updateTheme = useUpdateTheme();

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

  const { user, achievements } = me.data;
  const earned = new Set(achievements.map((a) => a.key));
  const statusLabel: Record<UserStatus, string> = {
    novice: t.members.statusNovice,
    regular: t.members.statusRegular,
    beast: t.members.statusBeast,
  };
  const workouts = inferWorkouts(earned);
  const nextGoal = user.status === "novice" ? 10 : user.status === "regular" ? 50 : null;
  const nextStatus = user.status === "novice" ? t.members.statusRegular : t.members.statusBeast;

  return (
    <>
      <AppHeader />
      <Page bottomSpace>
        <div className={styles.head}>
          <Avatar
            name={user.first_name}
            photoUrl={user.photo_url || undefined}
            seed={user.id}
            size={84}
          />
          <h1 className={styles.name}>{user.first_name}</h1>
          <StatusBadge status={user.status} label={statusLabel[user.status]} />
        </div>

        {nextGoal !== null && (
          <GlassCard>
            <div className={styles.statusTop}>
              <span className={styles.statusTitle}>{t.profile.toStatus(nextStatus)}</span>
              <ProgressCounter value={workouts} goal={nextGoal} />
            </div>
            <ProgressBar value={workouts} max={nextGoal} className={styles.statusBar} />
            <span className={styles.statusLeft}>{t.profile.workoutsLeft(nextGoal - workouts)}</span>
          </GlassCard>
        )}

        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t.profile.achievements}</h2>
          <span className={styles.sectionCounter}>
            {t.profile.achievementsCount(earned.size, ALL_ACHIEVEMENTS.length)}
          </span>
        </div>
        <div className={styles.grid}>
          {ALL_ACHIEVEMENTS.map((key) => {
            const Icon = ACHIEVEMENT_ICONS[key];
            const isEarned = earned.has(key);
            return (
              <div key={key} className={cx(styles.tile, isEarned ? styles.earned : styles.locked)}>
                <span className={cx(styles.tileIcon, isEarned && styles.tileIconEarned)}>
                  <Icon size={20} />
                </span>
                <span className={styles.tileLabel}>{t.achievements[key]}</span>
              </div>
            );
          })}
          <div className={cx(styles.tile, styles.locked, styles.soon)}>
            <span className={styles.soonPlus}>
              <IconPlus size={15} />
            </span>
            <span className={styles.tileLabel}>{t.profile.soonMore}</span>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>{t.profile.theme}</h2>
        <div className={styles.themes}>
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
        </div>

        <SegmentedControl<Locale>
          options={[
            { key: "ru", label: "Русский" },
            { key: "en", label: "English" },
          ]}
          value={locale}
          onChange={setLocale}
          className={styles.language}
        />
      </Page>
    </>
  );
}

function StatusBadge({ status, label }: { status: UserStatus; label: string }) {
  if (status === "beast") {
    return (
      <Badge tone="orange" icon={<IconStar size={11} />}>
        {label}
      </Badge>
    );
  }
  if (status === "regular") {
    return (
      <Badge tone="green" icon={<IconLightning size={11} />}>
        {label}
      </Badge>
    );
  }
  return <Badge tone="neutral">{label}</Badge>;
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
