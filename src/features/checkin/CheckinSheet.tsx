import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useCreateCheckin } from "@/entities/checkin";
import { useRooms } from "@/entities/room";
import { ApiError } from "@/shared/api/client";
import type { Checkin, Member, Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCamera, IconClock, IconComment, IconGeoPinFilled, IconImage } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { type CompressedPhoto, compressPhoto } from "@/shared/lib/photo";
import {
  type GeoResult,
  getTelegramLocation,
  isIos,
  openTelegramLocationSettings,
} from "@/shared/lib/telegram";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Button, sheetItemVariants, useToast } from "@/shared/ui";
import { CameraCapture } from "./CameraCapture";
import { Celebration } from "./Celebration";
import styles from "./CheckinSheet.module.css";
import { PhotoPreview } from "./PhotoPreview";
import { ProcessingOverlay } from "./ProcessingOverlay";

const MAX_PHOTO_BYTES = 10 << 20;

export type CheckinSheetProps = {
  open: boolean;
  onClose: () => void;
  room: Room;
  /* everyone else in the room: the people who could have trained with you */
  members: Member[];
  /* my workouts this period, for the celebration progress card */
  myProgress: number;
  myGoal?: number;
};

export function CheckinSheet({
  open,
  onClose,
  room,
  members,
  myProgress,
  myGoal,
}: CheckinSheetProps) {
  const { t } = useI18n();
  const showToast = useToast();
  const showApiError = useApiErrorToast();
  const createCheckin = useCreateCheckin(room.id);
  const rooms = useRooms();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const systemCamera = useRef(isIos()).current;

  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [selected, setSelected] = useState<number[]>([room.id]);
  const [buddies, setBuddies] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [celebrated, setCelebrated] = useState<Checkin | null>(null);

  const myRooms = rooms.data ?? [];

  const geoErrorTitle = (reason: Extract<GeoResult, { ok: false }>["reason"]) => {
    switch (reason) {
      case "unsupported":
        return t.checkinSheet.geoUnsupported;
      case "unavailable":
        return t.checkinSheet.geoUnavailable;
      case "accuracy":
        return t.checkinSheet.geoAccuracy;
      default:
        return t.checkinSheet.geoDenied;
    }
  };

  const takePhoto = () => {
    if (systemCamera) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  };
  const pickFromGallery = () => {
    setCameraOpen(false);
    galleryInputRef.current?.click();
  };

  const toggleRoom = (roomId: number) => {
    setSelected((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId],
    );
  };

  const toggleBuddy = (userId: number) => {
    setBuddies((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      hapticNotify("error");
      showToast({
        title: t.errors.photoTooLarge,
        description: t.errors.photoTooLargeDesc((file.size / (1 << 20)).toFixed(1)),
        icon: <IconImage size={20} />,
        tone: "error",
      });
      return;
    }
    const needsDecode = !file.type.startsWith("image/jpeg") && !file.type.startsWith("image/png");
    setProcessing(needsDecode ? t.camera.decoding : t.camera.processing);
    try {
      /* resizing here also strips EXIF, so camera GPS tags never leave the device */
      setPhoto(await compressPhoto(file));
      setSelected([room.id]);
      setProgress(0);
      setCameraOpen(false);
      // the preview is the next step: leaving the sheet under it stacks two screens
      onClose();
    } catch {
      hapticNotify("error");
      showToast({ title: t.errors.photoUnreadable, tone: "error" });
    } finally {
      setProcessing(null);
    }
  };

  const onCreateSuccess = (checkins: Checkin[]) => {
    hapticNotify("success");
    setPhoto(null);
    setBuddies([]);
    onClose();
    const mine = checkins.find((c) => c.room_id === room.id) ?? checkins[0];
    setCelebrated(mine ?? null);
  };

  const sendPhoto = () => {
    if (!photo || selected.length === 0) {
      return;
    }
    setProgress(0);
    createCheckin.mutate(
      { photo: photo.file, roomIds: selected, buddyIds: buddies, onProgress: setProgress },
      {
        onSuccess: onCreateSuccess,
        onError: (error) => {
          setProgress(0);
          showApiError(error);
        },
      },
    );
  };

  const sendGeo = async () => {
    if (createCheckin.isPending || geoBusy) {
      return;
    }
    setGeoBusy(true);
    setProcessing(t.checkinSheet.geoLocating);
    try {
      const result = await getTelegramLocation();
      if (!result.ok) {
        hapticNotify("error");
        setProcessing(null);
        if (result.reason === "denied" && openTelegramLocationSettings()) {
          return;
        }
        showToast({
          title: geoErrorTitle(result.reason),
          icon: <IconGeoPinFilled size={20} />,
          tone: "error",
        });
        return;
      }
      /* the gym lookup goes out to a places provider, so it takes seconds, not milliseconds */
      setProcessing(t.checkinSheet.geoSearching(Math.round(result.geo.horizontal_accuracy)));
      createCheckin.mutate(
        { geo: result.geo, roomIds: [room.id] },
        {
          onSuccess: (checkins) => {
            setProcessing(null);
            onCreateSuccess(checkins);
          },
          onError: (error) => {
            setProcessing(null);
            hapticNotify("error");
            if (error instanceof ApiError && error.status === 400) {
              showToast({
                title: t.checkinSheet.geoNoGym,
                description: t.checkinSheet.geoNoGymDesc,
                icon: <IconGeoPinFilled size={20} />,
                tone: "error",
              });
              return;
            }
            showApiError(error);
          },
        },
      );
    } finally {
      setGeoBusy(false);
    }
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={t.checkinSheet.title}>
        <motion.button
          type="button"
          className={styles.photoCard}
          variants={sheetItemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={takePhoto}
          disabled={createCheckin.isPending}
        >
          <span className={styles.photoCardInner}>
            <span className={styles.shine} aria-hidden="true" />
            <span className={styles.cameraIcon}>
              <IconCamera size={26} />
            </span>
            <span className={styles.cardText}>
              <span className={styles.cardTitle}>{t.checkinSheet.photoTitle}</span>
              <span className={styles.cardDesc}>{t.checkinSheet.photoDesc}</span>
              <span className={styles.chips}>
                <span className={styles.chip}>{t.checkinSheet.chipVotes(room.votes_required)}</span>
                <span className={styles.chip}>
                  <IconClock size={10} /> {t.checkinSheet.chipHours}
                </span>
                <span className={styles.chip}>{t.checkinSheet.chipSize}</span>
              </span>
            </span>
          </span>
        </motion.button>

        <motion.button
          type="button"
          className={styles.galleryRow}
          variants={sheetItemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={pickFromGallery}
          disabled={createCheckin.isPending}
        >
          <IconImage size={18} />
          {t.checkinSheet.fromGallery}
        </motion.button>

        <motion.p className={styles.hint} variants={sheetItemVariants}>
          <IconComment size={15} className={styles.hintIcon} />
          <span>{t.checkinSheet.photoIsMoreFun}</span>
        </motion.p>

        {/* the quiet option: it counts instantly, so it does not need to sell itself */}
        <motion.button
          type="button"
          className={styles.geoRow}
          variants={sheetItemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={() => void sendGeo()}
          disabled={createCheckin.isPending || geoBusy}
        >
          <IconGeoPinFilled size={16} className={styles.geoRowIcon} />
          <span className={styles.geoRowTitle}>{t.checkinSheet.geoTitle}</span>
          <span className={styles.geoRowDesc}>{t.checkinSheet.geoDesc}</span>
        </motion.button>

        <motion.div variants={sheetItemVariants} className={styles.cancelWrap}>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </motion.div>
      </BottomSheet>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif"
        className={styles.fileInput}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {processing !== null && !cameraOpen && <ProcessingOverlay label={processing} />}
      </AnimatePresence>

      <AnimatePresence>
        {cameraOpen && (
          <CameraCapture
            busy={processing !== null}
            onCapture={(file) => void onFile(file)}
            onPickGallery={pickFromGallery}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {photo && (
          <PhotoPreview
            photo={photo}
            rooms={myRooms}
            selected={selected}
            onToggleRoom={toggleRoom}
            buddyCandidates={members}
            selectedBuddies={buddies}
            onToggleBuddy={toggleBuddy}
            pending={createCheckin.isPending}
            progress={progress}
            onRetake={takePhoto}
            onSubmit={sendPhoto}
            onClose={() => setPhoto(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrated && (
          <Celebration
            checkin={celebrated}
            room={room}
            myProgress={myProgress}
            myGoal={myGoal}
            onClose={() => setCelebrated(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
