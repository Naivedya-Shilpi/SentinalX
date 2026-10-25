import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: 'cyan' | 'violet';
}

/** Lightweight decorative canvas animation. Purely abstract — not connected to any data. */
export function NetworkBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let nodes: Node[] = [];
    let last = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COLORS = { cyan: '34,211,238', violet: '139,92,246' };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(18, Math.min(52, Math.round((w * h) / 14000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.2 + Math.random() * 1.8,
        hue: i % 3 === 0 ? 'violet' : 'cyan',
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const maxD = Math.min(150, w / 5);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxD) {
            const alpha = (1 - d / maxD) * 0.22;
            ctx.strokeStyle = `rgba(${COLORS[a.hue]},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            // slow data particle travelling along the connection
            if ((i + j) % 4 === 0) {
              const p = ((t / 4200 + (i * 7 + j) * 0.137) % 1 + 1) % 1;
              ctx.fillStyle = `rgba(${COLORS[b.hue]},${alpha * 3.2})`;
              ctx.beginPath();
              ctx.arc(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      for (const n of nodes) {
        const pulse = 0.65 + 0.35 * Math.sin(t / 1500 + n.x);
        ctx.fillStyle = `rgba(${COLORS[n.hue]},${0.55 * pulse + 0.2})`;
        ctx.shadowColor = `rgba(${COLORS[n.hue]},0.8)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (!visible || t - last < 33) return; // ~30fps cap
      last = t;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      draw(t);
    };

    resize();
    draw(0);
    const ro = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    if (!reduce) raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
