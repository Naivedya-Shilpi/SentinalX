import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Database, FlaskConical, CircleOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { METRICS, METRIC_KEYS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { modelColor, modelShort } from '@/data/models';
import type { DataSource, MetricKey } from '@/types';
import { Segmented } from '@/components/ui/Segmented';
import { InfoTip } from '@/components/ui/InfoTip';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/format';

/* ---------------- Data source badges ---------------- */
export function SourceBadge({ source, label }: { source: DataSource | null; label?: string }) {
  if (source === 'demo')
    return (
      <Badge tone="amber" title="Built-in demonstration data from the project experiments">
        <FlaskConical className="h-3 w-3" /> {label ? `${label}: ` : ''}Demo data
      </Badge>
    );
  if (source === 'imported')
    return (
      <Badge tone="emerald" title="Data imported from your own files">
        <Database className="h-3 w-3" /> {label ? `${label}: ` : ''}Imported
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <CircleOff className="h-3 w-3" /> {label ? `${label}: ` : ''}Not loaded
    </Badge>
  );
}

/** Shows the source of the benchmark data driving the current view. */
export function ActiveSource({ kind = 'benchmarks' }: { kind?: 'benchmarks' | 'confusion' | 'metadata' }) {
  const a = useAppStore((s) => s[kind]);
  return <SourceBadge source={a.source} />;
}

/* ---------------- Page header ---------------- */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="label-xs mb-2 text-cyan/90">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

/* ---------------- Dataset switcher ---------------- */
export function DatasetSwitcher({ size = 'md', allowBoth = true }: { size?: 'sm' | 'md'; allowBoth?: boolean }) {
  const { datasets } = useBenchmarkData();
  const view = useAppStore((s) => s.datasetView);
  const setView = useAppStore((s) => s.setDatasetView);
  if (datasets.length === 0) return null;
  const options = [
    ...datasets.map((d) => ({
      value: d,
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: datasetColor(d) }} />
          {d}
        </span>
      ),
    })),
    ...(allowBoth && datasets.length > 1 ? [{ value: 'both', label: datasets.length === 2 ? 'Compare Both' : 'Compare All' }] : []),
  ];
  const current = options.some((o) => o.value === view) ? view : options[options.length - 1].value;
  return <Segmented ariaLabel="Dataset" size={size} value={current} onChange={setView} options={options} />;
}

/** Local single-dataset picker (for pages that compare within one dataset). */
export function DatasetPicker({ value, onChange, datasets, size = 'md' }: { value: string; onChange: (d: string) => void; datasets: string[]; size?: 'sm' | 'md' }) {
  return (
    <Segmented
      ariaLabel="Dataset"
      size={size}
      value={value}
      onChange={onChange}
      options={datasets.map((d) => ({
        value: d,
        label: (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: datasetColor(d) }} />
            {d}
          </span>
        ),
      }))}
    />
  );
}

/* ---------------- Metric select ---------------- */
export function MetricSelect({
  value,
  onChange,
  metrics = METRIC_KEYS,
  id,
  label = 'Rank by',
}: {
  value: MetricKey;
  onChange: (m: MetricKey) => void;
  metrics?: MetricKey[];
  id: string;
  label?: string;
}) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 text-[13px] text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <select id={id} className="select-native" value={value} onChange={(e) => onChange(e.target.value as MetricKey)}>
        {metrics.map((m) => (
          <option key={m} value={m}>
            {METRICS[m].label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GlobalMetricSelect({ id = 'global-metric' }: { id?: string }) {
  const metric = useAppStore((s) => s.rankingMetric);
  const set = useAppStore((s) => s.setRankingMetric);
  return <MetricSelect id={id} value={metric} onChange={set} />;
}

/* ---------------- Metric label with tooltip ---------------- */
export function MetricLabel({ metric, className, short }: { metric: MetricKey; className?: string; short?: boolean }) {
  const m = METRICS[metric];
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {short ? m.short : m.label}
      <InfoTip
        label={`About ${m.label}`}
        content={
          <>
            <span className="block font-semibold">{m.label}</span>
            <span className="mt-1 block text-muted">{m.description}</span>
            <span className="num mt-1.5 block text-[11px] text-cyan">{m.formula}</span>
          </>
        }
      />
    </span>
  );
}

/* ---------------- Model chips ---------------- */
export function ModelDot({ model, className }: { model: string; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: modelColor(model) }} />;
}

export function ModelFilter({ className }: { className?: string }) {
  const { models, shownModels } = useBenchmarkData();
  const visible = useAppStore((s) => s.visibleModels);
  const toggle = useAppStore((s) => s.toggleModel);
  const setVisible = useAppStore((s) => s.setVisibleModels);
  if (!models.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="group" aria-label="Filter models">
      {models.map((m) => {
        const on = shownModels.includes(m);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(m, models)}
            title={on ? `Hide ${m}` : `Show ${m}`}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all',
              on ? 'border-line/20 bg-surface-2 text-fg' : 'border-line/10 bg-transparent text-subtle line-through decoration-subtle/60',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? modelColor(m) : 'rgb(var(--neutral))' }} />
            <span className="hidden sm:inline">{m}</span>
            <span className="sm:hidden">{modelShort(m)}</span>
          </button>
        );
      })}
      {visible.length > 0 && (
        <button type="button" onClick={() => setVisible([])} className="ml-1 text-xs text-cyan hover:underline">
          Show all
        </button>
      )}
    </div>
  );
}

/** Multi-select used by the comparison page (independent from the global filter). */
export function ModelPicker({ models, selected, onChange, min = 1 }: { models: string[]; selected: string[]; onChange: (m: string[]) => void; min?: number }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Select models to compare">
      {models.map((m) => {
        const on = selected.includes(m);
        const disabled = on && selected.length <= min;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            title={disabled ? `Select at least ${min} models` : undefined}
            onClick={() => onChange(on ? selected.filter((x) => x !== m) : [...selected, m])}
            className={cn(
              'group inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-all disabled:cursor-not-allowed',
              on ? 'border-transparent text-fg' : 'border-line/10 text-muted hover:border-line/25 hover:text-fg',
            )}
            style={on ? { background: `${modelColor(m)}1f`, boxShadow: `inset 0 0 0 1px ${modelColor(m)}66` } : undefined}
          >
            <span
              className={cn('grid h-4 w-4 place-items-center rounded border text-[10px] transition-colors', on ? 'border-transparent' : 'border-line/30')}
              style={on ? { background: modelColor(m), color: '#04121a' } : undefined}
            >
              {on ? '✓' : ''}
            </span>
            {m}
          </button>
        );
      })}
    </div>
  );
}
