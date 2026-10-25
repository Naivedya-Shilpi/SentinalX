import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { BenchmarkRow, MetricKey } from '@/types';
import { METRICS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { modelColor, modelOrder } from '@/data/models';
import { useChartTheme } from '@/hooks/useVisuals';
import { fmtPct } from '@/utils/format';
import { isValidMetric } from '@/utils/metrics';
import { bestEntries } from '@/utils/ranking';
import { ChartTip } from './ChartTip';

const num = (v: number | null | undefined) => (isValidMetric(v) ? v : undefined);

/* ------------------------------------------------------------------ */
/* Horizontal grouped bars: one metric, one bar per dataset per model  */
/* ------------------------------------------------------------------ */
export function HorizontalModelBars({
  rows,
  datasets,
  metric,
  sort = 'metric',
  height,
  domain = [0, 1],
}: {
  rows: BenchmarkRow[];
  datasets: string[];
  metric: MetricKey;
  sort?: 'metric' | 'name';
  height?: number;
  domain?: [number, number];
}) {
  const t = useChartTheme();
  const { data, best } = useMemo(() => {
    const models = [...new Set(rows.map((r) => r.model))];
    const data = models.map((model) => {
      const rec: Record<string, string | number | undefined> = { model };
      for (const d of datasets) rec[d] = num(rows.find((r) => r.model === model && r.dataset === d)?.metrics[metric]);
      return rec;
    });
    const lead = datasets[0];
    data.sort((a, b) => {
      if (sort === 'name') return modelOrder(a.model as string) - modelOrder(b.model as string);
      // Rank by the first active dataset, then by the best available value.
      const va = (a[lead] as number | undefined) ?? Math.max(...datasets.map((d) => (a[d] as number | undefined) ?? -1));
      const vb = (b[lead] as number | undefined) ?? Math.max(...datasets.map((d) => (b[d] as number | undefined) ?? -1));
      return vb - va;
    });
    const best = new Map(datasets.map((d) => [d, new Set(bestEntries(rows, d, metric).map((e) => e.row.model))]));
    return { data, best };
  }, [rows, datasets, metric, sort]);

  const h = height ?? Math.max(240, data.length * (datasets.length * 22 + 26) + 50);
  return (
    <div style={{ height: h }} role="img" aria-label={`${METRICS[metric].label} by model and dataset`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }} barGap={3} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke={t.grid} />
          <XAxis type="number" domain={domain} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke={t.axis} tick={{ fill: t.text, fontSize: 11 }} />
          <YAxis type="category" dataKey="model" width={150} stroke={t.axis} tick={{ fill: t.text, fontSize: 12 }} tickLine={false} />
          <Tooltip
            cursor={{ fill: t.cursor }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTip
                  title={label as string}
                  metric={metric}
                  subtitle={METRICS[metric].label}
                  rows={payload.map((p) => ({ color: p.color as string, label: p.name as string, value: (p.value as number) ?? null }))}
                />
              );
            }}
          />
          {datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: t.text }} iconType="circle" />}
          {datasets.map((d, i) => (
            <Bar key={d} dataKey={d} name={d} radius={[0, 5, 5, 0]} animationDuration={700} fill={datasetColor(d, i)}>
              {data.map((row) => {
                const isBest = best.get(d)?.has(row.model as string);
                return <Cell key={row.model as string} fill={datasetColor(d, i)} fillOpacity={isBest ? 1 : 0.55} stroke={isBest ? t.emerald : 'none'} strokeWidth={isBest ? 2 : 0} />;
              })}
              <LabelList dataKey={d} position="right" formatter={(v: number) => fmtPct(v, 1)} style={{ fill: t.text, fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace' }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical grouped bars: several metrics per model (single dataset)   */
/* ------------------------------------------------------------------ */
export function MetricGroupBars({ rows, metrics, height = 320 }: { rows: BenchmarkRow[]; metrics: MetricKey[]; height?: number }) {
  const t = useChartTheme();
  const palette: Record<string, string> = { attackPrecision: t.amber, attackRecall: t.coral, attackF1: t.cyan, accuracy: t.violet, aucRoc: t.emerald, weightedPrecision: '#60A5FA', weightedRecall: '#A78BFA', weightedF1: '#34D399' };
  const data = rows
    .slice()
    .sort((a, b) => modelOrder(a.model) - modelOrder(b.model))
    .map((r) => ({ model: r.model, ...Object.fromEntries(metrics.map((m) => [m, num(r.metrics[m])])) }));

  return (
    <div style={{ height }} role="img" aria-label="Grouped metric comparison by model">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 8, bottom: 4, left: -8 }} barGap={3} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="model" stroke={t.axis} tick={{ fill: t.text, fontSize: 11 }} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 14 ? v.replace('Gradient-Boosted Trees', 'GBT').replace('Logistic Regression', 'Log. Reg.') : v)} />
          <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke={t.axis} tick={{ fill: t.text, fontSize: 11 }} tickLine={false} />
          <Tooltip
            cursor={{ fill: t.cursor }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTip title={label as string} rows={payload.map((p) => ({ color: p.color as string, label: METRICS[p.dataKey as MetricKey].label, value: (p.value as number) ?? null }))} />
              ) : null
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" formatter={(v: string) => <span style={{ color: t.text }}>{METRICS[v as MetricKey].label}</span>} />
          {metrics.map((m) => (
            <Bar key={m} dataKey={m} name={m} fill={palette[m]} radius={[4, 4, 0, 0]} animationDuration={700} maxBarSize={28}>
              {metrics.length <= 3 && <LabelList dataKey={m} position="top" formatter={(v: number) => (v == null ? '' : (v * 100).toFixed(0))} style={{ fill: t.text, fontSize: 10, fontFamily: 'JetBrains Mono Variable, monospace' }} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar (0–100% fixed scale)                                          */
/* ------------------------------------------------------------------ */
export function RadarCompare({ rows, metrics, height = 340, labelDataset }: { rows: BenchmarkRow[]; metrics: MetricKey[]; height?: number; labelDataset?: boolean }) {
  const t = useChartTheme();
  const data = metrics.map((m) => {
    const rec: Record<string, string | number | undefined> = { metric: METRICS[m].label };
    rows.forEach((r) => (rec[r.id] = isValidMetric(r.metrics[m]) ? r.metrics[m]! * 100 : undefined));
    return rec;
  });
  return (
    <div style={{ height }} role="img" aria-label="Radar comparison of selected models">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={t.grid} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: t.text, fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={{ fill: t.text, fontSize: 9 }} axisLine={false} tickFormatter={(v) => `${v}%`} />
          {rows.map((r, i) => (
            <Radar key={r.id} name={labelDataset ? `${r.model} · ${r.dataset}` : r.model} dataKey={r.id} stroke={modelColor(r.model, i)} fill={modelColor(r.model, i)} fillOpacity={0.16} strokeWidth={2} animationDuration={700} />
          ))}
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" formatter={(v: string) => <span style={{ color: t.text }}>{v}</span>} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTip
                  title={label as string}
                  rows={payload.map((p) => ({ color: p.color as string, label: p.name as string, value: p.value == null ? null : (p.value as number) / 100 }))}
                />
              ) : null
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scatter: one point per model                                        */
/* ------------------------------------------------------------------ */
export function ModelScatter({ rows, x, y, height = 320 }: { rows: BenchmarkRow[]; x: MetricKey; y: MetricKey; height?: number }) {
  const t = useChartTheme();
  const pts = rows.filter((r) => isValidMetric(r.metrics[x]) && isValidMetric(r.metrics[y]));
  const skipped = rows.length - pts.length;
  const xs = pts.map((r) => r.metrics[x]!);
  const ys = pts.map((r) => r.metrics[y]!);
  const pad = (a: number[]) => {
    if (!a.length) return [0, 1] as [number, number];
    const lo = Math.min(...a);
    const hi = Math.max(...a);
    const p = Math.max((hi - lo) * 0.25, 0.03);
    return [Math.max(0, Math.floor((lo - p) * 50) / 50), Math.min(1, Math.ceil((hi + p) * 50) / 50)] as [number, number];
  };
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${METRICS[y].label} versus ${METRICS[x].label}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={t.grid} />
            <XAxis type="number" dataKey="x" domain={pad(xs)} name={METRICS[x].label} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke={t.axis} tick={{ fill: t.text, fontSize: 11 }} label={{ value: METRICS[x].label, position: 'bottom', offset: 6, fill: t.text, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" domain={pad(ys)} name={METRICS[y].label} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke={t.axis} tick={{ fill: t.text, fontSize: 11 }} label={{ value: METRICS[y].label, angle: -90, position: 'insideLeft', fill: t.text, fontSize: 12, dx: 4 }} />
            <ZAxis range={[160, 160]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: t.axis }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { row: BenchmarkRow } | undefined;
                if (!active || !p) return null;
                const r = p.row;
                return (
                  <ChartTip
                    title={r.model}
                    subtitle={r.dataset}
                    rows={[
                      { label: METRICS[x].label, value: r.metrics[x] },
                      { label: METRICS[y].label, value: r.metrics[y] },
                      { label: 'Accuracy', value: r.metrics.accuracy },
                      { label: 'Attack F1', value: r.metrics.attackF1 },
                    ]}
                  />
                );
              }}
            />
            <Scatter data={pts.map((r) => ({ x: r.metrics[x], y: r.metrics[y], row: r }))} animationDuration={700}>
              {pts.map((r, i) => (
                <Cell key={r.id} fill={modelColor(r.model, i)} stroke={datasetColor(r.dataset)} strokeWidth={2} fillOpacity={0.9} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-2 text-xs text-muted">
        {pts.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: modelColor(r.model, i) }} />
            {r.model}
            {new Set(rows.map((x) => x.dataset)).size > 1 && <span className="text-subtle">({r.dataset})</span>}
            <span className="num text-subtle">
              {fmtPct(r.metrics[x], 1)} / {fmtPct(r.metrics[y], 1)}
            </span>
          </span>
        ))}
      </div>
      {skipped > 0 && <p className="mt-2 px-2 text-xs text-amber">{skipped} model(s) omitted because a required metric is missing.</p>}
    </div>
  );
}
