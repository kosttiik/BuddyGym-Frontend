import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useUser } from "@/entities/user";
import { ProfileBody } from "@/pages/profile/ProfileBody";
import profileStyles from "@/pages/profile/ProfilePage.module.css";
import { useI18n } from "@/shared/i18n";
import { stagger } from "@/shared/lib/motion";
import { AppHeader, Button, GlassCard, Page, Skeleton } from "@/shared/ui";
import styles from "./UserProfilePage.module.css";

export function UserProfilePage() {
  const { userId } = useParams({ from: "/users/$userId" });
  const id = Number(userId);
  const { t } = useI18n();
  const user = useUser(id);

  return (
    <>
      <AppHeader variant="nested" title={user.data?.user.first_name ?? t.tabs.profile} />
      <Page>
        {user.isPending && (
          <div className={profileStyles.head}>
            <Skeleton width={84} height={84} radius={42} />
            <Skeleton width={140} height={18} />
          </div>
        )}

        {user.isError && (
          <GlassCard className={styles.errorCard}>
            <p className={styles.errorText}>{t.errors.generic}</p>
            <Button variant="secondary" size="sm" onClick={() => user.refetch()}>
              {t.common.retry}
            </Button>
          </GlassCard>
        )}

        {user.isSuccess && (
          <motion.div
            style={{ display: "contents" }}
            variants={stagger(0.07)}
            initial="hidden"
            animate="visible"
          >
            <ProfileBody
              user={user.data.user}
              achievements={user.data.achievements}
              bestStreak={user.data.best_streak}
            />
          </motion.div>
        )}
      </Page>
    </>
  );
}
