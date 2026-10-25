import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MetricValue } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 0.82031 → "82.03%"; null → "—" */
export function fmtPct(v: MetricValue | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

/** 0.82031 → "0.8203" */
export function fmtScore(v: MetricValue | undefined, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

/** Percentage-point difference between two 0–1 metrics: +1.59 pp */
export function fmtPP(delta: number | null, digits = 2): string {
  if (delta == null || !Number.isFinite(delta)) return '—';
  const pp = delta * 100;
  const sign = pp > 0 ? '+' : pp < 0 ? '−' : '±';
  return `${sign}${Math.abs(pp).toFixed(digits)} pp`;
}

export function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US');
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Joins ["A","B","C"] → "A, B and C" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function rowId(dataset: string, model: string): string {
  return `${slug(dataset)}::${slug(model)}`;
}
