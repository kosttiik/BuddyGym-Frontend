import { useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { useCreateRoom, useDeleteRoom, useRoom, useUpdateRoom } from "@/entities/room";
import { useMe } from "@/entities/user";
import type { CreateRoomRequest, RoomKind } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import {
  IconCalendar,
  IconGlobe,
  IconInfo,
  IconLock,
  IconSliders,
  IconTarget,
  IconTrash,
  IconUserCheck,
} from "@/shared/icons";
import { hapticNotify, hapticTap } from "@/shared/lib/haptics";
import {
  AppHeader,
  BottomSheet,
  Button,
  GlassCard,
  Page,
  SegmentedControl,
  Skeleton,
  Stepper,
  sheetItemVariants,
  TextField,
  useToast,
} from "@/shared/ui";
import styles from "./RoomFormPage.module.css";

export function CreateRoomPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const showToast = useToast();
  const createRoom = useCreateRoom();

  return (
    <>
      <AppHeader variant="nested" title={t.createRoom.title} />
      <Page>
        <RoomForm
          submitLabel={t.createRoom.submit}
          pending={createRoom.isPending}
          onSubmit={(body) =>
            createRoom.mutate(body, {
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
            })
          }
        />
      </Page>
    </>
  );
}

export function EditRoomPage() {
  const { roomId } = useParams({ strict: false }) as { roomId: string };
  const id = Number(roomId);
  const { t } = useI18n();
  const navigate = useNavigate();
  const showToast = useToast();
  const room = useRoom(id);
  const me = useMe();
  const updateRoom = useUpdateRoom(id);
  const deleteRoom = useDeleteRoom();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCreator = room.isSuccess && room.data.room.creator_id === me.data?.user.id;

  return (
    <>
      <AppHeader variant="nested" title={t.createRoom.editTitle} />
      <Page>
        {room.isPending && <FormSkeleton />}
        {room.isSuccess && !isCreator && (
          <p className={styles.accessHint}>{t.createRoom.creatorOnly}</p>
        )}
        {isCreator && (
          <RoomForm
            initial={room.data.room}
            submitLabel={t.createRoom.save}
            pending={updateRoom.isPending}
            onSubmit={(body) =>
              updateRoom.mutate(body, {
                onSuccess: () => {
                  hapticNotify("success");
                  showToast({ title: t.createRoom.saved });
                  void navigate({
                    to: "/rooms/$roomId",
                    params: { roomId: String(id) },
                    replace: true,
                  });
                },
                onError: () => {
                  showToast({ title: t.errors.generic, description: t.errors.genericDesc });
                },
              })
            }
          />
        )}
        {isCreator && (
          <div className={styles.danger}>
            <Button
              variant="ghost"
              block
              className={styles.deleteButton}
              icon={<IconTrash size={15} />}
              disabled={deleteRoom.isPending}
              onClick={() => {
                hapticTap();
                setConfirmOpen(true);
              }}
            >
              {t.createRoom.deleteRoom}
            </Button>
            <span className={styles.dangerNote}>{t.createRoom.deleteRoomNote}</span>
          </div>
        )}
      </Page>

      {/* deleting takes the room away from everyone in it, so it asks first */}
      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t.createRoom.deleteConfirmTitle}
      >
        <motion.p className={styles.confirmText} variants={sheetItemVariants}>
          {t.createRoom.deleteConfirmText}
        </motion.p>
        <motion.div className={styles.confirmActions} variants={sheetItemVariants}>
          <Button variant="secondary" block onClick={() => setConfirmOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="ghost"
            block
            className={styles.deleteButton}
            disabled={deleteRoom.isPending}
            onClick={() =>
              deleteRoom.mutate(id, {
                onSuccess: () => {
                  hapticNotify("success");
                  void navigate({ to: "/", replace: true });
                },
                onError: () => {
                  showToast({ title: t.errors.generic, description: t.errors.genericDesc });
                },
              })
            }
          >
            {t.createRoom.deleteConfirm}
          </Button>
        </motion.div>
      </BottomSheet>
    </>
  );
}

function RoomForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial?: CreateRoomRequest;
  submitLabel: string;
  pending: boolean;
  onSubmit: (body: CreateRoomRequest) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<RoomKind>(initial?.kind ?? "open");
  const [goal, setGoal] = useState(initial?.goal_per_period ?? 3);
  const [period, setPeriod] = useState(initial?.period_days ?? 7);
  const [votes, setVotes] = useState(initial?.votes_required ?? 2);

  return (
    <>
      <TextField
        label={t.createRoom.nameSection}
        placeholder={t.createRoom.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={64}
        showCounter
      />

      <section className={styles.section}>
        <span className={styles.sectionLabel}>
          {kind === "open" ? (
            <IconGlobe size={15} className={styles.sectionIcon} />
          ) : (
            <IconLock size={15} className={styles.sectionIcon} />
          )}
          {t.createRoom.accessSection}
        </span>
        <GlassCard className={styles.accessCard}>
          <SegmentedControl
            options={[
              { key: "open", label: t.createRoom.open },
              { key: "invite", label: t.createRoom.invite },
            ]}
            value={kind}
            onChange={setKind}
          />
          <span className={styles.accessHint}>
            <IconInfo size={14} className={styles.accessHintIcon} />
            {kind === "open" ? t.createRoom.openHint : t.createRoom.inviteHint}
          </span>
        </GlassCard>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>
          <IconSliders size={15} className={styles.sectionIcon} />
          {t.createRoom.rulesSection}
        </span>
        <GlassCard className={styles.rules}>
          <Stepper
            className={styles.rule}
            icon={<IconTarget size={17} />}
            label={t.createRoom.goal}
            hint={t.createRoom.goalHint}
            unit={t.createRoom.goalUnit(goal)}
            value={goal}
            min={1}
            max={100}
            onChange={setGoal}
          />
          <Stepper
            className={styles.rule}
            icon={<IconCalendar size={17} />}
            label={t.createRoom.period}
            hint={t.createRoom.periodHint}
            unit={t.createRoom.periodUnit(period)}
            value={period}
            min={1}
            max={90}
            onChange={setPeriod}
          />
          <Stepper
            className={styles.rule}
            icon={<IconUserCheck size={17} />}
            label={t.createRoom.votes}
            hint={t.createRoom.votesHint}
            unit={t.createRoom.votesUnit(votes)}
            value={votes}
            min={1}
            max={20}
            onChange={setVotes}
          />
        </GlassCard>
      </section>

      <div className={styles.summary}>
        <IconInfo size={15} className={styles.summaryIcon} />
        <span>{t.createRoom.summary(goal, period, votes)}</span>
      </div>

      <Button
        block
        disabled={name.trim().length === 0 || pending}
        onClick={() =>
          onSubmit({
            name: name.trim(),
            kind,
            goal_per_period: goal,
            period_days: period,
            votes_required: votes,
          })
        }
      >
        {submitLabel}
      </Button>
    </>
  );
}

function FormSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton height={52} radius={14} />
      <Skeleton height={96} radius={18} style={{ marginTop: 16 }} />
      <Skeleton height={190} radius={18} style={{ marginTop: 16 }} />
    </div>
  );
}
