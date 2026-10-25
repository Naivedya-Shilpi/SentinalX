import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

export interface ChartTheme {
  grid: string;
  axis: string;
  text: string;
  cursor: string;
  emerald: string;
  coral: string;
  amber: string;
  cyan: string;
  violet: string;
  neutral: string;
}

export function useChartTheme(): ChartTheme {
  const theme = useAppStore((s) => s.theme);
  return theme === 'light'
    ? {
        grid: 'rgba(15,23,42,0.08)',
        axis: 'rgba(15,23,42,0.18)',
        text: '#475569',
        cursor: 'rgba(15,23,42,0.05)',
        emerald: '#059669',
        coral: '#E11D48',
        amber: '#D97706',
        cyan: '#0891B2',
        violet: '#7C3AED',
        neutral: '#94A3B8',
      }
    : {
        grid: 'rgba(148,163,184,0.08)',
        axis: 'rgba(148,163,184,0.18)',
        text: '#94A3B8',
        cursor: 'rgba(148,163,184,0.06)',
        emerald: '#10B981',
        coral: '#FB7185',
        amber: '#FBBF24',
        cyan: '#22D3EE',
        violet: '#8B5CF6',
        neutral: '#64748B',
      };
}

/** Animated number counter that respects prefers-reduced-motion. */
export function useCountUp(target: number | null, duration = 1.1): number | null {
  const reduce = useReducedMotion();
  const [value, setValue] = useState<number | null>(target);
  const prev = useRef<number>(0);

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) {
      setValue(null);
      return;
    }
    if (reduce) {
      setValue(target);
      prev.current = target;
      return;
    }
    const controls = animate(prev.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    prev.current = target;
    return () => controls.stop();
  }, [target, duration, reduce]);

  return value;
}

/** Applies the theme class to <html>. */
export function useThemeClass() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#070B14' : '#F4F6FB');
  }, [theme]);
}
