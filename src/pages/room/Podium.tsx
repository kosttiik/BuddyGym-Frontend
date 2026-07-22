import { motion, useReducedMotion } from "motion/react";
import type { Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cx } from "@/shared/lib/cx";
import { ease } from "@/shared/lib/motion";
import { Avatar, StreakFlame } from "@/shared/ui";
import styles from "./Podium.module.css";

export type PodiumTone = "honor" | "shame";

/* Laid out 2-1-3, so the middle slot is the tallest step: the best on the honour board, the
   worst on the shame board. */
const SLOTS = [1, 0, 2];

/* The ceremony reads bottom up: third place first, the winner last. */
const ENTER_ORDER = [0.22, 0.11, 0] as const;

/* One decelerating easing for the whole ceremony: springs made the medals whip and the
   avatars bounce past each other. */
const glide = { duration: 0.5, ease: ease.entry } as const;

export function Podium({
  members,
  goal,
  tone,
  renderLink,
}: {
  members: Member[];
  goal: number;
  tone: PodiumTone;
  renderLink: (member: Member, children: React.ReactNode) => React.ReactNode;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const podium = members.slice(0, 3);
  const honor = tone === "honor";

  return (
    <div
      className={cx(styles.podium, podium.length < 3 && styles.podiumShort)}
      data-testid="podium"
    >
      {SLOTS.map((slot) => {
        const member = podium[slot];
        if (!member) {
          return null;
        }
        const place = slot + 1;
        const delay = reduced ? 0 : (ENTER_ORDER[slot] ?? 0);

        return (
          <div key={member.id} className={styles.step}>
            <motion.div
              className={styles.stand}
              initial={reduced ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...glide, delay: delay + 0.12 }}
            >
              {/* the winner keeps breathing once the ceremony settles */}
              <motion.div
                animate={
                  reduced || !honor || place !== 1
                    ? undefined
                    : {
                        y: [0, -3, 0],
                        transition: {
                          duration: 4,
                          repeat: Infinity,
                          delay: 1.4,
                          ease: ease.inOut,
                        },
                      }
                }
              >
                {renderLink(
                  member,
                  <span className={cx(styles.rim, styles[`${tone}Rim${place}`])}>
                    <motion.span
                      className={styles.avatarDrop}
                      initial={reduced ? false : { y: -10, opacity: 0, scale: 0.94 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ ...glide, delay: delay + 0.18 }}
                    >
                      <Avatar
                        name={member.first_name}
                        seed={member.id}
                        hasAvatar={member.has_avatar}
                        status={member}
                        size={place === 1 ? 64 : 52}
                        className={honor ? undefined : styles.shameAvatar}
                      />
                    </motion.span>

                    <motion.span
                      className={cx(styles.medal, styles[`${tone}Medal${place}`])}
                      initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.36, ease: ease.entry, delay: delay + 0.34 }}
                    >
                      {place}
                      {/* a highlight sweeps the gold, so first place is the only one that shines */}
                      {honor && place === 1 && !reduced && (
                        <motion.span
                          className={styles.shine}
                          initial={{ x: "-160%" }}
                          animate={{ x: "160%" }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            repeatDelay: 3.6,
                            delay: 1.6,
                            ease: ease.inOut,
                          }}
                        />
                      )}
                    </motion.span>
                  </span>,
                )}
              </motion.div>

              <motion.span
                className={styles.name}
                data-testid="podium-name"
                initial={reduced ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: ease.entry, delay: delay + 0.4 }}
              >
                {member.first_name}
              </motion.span>

              <motion.span
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: ease.entry, delay: delay + 0.5 }}
              >
                {honor ? (
                  <StreakFlame streak={member.streak} />
                ) : (
                  <span className={styles.taunt}>{taunt(t.board.taunts, member)}</span>
                )}
              </motion.span>
            </motion.div>

            {/* the step itself grows out of the floor, and everyone above rides up with it */}
            <motion.div
              className={cx(styles.block, styles[`block${place}`], styles[`${tone}Block`])}
              initial={reduced ? false : { scaleY: 0.4, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ ...glide, delay }}
            >
              {/* the block scales, so the label has to unscale to stay the right height */}
              <motion.span
                className={cx(styles.count, !honor && styles.shameCount)}
                initial={reduced ? false : { opacity: 0, scaleY: 2.5 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ ...glide, delay }}
              >
                {t.board.workouts(member.workouts_count, member.effective_goal || goal)}
              </motion.span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/* A taunt is picked from the member id and the period, so it holds still while you look at it
   and rotates once the period turns over. */
export function taunt(taunts: readonly string[], member: Member): string {
  const seed = member.id + Date.parse(member.period_ends_at) / 86_400_000;
  return taunts[Math.abs(Math.trunc(seed)) % taunts.length] as string;
}
