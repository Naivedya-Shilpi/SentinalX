import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, Minus, Sparkles, Swords } from 'lucide-react';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useAppStore } from '@/store/useAppStore';
import { CORE_METRICS, METRICS } from '@/data/metrics';
import { getModelInfo, modelColor } from '@/data/models';
import type { BenchmarkRow } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Callout, EmptyState } from '@/components/ui/Feedback';
import { ActiveSource, DatasetPicker, GlobalMetricSelect, MetricLabel, ModelPicker, PageHeader } from '@/components/common/Controls';
import { NoDataState } from '@/components/common/Misc';
import { MetricGroupBars, ModelScatter, RadarCompare } from '@/components/charts/Charts';
import { rankOf } from '@/utils/ranking';
import { diffRows, headToHeadSummary } from '@/utils/insights';
import { cn, fmtPct, fmtPP } from '@/utils/format';

const DEFAULT_PICK = ['Gradient-Boosted Trees', 'Random Forest'];

export default function Comparison() {
  const { datasets, rows, hasData } = useBenchmarkData();
  const rankingMetric = useAppStore((s) => s.rankingMetric);
  const globalView = useAppStore((s) => s.datasetView);

  const [dsState, setDs] = useState('');
  const ds = datasets.includes(dsState) ? dsState : datasets.includes(globalView) ? globalView : datasets[0] ?? '';
  const dsRows = useMemo(() => rows.filter((r) => r.dataset === ds), [rows, ds]);
  const available = useMemo(() => dsRows.map((r) => r.model), [dsRows]);

  const [picked, setPicked] = useState<string[]>(DEFAULT_PICK);
  const selected = picked.filter((m) => available.includes(m));
  const effective = selected.length >= 2 ? selected : available.slice(0, Math.min(2, available.length));
  useEffect(() => {
    if (selected.length < 2 && available.length >= 2) setPicked(available.slice(0, 2));
  }, [selected.length, available]);

  const selRows = effective.map((m) => dsRows.find((r) => r.model === m)).filter((r): r is BenchmarkRow => !!r);

  const [hhA, setHhA] = useState('');
  const [hhB, setHhB] = useState('');
  const a = effective.includes(hhA) ? hhA : effective[0];
  const b = effective.includes(hhB) && hhB !== a ? hhB : effective.find((m) => m !== a);
  const rowA = selRows.find((r) => r.model === a);
  const rowB = selRows.find((r) => r.model === b);
  const diffs = rowA && rowB ? diffRows(rowA, rowB) : [];
  const summary = rowA && rowB ? headToHeadSummary(rowA, rowB) : [];

  if (!hasData) return <NoDataState />;
  if (available.length < 2)
    return (
      <div className="space-y-6">
        <PageHeader title="Model Comparison" />
        <Card>
          <EmptyState icon={<GitCompare className="h-5 w-5" />} title="At least two models are needed" description={`Only ${available.length} model(s) found for ${ds || 'the loaded data'}. Import a benchmark file with more models to compare.`} />
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Side by side"
        title="Model Comparison"
        description="Select two or more models on one dataset. Comparisons are always within a single dataset because feature schemas and class balance differ."
        actions={
          <>
            <ActiveSource />
            <GlobalMetricSelect id="cmp-metric" />
          </>
        }
      />

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-xs">Dataset</span>
          <DatasetPicker value={ds} onChange={setDs} datasets={datasets} />
        </div>
        <div>
          <p className="label-xs mb-2">Models ({effective.length} selected)</p>
          <ModelPicker models={available} selected={effective} onChange={setPicked} min={2} />
        </div>
      </Card>

      {/* Side-by-side cards */}
      <section aria-label="Selected models" className={cn('grid gap-4 md:grid-cols-2', effective.length >= 3 && 'xl:grid-cols-3', effective.length >= 4 && '2xl:grid-cols-4')}>
        {selRows.map((r, i) => {
          const rk = rankOf(rows, r, rankingMetric);
          const color = modelColor(r.model, i);
          return (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.04 }}>
              <Card className="h-full p-5" style={{ boxShadow: `0 0 0 1px ${color}55, 0 0 36px -10px ${color}88` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} /> {r.model}
                    </h3>
                    <p className="mt-0.5 text-xs text-subtle">{getModelInfo(r.model)?.family ?? 'Classifier'}</p>
                  </div>
                  <Badge tone={rk?.rank === 1 ? 'emerald' : 'neutral'}>{rk ? `${rk.tied ? 'T-' : '#'}${rk.rank} of ${rk.of}` : 'Not ranked'}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-subtle">Rank by {METRICS[rankingMetric].label}</p>
                <dl className="mt-4 space-y-2 text-[13px]">
                  {CORE_METRICS.map((m) => {
                    const best = rankOf(rows, r, m)?.rank === 1;
                    return (
                      <div key={m} className="flex items-center justify-between">
                        <dt className="text-muted"><MetricLabel metric={m} /></dt>
                        <dd className={cn('num font-medium', best && 'text-emerald')}>
                          {fmtPct(r.metrics[m])}
                          {best && <span className="ml-1" title="Best on this dataset">★</span>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Card>
            </motion.div>
          );
        })}
      </section>

      {/* Head to head */}
      <Card>
        <CardHeader
          as="h2"
          icon={<Swords className="h-4 w-4" />}
          title="Head-to-head"
          subtitle="Differences are percentage points (pp): A − B on the 0–100% scale, not relative change."
          actions={
            <>
              <label className="sr-only" htmlFor="hh-a">Model A</label>
              <select id="hh-a" className="select-native" value={a} onChange={(e) => setHhA(e.target.value)}>
                {effective.map((m) => <option key={m} value={m} disabled={m === b}>{m}</option>)}
              </select>
              <span className="text-xs text-subtle">vs</span>
              <label className="sr-only" htmlFor="hh-b">Model B</label>
              <select id="hh-b" className="select-native" value={b} onChange={(e) => setHhB(e.target.value)}>
                {effective.map((m) => <option key={m} value={m} disabled={m === a}>{m}</option>)}
              </select>
            </>
          }
        />
        <CardBody>
          {rowA && rowB ? (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-[13px]">
                  <thead>
                    <tr className="text-left text-xs text-subtle">
                      <th className="pb-2 font-medium">Metric</th>
                      <th className="pb-2 text-right font-medium" style={{ color: modelColor(rowA.model) }}>{rowA.model}</th>
                      <th className="pb-2 text-right font-medium" style={{ color: modelColor(rowB.model, 1) }}>{rowB.model}</th>
                      <th className="pb-2 text-right font-medium">Δ (A − B)</th>
                      <th className="pb-2 pl-4 font-medium">Better</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d) => (
                      <tr key={d.metric} className="border-t border-line/10">
                        <td className="py-2.5 text-muted"><MetricLabel metric={d.metric} /></td>
                        <td className={cn('num py-2.5 text-right', d.winner === 'a' && 'font-semibold text-emerald')}>{fmtPct(d.a)}</td>
                        <td className={cn('num py-2.5 text-right', d.winner === 'b' && 'font-semibold text-emerald')}>{fmtPct(d.b)}</td>
                        <td className={cn('num py-2.5 text-right', d.delta == null ? 'text-neutral' : d.delta > 0 ? 'text-cyan' : d.delta < 0 ? 'text-violet' : 'text-muted')}>{fmtPP(d.delta)}</td>
                        <td className="py-2.5 pl-4 text-xs">
                          {d.winner === 'a' ? <Badge tone="emerald">{rowA.model}</Badge> : d.winner === 'b' ? <Badge tone="emerald">{rowB.model}</Badge> : d.winner === 'tie' ? <span className="inline-flex items-center gap-1 text-muted"><Minus className="h-3 w-3" /> Tie</span> : <span className="text-neutral">Missing data</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-cyan/15 bg-cyan/[0.04] p-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="h-4 w-4 text-cyan" /> Comparison summary</p>
                <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
                  {summary.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                <p className="mt-3 text-[11px] text-subtle">Generated by deterministic rules from the metric values — no language model involved.</p>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader as="h2" title="Grouped performance" subtitle="Headline metrics for each selected model" />
          <CardBody><MetricGroupBars rows={selRows} metrics={CORE_METRICS} height={340} /></CardBody>
        </Card>
        <Card>
          <CardHeader as="h2" title="Radar comparison" subtitle="Fixed 0–100% scale · supplementary to the exact values above" />
          <CardBody><RadarCompare rows={selRows} metrics={CORE_METRICS} height={340} /></CardBody>
        </Card>
        <Card>
          <CardHeader as="h2" title="Precision vs recall" subtitle="X: attack recall (attacks caught) · Y: attack precision (alert quality). Top-right is best." />
          <CardBody><ModelScatter rows={selRows} x="attackRecall" y="attackPrecision" /></CardBody>
        </Card>
        <Card>
          <CardHeader as="h2" title="Accuracy vs attack recall" subtitle="High accuracy can coexist with many missed attacks" />
          <CardBody><ModelScatter rows={selRows} x="attackRecall" y="accuracy" /></CardBody>
        </Card>
      </div>

      <Callout tone="info">Rankings, differences and summaries use only the values loaded from your data; models with missing metrics are skipped for that metric rather than treated as zero.</Callout>
    </div>
  );
}
