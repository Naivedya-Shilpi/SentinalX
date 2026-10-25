import type { ReactNode } from 'react';
import { METRICS } from '@/data/metrics';
import { fmtPct, fmtScore } from '@/utils/format';
import type { MetricKey, MetricValue } from '@/types';

export interface TipRow {
  color?: string;
  label: string;
  value: MetricValue;
  note?: string;
}

/** Shared chart tooltip: model, dataset, exact score, percentage form and a metric explanation. */
export function ChartTip({
  title,
  subtitle,
  rows,
  metric,
  extra,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  rows: TipRow[];
  metric?: MetricKey;
  extra?: ReactNode;
}) {
  return (
    <div className="max-w-[280px] rounded-xl border border-line/20 bg-surface-2/95 px-3.5 py-3 text-xs shadow-2xl backdrop-blur-xl">
      <p className="text-[13px] font-semibold text-fg">{title}</p>
      {subtitle && <p className="mt-0.5 text-subtle">{subtitle}</p>}
      <div className="mt-2 space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className="num text-fg">
              {fmtScore(r.value)} <span className="text-subtle">· {fmtPct(r.value)}</span>
            </span>
          </div>
        ))}
      </div>
      {extra}
      {metric && <p className="mt-2 border-t border-line/10 pt-2 leading-relaxed text-subtle">{METRICS[metric].description}</p>}
    </div>
  );
}
