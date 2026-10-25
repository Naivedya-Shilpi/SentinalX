/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        'bg-2': token('bg-2'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        fg: token('fg'),
        muted: token('muted'),
        subtle: token('subtle'),
        cyan: token('cyan'),
        blue: token('blue'),
        violet: token('violet'),
        emerald: token('emerald'),
        coral: token('coral'),
        amber: token('amber'),
        neutral: token('neutral'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 32px -12px rgb(0 0 0 / 0.45)',
        glow: '0 0 0 1px rgb(var(--cyan) / 0.35), 0 0 32px -6px rgb(var(--cyan) / 0.45)',
        'glow-emerald': '0 0 0 1px rgb(var(--emerald) / 0.4), 0 0 32px -6px rgb(var(--emerald) / 0.45)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'flow-y': { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(300%)' } },
        'flow-x': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(300%)' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.7' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'flow-y': 'flow-y 2.4s linear infinite',
        'flow-x': 'flow-x 2.4s linear infinite',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.2,0.6,0.3,1) infinite',
      },
    },
  },
  plugins: [],
};
