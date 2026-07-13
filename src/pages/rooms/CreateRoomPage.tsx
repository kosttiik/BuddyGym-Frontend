import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateRoom } from "@/entities/room";
import type { RoomKind } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconCalendar,
  IconGlobe,
  IconInfo,
  IconLock,
  IconTarget,
  IconUserCheck,
} from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import {
  AppHeader,
  Button,
  GlassCard,
  Page,
  SegmentedControl,
  Stepper,
  TextField,
  useToast,
} from "@/shared/ui";
import styles from "./CreateRoomPage.module.css";

export function CreateRoomPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const showToast = useToast();
  const createRoom = useCreateRoom();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RoomKind>("open");
  const [goal, setGoal] = useState(3);
  const [period, setPeriod] = useState(7);
  const [votes, setVotes] = useState(2);

  const submit = () => {
    createRoom.mutate(
      {
        name: name.trim(),
        kind,
        goal_per_period: goal,
        period_days: period,
        votes_required: votes,
      },
      {
        onSuccess: (room) => {
          hapticNotify("success");
          void navigate({
            to: "/rooms/$roomId",
            params: { roomId: String(room.id) },
            replace: true,
          });
        },
        onError: () => {
          showToast({ title: t.errors.generic, description: t.errors.genericDesc });
        },
      },
    );
  };

  return (
    <>
      <AppHeader variant="nested" title={t.createRoom.title} />
      <Page>
        <TextField
          label={t.createRoom.nameLabel}
          placeholder={t.createRoom.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          showCounter
        />

        <div className={styles.block}>
          <span className={styles.blockLabel}>
            {kind === "open" ? (
              <IconGlobe size={15} className={styles.blockLabelIcon} />
            ) : (
              <IconLock size={15} className={styles.blockLabelIcon} />
            )}
            {t.createRoom.whoCanJoin}
          </span>
          <SegmentedControl
            options={[
              { key: "open", label: t.createRoom.open },
              { key: "invite", label: t.createRoom.invite },
            ]}
            value={kind}
            onChange={setKind}
          />
          <span className={styles.blockHint}>
            {kind === "open" ? t.createRoom.openHint : t.createRoom.inviteHint}
          </span>
        </div>

        <GlassCard className={styles.steppers}>
          <Stepper
            icon={<IconTarget size={17} />}
            label={t.createRoom.goal}
            hint={t.createRoom.goalHint}
            value={goal}
            min={1}
            max={100}
            onChange={setGoal}
          />
          <Stepper
            icon={<IconCalendar size={17} />}
            label={t.createRoom.period}
            hint={t.createRoom.periodHint}
            value={period}
            min={1}
            max={90}
            onChange={setPeriod}
          />
          <Stepper
            icon={<IconUserCheck size={17} />}
            label={t.createRoom.votes}
            hint={t.createRoom.votesHint}
            value={votes}
            min={1}
            max={20}
            onChange={setVotes}
          />
        </GlassCard>

        <div className={styles.summary}>
          <IconInfo size={15} className={styles.summaryIcon} />
          <span>{t.createRoom.summary(goal, period, votes)}</span>
        </div>

        <Button block disabled={name.trim().length === 0 || createRoom.isPending} onClick={submit}>
          {t.createRoom.submit}
        </Button>
      </Page>
    </>
  );
}
