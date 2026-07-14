import { motion, useReducedMotion } from "motion/react";
import type { Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cx } from "@/shared/lib/cx";
import { Avatar, StatusMark, StreakFlame } from "@/shared/ui";
import styles from "./Podium.module.css";

export type PodiumTone = "honor" | "shame";

/* Laid out 2-1-3, so the middle slot is the tallest step: the best on the honour board, the
   worst on the shame board. */
const SLOTS = [1, 0, 2];

/* The ceremony reads bottom up: third place first, the winner last. Every step waits for its
   own block to finish rising before anyone lands on it. */
const ENTER_ORDER = [0.46, 0.24, 0] as const;

const spring = {
  block: { type: "spring", stiffness: 220, damping: 24, mass: 1 },
  land: { type: "spring", stiffness: 420, damping: 18, mass: 0.8 },
  slump: { type: "spring", stiffness: 180, damping: 22, mass: 1.3 },
  medal: { type: "spring", stiffness: 500, damping: 14, mass: 0.6 },
} as const;

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
    <div className={styles.podium} data-testid="podium">
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
              initial={reduced ? false : { y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...spring.land, delay: delay + 0.1 }}
            >
              {/* the winner keeps breathing once the ceremony settles; the shamed just sag */}
              <motion.div
                animate={
                  reduced || !honor || place !== 1
                    ? undefined
                    : { y: [0, -4, 0], transition: { duration: 3.4, repeat: Infinity, delay: 1.2 } }
                }
              >
                {renderLink(
                  member,
                  <span className={cx(styles.rim, styles[`${tone}Rim${place}`])}>
                    <motion.span
                      className={styles.avatarDrop}
                      initial={reduced ? false : { y: -34, opacity: 0, rotate: honor ? -10 : 8 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      transition={{
                        ...(honor ? spring.land : spring.slump),
                        delay: delay + 0.16,
                      }}
                    >
                      <Avatar
                        name={member.first_name}
                        seed={member.id}
                        hasAvatar={member.has_avatar}
                        size={place === 1 ? 64 : 52}
                        className={honor ? undefined : styles.shameAvatar}
                      />
                    </motion.span>

                    <motion.span
                      className={cx(styles.medal, styles[`${tone}Medal${place}`])}
                      initial={reduced ? false : { scale: 0, rotate: -140 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ ...spring.medal, delay: delay + 0.34 }}
                    >
                      {place}
                      {/* a highlight sweeps the gold, so first place is the only one that shines */}
                      {honor && place === 1 && !reduced && (
                        <motion.span
                          className={styles.shine}
                          initial={{ x: "-160%" }}
                          animate={{ x: "160%" }}
                          transition={{
                            duration: 1.1,
                            repeat: Infinity,
                            repeatDelay: 2.6,
                            delay: 1.1,
                            ease: "easeInOut",
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
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: delay + 0.4 }}
              >
                {member.first_name}
                <StatusMark user={member} className={styles.status} />
              </motion.span>

              <motion.span
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.48 }}
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
              initial={reduced ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...spring.block, delay }}
            >
              <motion.span
                className={cx(styles.count, !honor && styles.shameCount)}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, delay: delay + 0.3 }}
              >
                {t.board.workouts(member.workouts_count, goal)}
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
