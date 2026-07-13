import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n";
import { IconCamera, IconCross, IconImage } from "@/shared/icons";
import { hapticImpact } from "@/shared/lib/haptics";
import { showBackButton } from "@/shared/lib/telegram";
import { Button, Spinner } from "@/shared/ui";
import styles from "./CameraCapture.module.css";

export type CameraCaptureProps = {
  onCapture: (file: File) => void;
  onPickGallery: () => void;
  onClose: () => void;
};

type Facing = "environment" | "user";

/* Telegram's Android WebView ignores <input capture> and always opens the gallery. */
export function CameraCapture({ onCapture, onPickGallery, onClose }: CameraCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<Facing>("user");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => showBackButton(onClose), [onClose]);

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setReady(false);
      setFailed(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        stop();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) {
      return;
    }
    setBusy(true);
    hapticImpact("medium");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setBusy(false);
      return;
    }
    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      setBusy(false);
      return;
    }

    stop();
    onCapture(new File([blob], "checkin.jpg", { type: "image/jpeg" }));
  };

  return createPortal(
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        data-mirrored={facing === "user" || undefined}
        playsInline
        muted
        autoPlay
      />

      {!ready && !failed && (
        <div className={styles.state}>
          <Spinner />
        </div>
      )}

      {failed && (
        <div className={styles.state}>
          <p className={styles.failedText}>{t.camera.denied}</p>
          <Button variant="secondary" icon={<IconImage size={16} />} onClick={onPickGallery}>
            {t.checkinSheet.fromGallery}
          </Button>
        </div>
      )}

      <header className={styles.header}>
        <button
          type="button"
          className={styles.round}
          onClick={onClose}
          aria-label={t.common.close}
        >
          <IconCross size={16} />
        </button>
      </header>

      {!failed && (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.side}
            onClick={onPickGallery}
            aria-label={t.checkinSheet.fromGallery}
          >
            <IconImage size={20} />
          </button>

          <button
            type="button"
            className={styles.shutter}
            onClick={() => void shoot()}
            disabled={!ready || busy}
            aria-label={t.camera.shoot}
          >
            <span className={styles.shutterRing} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.side}
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label={t.camera.flip}
          >
            <IconCamera size={20} />
          </button>
        </footer>
      )}
    </motion.div>,
    document.body,
  );
}
