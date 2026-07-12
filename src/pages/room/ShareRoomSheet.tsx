import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconChevronRight, IconClipboard, IconKey, IconShare } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { inviteLink } from "@/shared/lib/inviteLink";
import { canShareToTelegram, shareToTelegram } from "@/shared/lib/telegram";
import { BottomSheet, sheetItemVariants, useToast } from "@/shared/ui";
import styles from "./ShareRoomSheet.module.css";

export type ShareRoomSheetProps = {
  open: boolean;
  onClose: () => void;
  room: Room;
};

export function ShareRoomSheet({ open, onClose, room }: ShareRoomSheetProps) {
  const { t } = useI18n();
  const showToast = useToast();
  const code = room.invite_code ?? "";
  const link = inviteLink(code);

  const copy = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      hapticNotify("success");
      showToast({ title, tone: "warning", icon: <IconClipboard size={18} /> });
      onClose();
    } catch {
      hapticNotify("error");
      showToast({ title: t.errors.copyFailed, tone: "error" });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t.share.title}>
      <motion.p className={styles.linkPreview} variants={sheetItemVariants}>
        {link}
      </motion.p>

      {canShareToTelegram() && (
        <ShareRow
          icon={<IconShare size={20} />}
          title={t.share.sendInTelegram}
          desc={t.share.sendInTelegramDesc}
          accent
          onClick={() => shareToTelegram(link, t.share.inviteText(room.name))}
        />
      )}

      <ShareRow
        icon={<IconClipboard size={20} />}
        title={t.share.copyLink}
        desc={t.share.copyLinkDesc}
        onClick={() => void copy(link, t.share.linkCopied)}
      />

      <ShareRow
        icon={<IconKey size={20} />}
        title={t.share.copyCode}
        desc={code}
        mono
        onClick={() => void copy(code, t.room.codeCopied)}
      />
    </BottomSheet>
  );
}

function ShareRow({
  icon,
  title,
  desc,
  accent,
  mono,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  accent?: boolean;
  mono?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className={styles.row}
      data-accent={accent || undefined}
      variants={sheetItemVariants}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowDesc} data-mono={mono || undefined}>
          {desc}
        </span>
      </span>
      <IconChevronRight size={16} className={styles.rowChevron} />
    </motion.button>
  );
}
