import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n";
import { IconCameraFlip, IconCross, IconImage } from "@/shared/icons";
import { hapticImpact } from "@/shared/lib/haptics";
import { showBackButton } from "@/shared/lib/telegram";
import { Button, Spinner } from "@/shared/ui";
import styles from "./CameraCapture.module.css";

export type CameraCaptureProps = {
  onCapture: (file: File) => void;
  onPickGallery: () => void;
  onClose: () => void;
  busy?: boolean;
};

const LENS_KEY = "bg.camera.lens";

/* Labels tell the back lenses apart in name only: Android hands out wide, tele and macro
   alike as "camera2 N, facing back", and the platform default can land on the telephoto. */
async function backCameraIds(): Promise<string[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "videoinput" && /back|rear|environment/i.test(d.label))
      .map((d) => d.deviceId);
  } catch {
    return [];
  }
}

/* Track capabilities do tell them apart: the flash sits next to the main sensor, so only it
   reports torch, and it carries the highest resolution. Probing opens each lens once; the
   winner is remembered, and the lens button stays as the manual override. */
async function pickMainLens(ids: string[]): Promise<number> {
  let best = 0;
  let bestScore = -1;
  for (const [index, id] of ids.entries()) {
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: id } },
        audio: false,
      });
      const caps = stream.getVideoTracks()[0]?.getCapabilities?.() ?? {};
      const pixels = (caps.width?.max ?? 0) * (caps.height?.max ?? 0);
      const score = ("torch" in caps && caps.torch ? 1e9 : 0) + pixels;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    } catch {
      /* a lens that will not open cannot be the one we want */
    } finally {
      for (const track of stream?.getTracks() ?? []) {
        track.stop();
      }
    }
  }
  return best;
}

function storedLens(): number | null {
  try {
    const raw = localStorage.getItem(LENS_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function rememberLens(index: number): void {
  try {
    localStorage.setItem(LENS_KEY, String(index));
  } catch {
    /* the choice just does not survive the session */
  }
}

/* Telegram's Android WebView ignores <input capture> and always opens the gallery. */
export function CameraCapture({ onCapture, onPickGallery, onClose, busy }: CameraCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [backIds, setBackIds] = useState<string[]>([]);
  const [lens, setLens] = useState<number | null>(storedLens);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shooting, setShooting] = useState(false);

  useEffect(() => showBackButton(onClose), [onClose]);

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  const attach = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function open(): Promise<MediaStream> {
      let id: string | undefined;
      if (facing === "environment") {
        /* labels are only exposed once a stream has been granted, which the front camera
           already did by the time the user can flip */
        const ids = await backCameraIds();
        setBackIds(ids);
        let index = lens;
        if (index === null) {
          index = ids.length > 1 ? await pickMainLens(ids) : 0;
          rememberLens(index);
          setLens(index);
        }
        id = ids[Math.min(index, ids.length - 1)];
      }
      if (id) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: id } },
            audio: false,
          });
        } catch {
          /* the lens is gone: fall back to whatever the platform picks */
        }
      }
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
    }

    async function start() {
      setReady(false);
      try {
        const stream = await open();
        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        stop();
        await attach(stream);
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
  }, [facing, lens, attach, stop]);

  const mirrored = facing === "user";
  const lensCount = facing === "environment" ? backIds.length : 0;

  const flip = () => {
    setFacing((current) => (current === "user" ? "environment" : "user"));
  };

  const nextLens = () => {
    const next = ((lens ?? 0) + 1) % backIds.length;
    setLens(next);
    rememberLens(next);
  };

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !ready || shooting || busy) {
      return;
    }
    setShooting(true);
    hapticImpact("medium");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setShooting(false);
      return;
    }
    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      setShooting(false);
      return;
    }

    stop();
    onCapture(new File([blob], "checkin.jpg", { type: "image/jpeg" }));
  };

  const working = shooting || busy;

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
        data-mirrored={mirrored || undefined}
        playsInline
        muted
        autoPlay
      />

      {!ready && !failed && !working && (
        <div className={styles.state}>
          <Spinner />
        </div>
      )}

      {working && (
        <div className={styles.state}>
          <Spinner />
          <span className={styles.stateText}>{t.camera.processing}</span>
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

      {lensCount > 1 && !working && (
        <button type="button" className={styles.lens} onClick={nextLens} aria-label={t.camera.lens}>
          {t.camera.lensLabel((lens ?? 0) + 1, lensCount)}
        </button>
      )}

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
            disabled={!ready || working}
            aria-label={t.camera.shoot}
          >
            <span className={styles.shutterRing} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.side}
            onClick={flip}
            disabled={working}
            aria-label={t.camera.flip}
          >
            <IconCameraFlip size={20} />
          </button>
        </footer>
      )}
    </motion.div>,
    document.body,
  );
}
