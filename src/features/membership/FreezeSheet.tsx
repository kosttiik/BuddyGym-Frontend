import { motion } from "motion/react";
import { useState } from "react";
import { useCancelFreeze, useCreateFreeze } from "@/entities/room";
import type { Member } from "@/shared/api/types";
import type { Dictionary } from "@/shared/i18n";
import { useI18n } from "@/shared/i18n";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Button, sheetItemVariants, useToast } from "@/shared/ui";
import styles from "./FreezeSheet.module.css";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(from: string, days: number): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string, locale: "ru" | "en"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`),
  );
}

export function freezeStateLabel(member: Member, t: Dictionary, locale: "ru" | "en"): string {
  if (member.freeze) {
    const started = new Date(`${member.freeze.starts_at.slice(0, 10)}T00:00:00Z`) <= new Date();
    return started
      ? t.membership.freezeActive(formatDate(member.freeze.ends_at, locale))
      : t.membership.freezeScheduled(
          formatDate(member.freeze.starts_at, locale),
          formatDate(member.freeze.ends_at, locale),
        );
  }
  if (member.freeze_cooldown_until && member.freeze_cooldown_until.slice(0, 10) > today()) {
    return t.membership.freezeCooldown(formatDate(member.freeze_cooldown_until, locale));
  }
  return t.membership.freezeAvailable;
}

export function FreezeSheet({
  roomId,
  member,
  open,
  onClose,
}: {
  roomId: number;
  member: Member;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const startFreeze = useCreateFreeze(roomId);
  const cancelFreeze = useCancelFreeze(roomId);

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(today(), 7));
  const freeze = member.freeze;

  return (
    <BottomSheet open={open} onClose={onClose} title={t.membership.freezeTitle}>
      <motion.p variants={sheetItemVariants} className={styles.lede}>
        {t.membership.freezeLede}
      </motion.p>

      {freeze ? (
        <motion.div variants={sheetItemVariants}>
          <p className={styles.state}>{freezeStateLabel(member, t, locale)}</p>
          <Button
            variant="secondary"
            block
            disabled={cancelFreeze.isPending}
            onClick={() =>
              cancelFreeze.mutate(undefined, {
                onSuccess: () => {
                  toast({ title: t.membership.freezeCanceled, tone: "success" });
                  onClose();
                },
                onError: showApiError,
              })
            }
          >
            {t.membership.freezeCancel}
          </Button>
        </motion.div>
      ) : (
        <motion.div variants={sheetItemVariants}>
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
            {member.freeze_cooldown_until && member.freeze_cooldown_until.slice(0, 10) > today()
              ? t.membership.freezeCooldown(formatDate(member.freeze_cooldown_until, locale))
              : t.membership.freezeLimits}
          </p>
          <Button
            block
            disabled={startFreeze.isPending}
            onClick={() =>
              startFreeze.mutate(
                { starts_at: from, ends_at: to },
                {
                  onSuccess: () => {
                    toast({ title: t.membership.freezeStarted, tone: "success" });
                    onClose();
                  },
                  onError: showApiError,
                },
              )
            }
          >
            {t.membership.freezeStart}
          </Button>
        </motion.div>
      )}
    </BottomSheet>
  );
}
