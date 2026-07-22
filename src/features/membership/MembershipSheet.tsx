import { motion } from "motion/react";
import { useState } from "react";
import { useCancelFreeze, useCreateFreeze, useUpdateMembership } from "@/entities/room";
import type { Member, Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import { SPORT_EMOJI } from "@/shared/lib/sportEmoji";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Button, Stepper, sheetItemVariants, TextField, useToast } from "@/shared/ui";
import styles from "./MembershipSheet.module.css";

const MAX_SPORT = 32;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(from: string, days: number): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function MembershipSheet({
  room,
  member,
  open,
  onClose,
}: {
  room: Room;
  member: Member;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const update = useUpdateMembership(room.id);
  const startFreeze = useCreateFreeze(room.id);
  const cancelFreeze = useCancelFreeze(room.id);

  const [sport, setSport] = useState(member.sport_name);
  const [emoji, setEmoji] = useState(member.sport_emoji);
  const [goal, setGoal] = useState<number | null>(member.goal_per_period);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(today(), 7));

  const freeze = member.freeze;
  const cooldownUntil = member.freeze_cooldown_until;
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
      new Date(`${iso.slice(0, 10)}T00:00:00Z`),
    );

  const save = () => {
    update.mutate(
      { sport_name: sport.trim(), sport_emoji: emoji, goal_per_period: goal },
      {
        onSuccess: () => {
          toast({ title: t.membership.saved });
          onClose();
        },
        onError: showApiError,
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t.membership.title}>
      <motion.div variants={sheetItemVariants}>
        <TextField
          label={t.membership.sportLabel}
          value={sport}
          placeholder={t.membership.sportPlaceholder}
          maxLength={MAX_SPORT}
          onChange={(event) => setSport(event.target.value.slice(0, MAX_SPORT))}
        />
        <p className={styles.hint}>{t.membership.sportHint}</p>
      </motion.div>

      <motion.div variants={sheetItemVariants}>
        <span className={styles.label}>{t.membership.emojiLabel}</span>
        <div className={styles.grid}>
          {SPORT_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className={cx(styles.emoji, emoji === e && styles.emojiActive)}
              aria-label={e}
              aria-pressed={emoji === e}
              onClick={() => {
                hapticSelection();
                setEmoji(emoji === e ? "" : e);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={sheetItemVariants} className={styles.goalRow}>
        <Stepper
          label={t.membership.goalLabel}
          hint={t.membership.goalHint(room.goal_per_period)}
          unit={t.membership.goalUnit}
          value={goal ?? room.goal_per_period}
          min={1}
          max={100}
          onChange={setGoal}
        />
        {goal !== null && (
          <button type="button" className={styles.reset} onClick={() => setGoal(null)}>
            {t.membership.useRoomGoal}
          </button>
        )}
      </motion.div>

      <motion.div variants={sheetItemVariants} className={styles.freeze}>
        <span className={styles.label}>{t.membership.freezeTitle}</span>
        <p className={styles.lede}>{t.membership.freezeLede}</p>

        {freeze ? (
          <>
            <p className={styles.freezeState}>
              {new Date(`${freeze.starts_at.slice(0, 10)}T00:00:00Z`) <= new Date()
                ? t.membership.freezeActive(formatDate(freeze.ends_at))
                : t.membership.freezeScheduled(
                    formatDate(freeze.starts_at),
                    formatDate(freeze.ends_at),
                  )}
            </p>
            <Button
              variant="secondary"
              block
              disabled={cancelFreeze.isPending}
              onClick={() =>
                cancelFreeze.mutate(undefined, {
                  onSuccess: () => toast({ title: t.membership.freezeCanceled }),
                  onError: showApiError,
                })
              }
            >
              {t.membership.freezeCancel}
            </Button>
          </>
        ) : (
          <>
            <div className={styles.dates}>
              <label className={styles.dateField}>
                <span>{t.membership.freezeFrom}</span>
                <input
                  type="date"
                  value={from}
                  min={today()}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    if (event.target.value >= to) {
                      setTo(plusDays(event.target.value, 7));
                    }
                  }}
                />
              </label>
              <label className={styles.dateField}>
                <span>{t.membership.freezeTo}</span>
                <input
                  type="date"
                  value={to}
                  min={plusDays(from, 1)}
                  max={plusDays(from, 30)}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
            <p className={styles.hint}>
              {cooldownUntil
                ? t.membership.freezeCooldown(formatDate(cooldownUntil))
                : t.membership.freezeLimits}
            </p>
            <Button
              variant="secondary"
              block
              disabled={startFreeze.isPending}
              onClick={() =>
                startFreeze.mutate(
                  { starts_at: from, ends_at: to },
                  {
                    onSuccess: () => toast({ title: t.membership.freezeStarted }),
                    onError: showApiError,
                  },
                )
              }
            >
              {t.membership.freezeStart}
            </Button>
          </>
        )}
      </motion.div>

      <motion.div variants={sheetItemVariants} className={styles.actions}>
        <Button block disabled={update.isPending} onClick={save}>
          {t.membership.save}
        </Button>
      </motion.div>
    </BottomSheet>
  );
}
