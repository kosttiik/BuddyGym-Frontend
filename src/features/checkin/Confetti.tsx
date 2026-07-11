import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import styles from "./Confetti.module.css";

const COLORS = ["#3ed488", "#f4a261", "#5b8def", "#e76f81", "#b79ae0", "#27b56d"];
const COUNT = 90;
const DURATION_MS = 2600;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
};

/* Lightweight canvas confetti: transform-only work, one rAF loop, auto-stops. */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: width * (0.5 + (Math.random() - 0.5) * 0.6),
      y: height * 0.32,
      vx: (Math.random() - 0.5) * 7,
      vy: -(4 + Math.random() * 7),
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#3ed488",
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      const fade = Math.max(0, 1 - elapsed / DURATION_MS);
      for (const p of particles) {
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
