import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAddRoomAvatar, useDeleteRoomAvatar, useRoomAvatars } from "@/entities/room";
import type { Member, RoomAvatar } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { IconChevronLeft, IconChevronRight, IconCross, IconImage, IconTrash } from "@/shared/icons";
import { hapticNotify, hapticTap } from "@/shared/lib/haptics";
import { spring } from "@/shared/lib/motion";
import { compressPhoto } from "@/shared/lib/photo";
import { showBackButton } from "@/shared/lib/telegram";
import { useApiErrorToast } from "@/shared/lib/useApiErrorToast";
import { prefetchImage, roomAvatarByIdPath, useRoomGalleryPhoto } from "@/shared/lib/useAvatar";
import { Spinner } from "@/shared/ui";
import styles from "./RoomGallery.module.css";

export type RoomGalleryProps = {
  roomId: number;
  roomName: string;
  members: Member[];
  myId?: number;
  isCreator: boolean;
  onClose: () => void;
};

/* A flick counts when it is either long enough or fast enough, the way the photo apps do it:
   a short but quick swipe must not snap back. */
const SWIPE_RATIO = 0.22;
const SWIPE_VELOCITY = 420;

export function RoomGallery({
  roomId,
  roomName,
  members,
  myId,
  isCreator,
  onClose,
}: RoomGalleryProps) {
  const { t, locale } = useI18n();
  const reduce = useReducedMotion();
  const showApiError = useApiErrorToast();
  const gallery = useRoomAvatars(roomId);
  const addPhoto = useAddRoomAvatar(roomId);
  const removePhoto = useDeleteRoomAvatar(roomId);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const photos = gallery.data ?? [];
  const last = Math.max(photos.length - 1, 0);
  const safeIndex = Math.min(index, last);
  const current = photos[safeIndex];
  const uploader = members.find((m) => m.id === current?.uploaded_by);
  const canDelete = current !== undefined && (isCreator || current.uploaded_by === myId);

  useEffect(() => showBackButton(onClose), [onClose]);

  /* the track is positioned in pixels, so its width has to be known before the first paint */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    /* falls back to the viewport when the stage is measured before it has been laid out */
    setWidth(stage.clientWidth || window.innerWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (index > last) {
      setIndex(last);
    }
  }, [index, last]);

  /* neighbours are fetched ahead of the swipe: the next frame is already decoded on arrival */
  useEffect(() => {
    for (const neighbour of [photos[safeIndex - 1], photos[safeIndex + 1]]) {
      if (neighbour) {
        prefetchImage(roomAvatarByIdPath(roomId, neighbour.id));
      }
    }
  }, [photos, safeIndex, roomId]);

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), last);
    if (clamped !== safeIndex) {
      hapticTap();
    }
    setIndex(clamped);
  };

  const pick = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      await addPhoto.mutateAsync(compressed.file);
      hapticNotify("success");
      setIndex(0);
    } catch (error) {
      hapticNotify("error");
      showApiError(error);
    }
  };

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.bar}>
        <span className={styles.counter}>
          {photos.length > 0 ? t.gallery.counter(safeIndex + 1, photos.length) : roomName}
        </span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label={t.common.close}
        >
          <IconCross size={16} />
        </button>
      </div>

      <div className={styles.stage} ref={stageRef}>
        {photos.length > 0 && width > 0 ? (
          <motion.div
            className={styles.track}
            style={{ width: width * photos.length }}
            drag={photos.length > 1 ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: -last * width, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            animate={{ x: -safeIndex * width }}
            transition={reduce ? { duration: 0 } : spring.snappy}
            onDragEnd={(_, info) => {
              const far = Math.abs(info.offset.x) > width * SWIPE_RATIO;
              const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
              if (!far && !fast) {
                return;
              }
              goTo(safeIndex + (info.offset.x < 0 ? 1 : -1));
            }}
          >
            {photos.map((photo, i) => (
              <GallerySlide
                key={photo.id}
                roomId={roomId}
                photo={photo}
                width={width}
                /* only the visible frame and its neighbours are worth mounting an image for */
                active={Math.abs(i - safeIndex) <= 1}
              />
            ))}
          </motion.div>
        ) : gallery.isLoading || addPhoto.isPending ? (
          <Spinner />
        ) : (
          <p className={styles.empty}>{t.gallery.empty}</p>
        )}
      </div>

      {photos.length > 1 && (
        <div className={styles.dots}>
          {photos.map((photo, i) => (
            <motion.span
              key={photo.id}
              className={styles.dot}
              animate={{ opacity: i === safeIndex ? 1 : 0.32, scale: i === safeIndex ? 1.25 : 1 }}
              transition={reduce ? { duration: 0 } : spring.soft}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.caption}>
          {current
            ? t.gallery.addedBy(
                uploader?.first_name ?? "—",
                new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
                  new Date(current.created_at),
                ),
              )
            : t.gallery.emptyHint}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex <= 0}
            aria-label={t.gallery.previous}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => goTo(safeIndex + 1)}
            disabled={safeIndex >= last}
            aria-label={t.gallery.next}
          >
            <IconChevronRight size={16} />
          </button>
          {canDelete && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => removePhoto.mutate(current.id, { onError: showApiError })}
              disabled={removePhoto.isPending}
              aria-label={t.gallery.remove}
            >
              <IconTrash size={16} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => fileRef.current?.click()}
            disabled={addPhoto.isPending}
            aria-label={t.gallery.add}
          >
            <IconImage size={16} />
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </motion.div>,
    document.body,
  );
}

function GallerySlide({
  roomId,
  photo,
  width,
  active,
}: {
  roomId: number;
  photo: RoomAvatar;
  width: number;
  active: boolean;
}) {
  const url = useRoomGalleryPhoto(roomId, active ? photo.id : undefined);
  return (
    <div className={styles.slide} style={{ width }}>
      {url ? (
        <img src={url} alt="" className={styles.photo} decoding="async" draggable={false} />
      ) : (
        active && <Spinner />
      )}
    </div>
  );
}
