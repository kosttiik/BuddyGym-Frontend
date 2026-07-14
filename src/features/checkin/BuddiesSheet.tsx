import { motion } from "motion/react";
import type { User } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { stagger } from "@/shared/lib/motion";
import { Avatar, BottomSheet, StatusMark, sheetItemVariants } from "@/shared/ui";
import styles from "./BuddiesSheet.module.css";

export function BuddiesSheet({
  buddies,
  author,
  open,
  onClose,
}: {
  buddies: User[];
  author?: User;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const people = author ? [author, ...buddies] : buddies;

  return (
    <BottomSheet open={open} onClose={onClose} title={t.buddies.trainedTogether}>
      <motion.div
        className={styles.list}
        variants={stagger(0.05)}
        initial="hidden"
        animate="visible"
      >
        {people.map((person, i) => (
          <motion.div key={person.id} className={styles.row} variants={sheetItemVariants}>
            <Avatar
              name={person.first_name}
              seed={person.id}
              hasAvatar={person.has_avatar}
              size={42}
            />
            <div className={styles.info}>
              <span className={styles.name}>
                {person.first_name}
                {i === 0 && author && <span className={styles.author}>{t.buddies.author}</span>}
              </span>
              <StatusMark user={person} withText />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </BottomSheet>
  );
}
