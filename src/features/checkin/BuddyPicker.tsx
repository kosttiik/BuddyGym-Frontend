import { motion } from "motion/react";
import type { Member } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCheckBold } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticSelection } from "@/shared/lib/haptics";
import { spring } from "@/shared/lib/motion";
import { Avatar } from "@/shared/ui";
import styles from "./BuddyPicker.module.css";

export function BuddyPicker({
  members,
  selected,
  onToggle,
  className,
}: {
  members: Member[];
  selected: number[];
  onToggle: (id: number) => void;
  className?: string;
}) {
  const { t } = useI18n();

  if (members.length === 0) {
    return null;
  }

  return (
    <div className={cx(styles.picker, className)}>
      <span className={styles.title}>{t.buddies.who}</span>
      <div className={styles.row}>
        {members.map((member) => {
          const isOn = selected.includes(member.id);
          return (
            <motion.button
              key={member.id}
              type="button"
              className={styles.buddy}
              aria-pressed={isOn}
              aria-label={member.first_name}
              whileTap={{ scale: 0.92 }}
              transition={spring.snappy}
              onClick={() => {
                hapticSelection();
                onToggle(member.id);
              }}
            >
              <span className={cx(styles.ring, isOn && styles.ringOn)}>
                <Avatar
                  name={member.first_name}
                  seed={member.id}
                  hasAvatar={member.has_avatar}
                  size={40}
                />
                {isOn && (
                  <motion.span
                    className={styles.check}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.bouncy}
                  >
                    <IconCheckBold size={10} />
                  </motion.span>
                )}
              </span>
              <span className={cx(styles.name, isOn && styles.nameOn)}>{member.first_name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
