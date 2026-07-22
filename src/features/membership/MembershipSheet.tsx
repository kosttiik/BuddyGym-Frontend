import { motion } from "motion/react";
import { useState } from "react";
import { useUpdateMembership } from "@/entities/room";
import type { Member, Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconChevronRight, IconSnowflake } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import { SPORT_EMOJI } from "@/shared/lib/sportEmoji";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Button, Stepper, sheetItemVariants, TextField, useToast } from "@/shared/ui";
import { FreezeSheet, freezeStateLabel } from "./FreezeSheet";
import styles from "./MembershipSheet.module.css";

const MAX_SPORT = 32;

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

  const [sport, setSport] = useState(member.sport_name);
  const [emoji, setEmoji] = useState(member.sport_emoji);
  const [goal, setGoal] = useState<number | null>(member.goal_per_period);
  const [freezeOpen, setFreezeOpen] = useState(false);

  const save = () => {
    update.mutate(
      { sport_name: sport.trim(), sport_emoji: emoji, goal_per_period: goal },
      {
        onSuccess: () => {
          toast({ title: t.membership.saved, tone: "success" });
          onClose();
        },
        onError: showApiError,
      },
    );
  };

  return (
    <>
      <BottomSheet open={open && !freezeOpen} onClose={onClose} title={t.membership.title}>
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
          {/* the button keeps its slot even when it is idle: appearing mid-column would
              shove the freeze row down under the user's thumb */}
          <button
            type="button"
            className={cx(styles.reset, goal === null && styles.resetIdle)}
            disabled={goal === null}
            onClick={() => setGoal(null)}
          >
            {t.membership.useRoomGoal}
          </button>
        </motion.div>

        <motion.button
          type="button"
          variants={sheetItemVariants}
          className={styles.freezeRow}
          onClick={() => setFreezeOpen(true)}
        >
          <span className={styles.freezeIcon}>
            <IconSnowflake size={18} />
          </span>
          <span className={styles.freezeText}>
            <span className={styles.freezeTitle}>{t.membership.freezeTitle}</span>
            <span className={styles.freezeState}>{freezeStateLabel(member, t, locale)}</span>
          </span>
          <IconChevronRight size={16} className={styles.freezeChevron} />
        </motion.button>

        <motion.div variants={sheetItemVariants} className={styles.actions}>
          <Button block disabled={update.isPending} onClick={save}>
            {t.membership.save}
          </Button>
        </motion.div>
      </BottomSheet>

      <FreezeSheet
        roomId={room.id}
        member={member}
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
      />
    </>
  );
}
