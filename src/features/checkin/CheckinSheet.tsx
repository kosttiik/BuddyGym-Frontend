import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useCreateCheckin } from "@/entities/checkin";
import { useRooms } from "@/entities/room";
import type { Checkin, Room } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconCamera, IconClock, IconGeoPinFilled, IconImage } from "@/shared/icons";
import { hapticNotify } from "@/shared/lib/haptics";
import { type CompressedPhoto, compressPhoto } from "@/shared/lib/photo";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { BottomSheet, Button, sheetItemVariants, useToast } from "@/shared/ui";
import { Celebration } from "./Celebration";
import styles from "./CheckinSheet.module.css";
import { PhotoPreview } from "./PhotoPreview";

const MAX_PHOTO_BYTES = 10 << 20;

export type CheckinSheetProps = {
  open: boolean;
  onClose: () => void;
  room: Room;
  /* my workouts this period, for the celebration progress card */
  myProgress: number;
};

export function CheckinSheet({ open, onClose, room, myProgress }: CheckinSheetProps) {
  const { t } = useI18n();
  const showToast = useToast();
  const showApiError = useApiErrorToast();
  const createCheckin = useCreateCheckin(room.id);
  const rooms = useRooms();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [selected, setSelected] = useState<number[]>([room.id]);
  const [progress, setProgress] = useState(0);
  const [celebrated, setCelebrated] = useState<Checkin | null>(null);

  const myRooms = rooms.data ?? [];

  const pickPhoto = () => fileInputRef.current?.click();

  const toggleRoom = (roomId: number) => {
    setSelected((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId],
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
    try {
      /* resizing here also strips EXIF, so camera GPS tags never leave the device */
      setPhoto(await compressPhoto(file));
      setSelected([room.id]);
      setProgress(0);
    } catch {
      hapticNotify("error");
      showToast({ title: t.errors.photoUnreadable, tone: "error" });
    }
  };

  const sendPhoto = () => {
    if (!photo || selected.length === 0) {
      return;
    }
    setProgress(0);
    createCheckin.mutate(
      { photo: photo.file, roomIds: selected, onProgress: setProgress },
      {
        onSuccess: (checkins) => {
          hapticNotify("success");
          setPhoto(null);
          onClose();
          const mine = checkins.find((c) => c.room_id === room.id) ?? checkins[0];
          setCelebrated(mine ?? null);
        },
        onError: (error) => {
          setProgress(0);
          showApiError(error);
        },
      },
    );
  };

  const sendGeo = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        createCheckin.mutate(
          {
            geo: { lat: position.coords.latitude, lon: position.coords.longitude },
            roomIds: [room.id],
          },
          {
            onSuccess: (checkins) => {
              hapticNotify("success");
              onClose();
              setCelebrated(checkins[0] ?? null);
            },
            onError: showApiError,
          },
        );
      },
      () => {
        hapticNotify("error");
        showToast({ title: t.checkinSheet.geoDenied, tone: "error" });
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={t.checkinSheet.title}>
        <motion.button
          type="button"
          className={styles.photoCard}
          variants={sheetItemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={pickPhoto}
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
          className={styles.geoCard}
          variants={sheetItemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={sendGeo}
          disabled={createCheckin.isPending}
        >
          <span className={styles.radar}>
            <span className={styles.radarWave} aria-hidden="true" />
            <span className={styles.radarWave2} aria-hidden="true" />
            <IconGeoPinFilled size={22} className={styles.geoIcon} />
          </span>
          <span className={styles.cardText}>
            <span className={styles.geoTitle}>{t.checkinSheet.geoTitle}</span>
            <span className={styles.geoDesc}>{t.checkinSheet.geoDesc}</span>
          </span>
          <span className={styles.instant}>
            <span className={styles.instantDot} aria-hidden="true" />
            {t.checkinSheet.instant}
          </span>
        </motion.button>

        <motion.div variants={sheetItemVariants} className={styles.cancelWrap}>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </motion.div>
      </BottomSheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {photo && (
          <PhotoPreview
            photo={photo}
            rooms={myRooms}
            selected={selected}
            onToggleRoom={toggleRoom}
            pending={createCheckin.isPending}
            progress={progress}
            onRetake={pickPhoto}
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
            onClose={() => setCelebrated(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
