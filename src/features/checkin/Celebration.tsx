import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { meKey, useMe } from "@/entities/user";
import type { Checkin, Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCheckBold, IconFire } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { Button, GlassCard, ProgressCounter, ProgressRing, SegmentedProgress } from "@/shared/ui";
import styles from "./Celebration.module.css";
import { Confetti } from "./Confetti";

const FRESH_ACHIEVEMENT_MS = 2 * 60_000;

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export type CelebrationProps = {
  checkin: Checkin;
  room: Room;
  /* my workouts this period, including this checkin if it was approved */
  myProgress: number;
  onClose: () => void;
};

export function Celebration({ checkin, room, myProgress, onClose }: CelebrationProps) {
  const { t } = useI18n();
  const me = useMe();
  const queryClient = useQueryClient();
  const approved = checkin.status === "approved";
  const progress = approved ? myProgress + 1 : myProgress;

  useEffect(() => {
    hapticNotify("success");
    /* a fresh /me may reveal an achievement granted by this checkin */
    void queryClient.invalidateQueries({ queryKey: meKey });
  }, [queryClient]);

  const freshAchievement = useMemo(() => {
    const list = me.data?.achievements ?? [];
    return list.find((a) => Date.now() - new Date(a.granted_at).getTime() < FRESH_ACHIEVEMENT_MS);
  }, [me.data]);

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Confetti />
      <motion.div
        className={styles.content}
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
      >
        <motion.div className={styles.ringWrap} variants={itemVariants}>
          <ProgressRing
            progress={Math.min(progress / room.goal_per_period, 1)}
            size={150}
            animated
          />
          <motion.span
            className={styles.checkCircle}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.35 }}
          >
            <IconCheckBold size={44} />
          </motion.span>
        </motion.div>

        <motion.h1 className={styles.title} variants={itemVariants}>
          {approved ? t.celebration.title : t.celebration.sentTitle}
        </motion.h1>
        <motion.p className={styles.subtitle} variants={itemVariants}>
          {checkin.geo ? t.celebration.geoSubtitle : t.celebration.subtitle}
        </motion.p>

        <motion.div variants={itemVariants} className={styles.cardWrap}>
          <GlassCard className={styles.progressCard}>
            <span className={styles.progressName}>{room.name}</span>
            <div className={styles.progressRow}>
              <SegmentedProgress value={progress} goal={room.goal_per_period} glowLast={approved} />
              <ProgressCounter value={progress} goal={room.goal_per_period} />
            </div>
          </GlassCard>
        </motion.div>

        {freshAchievement && (
          <motion.div
            className={styles.achievement}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
          >
            <span className={styles.achievementIcon}>
              <IconFire size={20} />
            </span>
            <span className={styles.achievementText}>
              <span className={styles.achievementLabel}>{t.celebration.newAchievement}</span>
              <span className={styles.achievementName}>{t.achievements[freshAchievement.key]}</span>
            </span>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className={styles.cardWrap}>
          <Button block onClick={onClose}>
            {t.celebration.ok}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
