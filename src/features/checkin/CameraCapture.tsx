import { AnimatePresence, motion } from "motion/react";
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

/* Capabilities (torch, sensor size) would name the main lens, but reading them means opening
   every lens, and Telegram's WebView asks for the camera permission on each getUserMedia. One
   stream, one prompt: the first back stream is whatever the platform picks, and the lens
   button lets the user correct it once; the choice is then remembered. */
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
  /* the stream is opened from refs, so learning which lens is running does not reopen it:
     every getUserMedia call costs another permission prompt inside Telegram */
  const backIdsRef = useRef<string[]>([]);
  const lensRef = useRef<number | null>(lens);
  const [reopen, setReopen] = useState(0);
  const [lensHint, setLensHint] = useState(false);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reopen restarts the stream on a lens switch
  useEffect(() => {
    let cancelled = false;

    async function open(): Promise<MediaStream> {
      const id = facing === "environment" ? backIdsRef.current[lensRef.current ?? -1] : undefined;
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

        if (facing === "environment") {
          /* device labels only exist once a stream was granted, so the lens list is built
             from the running stream, and the lens in use is looked up in it */
          const ids = await backCameraIds();
          if (cancelled) {
            return;
          }
          backIdsRef.current = ids;
          setBackIds(ids);
          if (lensRef.current === null) {
            const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
            const index = current ? ids.indexOf(current) : -1;
            lensRef.current = index < 0 ? 0 : index;
            setLens(lensRef.current);
          }
        }
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
  }, [facing, reopen, attach, stop]);

  const mirrored = facing === "user";
  const lensCount = facing === "environment" ? backIds.length : 0;

  /* the hint says the lens may be the wrong one; it has done its job after a few seconds */
  useEffect(() => {
    if (lensCount < 2) {
      return;
    }
    setLensHint(true);
    const timer = setTimeout(() => setLensHint(false), 5000);
    return () => clearTimeout(timer);
  }, [lensCount]);

  const flip = () => {
    setFacing((current) => (current === "user" ? "environment" : "user"));
  };

  const nextLens = () => {
    const next = ((lensRef.current ?? 0) + 1) % backIds.length;
    lensRef.current = next;
    setLens(next);
    rememberLens(next);
    setLensHint(false);
    setReopen((n) => n + 1);
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
        <div className={styles.lensBox}>
          <AnimatePresence>
            {lensHint && (
              <motion.span
                className={styles.lensHint}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                {t.camera.lensHint}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            className={styles.lens}
            onClick={nextLens}
            aria-label={t.camera.lens}
          >
            {t.camera.lensLabel((lens ?? 0) + 1, lensCount)}
          </button>
        </div>
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
