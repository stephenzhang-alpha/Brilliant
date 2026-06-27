import { useEffect, useRef } from 'react';

interface ConfettiProps {
  /**
   * Fires a fresh burst whenever this changes to a new, non-empty value.
   * Pass the milestone you want to celebrate (e.g. a rank index or unlock id);
   * null / '' mean "idle". 0 is a real value (e.g. stage/rank index 0) and fires.
   */
  token: string | number | null;
  /** Particle colors; defaults to the brand palette. */
  colors?: string[];
  /** Particles per burst. */
  count?: number;
  /** Burst origin as viewport fractions (0..1). Default: upper-center. */
  origin?: { x: number; y: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  shape: number;
  life: number;
  ttl: number;
}

const DEFAULT_COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#22c55e', '#f59e0b', '#fb5b6b'];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A dependency-free, full-viewport confetti burst painted on a single <canvas>.
 * Celebrate by changing `token` to a new value; particles fan upward, fall under
 * gravity, fade, and the loop stops once the field is empty. Honors
 * prefers-reduced-motion by doing nothing.
 */
export function Confetti({ token, colors = DEFAULT_COLORS, count = 90, origin }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const prevTokenRef = useRef<string | number | null>(null);

  useEffect(() => {
    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    // Idle = null / '' only. 0 is a valid token (stage/rank index 0) and must be
    // able to fire; fire only when the token CHANGES to a non-idle value.
    if (token === null || token === '' || token === prev) return;
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);

    const o = origin ?? { x: 0.5, y: 0.26 };
    const ox = vw * o.x;
    const oy = vh * o.y;

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
      const speed = 5 + Math.random() * 9;
      particlesRef.current.push({
        x: ox + (Math.random() - 0.5) * 80,
        y: oy + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 7,
        color: colors[(Math.random() * colors.length) | 0],
        shape: (Math.random() * 3) | 0,
        life: 0,
        ttl: 90 + Math.random() * 70,
      });
    }

    if (runningRef.current) return;
    runningRef.current = true;

    const gravity = 0.32;
    const drag = 0.992;
    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += 1;
        const fade = Math.max(0, 1 - p.life / p.ttl);
        if (fade <= 0 || p.y > vh + 60) {
          ps.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        } else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (ps.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
        ctx.clearRect(0, 0, vw, vh);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [token, colors, count, origin]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
