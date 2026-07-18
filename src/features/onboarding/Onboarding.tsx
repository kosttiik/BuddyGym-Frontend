import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/shared/i18n";
import { IconDumbbell, IconFire, IconSparkles } from "@/shared/icons";
import { cx } from "@/shared/lib/cx";
import { hapticNotify, hapticSelection } from "@/shared/lib/haptics";
import { ease, riseItem, spring, stagger } from "@/shared/lib/motion";
import { markOnboardingSeen } from "@/shared/lib/seenOnboarding";
import { Button } from "@/shared/ui";
import { MockCheckin, MockProfile, MockRooms } from "./mocks";
import styles from "./Onboarding.module.css";

export type OnboardingProps = {
  open: boolean;
  onClose: () => void;
};

export function Onboarding({ open, onClose }: OnboardingProps) {
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const seenUpTo = useRef(0);

  useEffect(() => {
    if (open) {
      setIndex(0);
      seenUpTo.current = 0;
    }
  }, [open]);

  seenUpTo.current = Math.max(seenUpTo.current, index);

  const slides: Array<{ key: string; title: string; body: string; art: ReactNode }> = [
    {
      key: "welcome",
      title: t.onboarding.welcomeTitle,
      body: t.onboarding.welcomeBody,
      art: <WelcomeArt />,
    },
    {
      key: "rooms",
      title: t.onboarding.roomsTitle,
      body: t.onboarding.roomsBody,
      art: <MockRooms />,
    },
    {
      key: "checkin",
      title: t.onboarding.checkinTitle,
      body: t.onboarding.checkinBody,
      art: <MockCheckin />,
    },
    {
      key: "profile",
      title: t.onboarding.profileTitle,
      body: t.onboarding.profileBody,
      art: <MockProfile />,
    },
  ];
  const last = index === slides.length - 1;

  const close = () => {
    markOnboardingSeen();
    onClose();
  };

  const goTo = (next: number) => {
    const clamped = Math.min(slides.length - 1, Math.max(0, next));
    if (clamped !== index) {
      hapticSelection();
      setIndex(clamped);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.layer}
          role="dialog"
          aria-modal="true"
          aria-label={t.onboarding.welcomeTitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.4, ease: ease.exit }}
        >
          <div className={styles.top}>
            <button
              type="button"
              className={cx(styles.skip, last && styles.skipHidden)}
              onClick={close}
              tabIndex={last ? -1 : 0}
            >
              {t.onboarding.skip}
            </button>
          </div>

          <div className={styles.viewport}>
            <motion.div
              className={styles.track}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                const dir =
                  info.offset.x < -60 || info.velocity.x < -400
                    ? 1
                    : info.offset.x > 60 || info.velocity.x > 400
                      ? -1
                      : 0;
                goTo(index + dir);
              }}
              animate={{ x: `${-index * 100}%` }}
              transition={reduce ? { duration: 0 } : spring.heavy}
            >
              {slides.map((slide, i) => (
                <motion.div
                  key={slide.key}
                  className={styles.slide}
                  variants={stagger(0.09)}
                  initial="hidden"
                  animate={i <= seenUpTo.current ? "visible" : "hidden"}
                >
                  <motion.div className={styles.art} variants={riseItem}>
                    {slide.art}
                  </motion.div>
                  <motion.h2 className={styles.title} variants={riseItem}>
                    {slide.title}
                  </motion.h2>
                  <motion.p className={styles.body} variants={riseItem}>
                    {slide.body}
                  </motion.p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className={styles.dots} aria-hidden="true">
            {slides.map((slide, i) => (
              <motion.span
                key={slide.key}
                className={styles.dot}
                animate={{ scale: i === index ? 1.55 : 1, opacity: i === index ? 1 : 0.35 }}
                transition={reduce ? { duration: 0 } : spring.snappy}
              />
            ))}
          </div>

          <Button
            block
            onClick={() => {
              if (last) {
                hapticNotify("success");
                close();
              } else {
                goTo(index + 1);
              }
            }}
          >
            {last ? t.onboarding.start : t.onboarding.next}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Floating({
  className,
  duration,
  delay = 0,
  children,
}: {
  className?: string;
  duration: number;
  delay?: number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={className}
      animate={reduce ? undefined : { y: [0, -7, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}

function WelcomeArt() {
  return (
    <div className={styles.welcomeArt} aria-hidden="true">
      <Floating className={styles.welcomeTile} duration={3.4}>
        <IconDumbbell size={52} />
      </Floating>
      <Floating className={cx(styles.welcomeMini, styles.welcomeFire)} duration={2.8} delay={0.4}>
        <IconFire size={22} />
      </Floating>
      <Floating className={cx(styles.welcomeMini, styles.welcomeSpark)} duration={3.1} delay={0.9}>
        <IconSparkles size={22} />
      </Floating>
    </div>
  );
}
