import { motion } from "motion/react";
import { useState } from "react";
import { useUpdateStatus } from "@/entities/user";
import type { User } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import { BottomSheet, Button, sheetItemVariants, TextField, useToast } from "@/shared/ui";
import styles from "./StatusSheet.module.css";

/* A curated grid beats an emoji-picker dependency: these are the ones people actually reach
   for in a gym app, and anything else is still reachable through the system keyboard. */
const EMOJI = [
  "💪",
  "🔥",
  "🏋️",
  "🏃",
  "🚴",
  "🤸",
  "🧘",
  "⚡",
  "🥊",
  "🏆",
  "😤",
  "😮‍💨",
  "🥵",
  "🧊",
  "🤕",
  "😴",
  "🍗",
  "🥦",
  "☕",
  "💀",
];

const MAX_TEXT = 60;

export function StatusSheet({
  user,
  open,
  onClose,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const update = useUpdateStatus();
  const [emoji, setEmoji] = useState(user.status_emoji);
  const [text, setText] = useState(user.status_text);

  const save = (next: { emoji: string; text: string }) => {
    update.mutate(
      { status_emoji: next.emoji, status_text: next.text },
      {
        onSuccess: onClose,
        onError: () => toast({ title: t.errors.generic, description: t.errors.genericDesc }),
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t.status.title}>
      <motion.div variants={sheetItemVariants}>
        <div className={styles.presets}>
          {t.status.presets.map((preset) => (
            <button
              key={preset.text}
              type="button"
              className={cx(
                styles.preset,
                emoji === preset.emoji && text === preset.text && styles.presetActive,
              )}
              onClick={() => {
                hapticSelection();
                setEmoji(preset.emoji);
                setText(preset.text);
              }}
            >
              <span className={styles.presetEmoji}>{preset.emoji}</span>
              {preset.text}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={sheetItemVariants}>
        <div className={styles.grid}>
          {EMOJI.map((e) => (
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
        <TextField
          label={t.status.custom}
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_TEXT))}
          placeholder={t.status.placeholder}
          maxLength={MAX_TEXT}
          showCounter
        />
      </motion.div>

      <motion.div className={styles.actions} variants={sheetItemVariants}>
        <Button
          variant="secondary"
          block
          disabled={update.isPending}
          onClick={() => save({ emoji: "", text: "" })}
        >
          {t.status.clear}
        </Button>
        <Button block disabled={update.isPending} onClick={() => save({ emoji, text })}>
          {t.status.save}
        </Button>
      </motion.div>
    </BottomSheet>
  );
}
