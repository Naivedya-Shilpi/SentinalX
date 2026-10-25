import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Crown, Layers, Radar as RadarIcon, Scale, ShieldCheck, Target, Trophy, Waypoints } from 'lucide-react';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useAppStore } from '@/store/useAppStore';
import { METRICS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { getModelInfo, modelColor } from '@/data/models';
import type { BenchmarkRow, MetricKey } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { AnimatedNumber, Callout } from '@/components/ui/Feedback';
import { InfoTip } from '@/components/ui/InfoTip';
import { ActiveSource, DatasetPicker, GlobalMetricSelect, MetricLabel, ModelFilter } from '@/components/common/Controls';
import { NetworkBackdrop } from '@/components/common/NetworkBackdrop';
import { NoDataState, Stagger, LinkArrow } from '@/components/common/Misc';
import { HorizontalModelBars, MetricGroupBars, RadarCompare } from '@/components/charts/Charts';
import { rankRows } from '@/utils/ranking';
import { spotlightNarrative } from '@/utils/insights';
import { fmtPct, fmtScore, joinList, cn } from '@/utils/format';
import { isValidMetric } from '@/utils/metrics';
import { CORE_METRICS } from '@/data/metrics';

/** Best value for a metric across rows (all tied leaders returned). */
function topOf(rows: BenchmarkRow[], metric: MetricKey) {
  const valid = rows.filter((r) => isValidMetric(r.metrics[metric]));
  if (!valid.length) return null;
  const max = Math.max(...valid.map((r) => r.metrics[metric]!));
  return { value: max, rows: valid.filter((r) => Math.abs(r.metrics[metric]! - max) < 1e-10) };
}

function Kpi({ icon, label, children, sub, delay, accent = 'cyan' }: { icon: React.ReactNode; label: string; children: React.ReactNode; sub?: React.ReactNode; delay: number; accent?: 'cyan' | 'violet' | 'emerald' | 'blue' }) {
  const tone = { cyan: 'text-cyan bg-cyan/10', violet: 'text-violet bg-violet/10', emerald: 'text-emerald bg-emerald/10', blue: 'text-blue bg-blue/10' }[accent];
  return (
    <Stagger delay={delay}>
      <Card interactive className="h-full p-4">
        <div className="flex items-center justify-between">
          <p className="label-xs">{label}</p>
          <span className={cn('grid h-7 w-7 place-items-center rounded-lg', tone)}>{icon}</span>
        </div>
        <div className="mt-3 min-h-[34px] text-[26px] font-semibold leading-tight tracking-tight">{children}</div>
        {sub && <div className="mt-1 text-xs leading-relaxed text-muted">{sub}</div>}
      </Card>
    </Stagger>
  );
}

function Spotlight({ rows, datasets, metric }: { rows: BenchmarkRow[]; datasets: string[]; metric: MetricKey }) {
  const { getConfusion } = useBenchmarkData();
  const [ds, setDs] = useState(datasets[0]);
  useEffect(() => {
    if (!datasets.includes(ds)) setDs(datasets[0]);
  }, [datasets, ds]);
  const dataset = datasets.includes(ds) ? ds : datasets[0];

  const { ranked } = rankRows(rows.filter((r) => r.dataset === dataset), metric);
  const winners = ranked.filter((e) => e.rank === 1);
  const winner = winners[0];
  const narrative = winner && winners.length === 1 ? spotlightNarrative(rows, dataset, metric, getConfusion(dataset, winner.row.model)) : winner ? spotlightNarrative(rows, dataset, metric) : [];

  return (
    <Card glow={winner ? 'emerald' : false} className="overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald/10 blur-3xl" />
      <CardHeader
        icon={<Crown className="h-4 w-4 text-emerald" />}
        title="Best Model Spotlight"
        subtitle={
          <>
            Leader on <span className="font-medium text-fg">{METRICS[metric].label}</span> for {dataset}
          </>
        }
        actions={datasets.length > 1 ? <DatasetPicker size="sm" value={dataset} onChange={setDs} datasets={datasets} /> : <Badge style={{ color: datasetColor(dataset) }}>{dataset}</Badge>}
      />
      <CardBody className="relative">
        {!winner ? (
          <p className="text-sm text-muted">No model has a valid {METRICS[metric].label} value for {dataset}.</p>
        ) : (
          <motion.div key={`${dataset}-${metric}-${winner.row.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="emerald" dot>
                  {winners.length > 1 ? `Tied #1 (${winners.length})` : 'Rank #1'}
                </Badge>
                <Badge tone="neutral">{getModelInfo(winner.row.model)?.family ?? 'Classifier'}</Badge>
              </div>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">{joinList(winners.map((w) => w.row.model))}</h3>
              <p className="mt-4 label-xs">{METRICS[metric].label}</p>
              <p className="gradient-text num text-5xl font-semibold tracking-tight">
                <AnimatedNumber value={winner.value * 100} format={(v) => `${v.toFixed(2)}%`} />
              </p>
              <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-muted">
                {narrative.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 self-start">
              {(['attackPrecision', 'attackRecall', 'attackF1', 'aucRoc'] as MetricKey[]).map((m) => (
                <div key={m} className={cn('rounded-xl border bg-surface-2/50 p-3.5', m === metric ? 'border-emerald/40' : 'border-line/10')}>
                  <p className="label-xs">
                    <MetricLabel metric={m} />
                  </p>
                  <p className="num mt-1.5 text-xl font-semibold">{fmtPct(winner.row.metrics[m])}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line/10">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald" initial={{ width: 0 }} animate={{ width: `${(winner.row.metrics[m] ?? 0) * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                  <p className="num mt-1 text-[11px] text-subtle">{fmtScore(winner.row.metrics[m])}</p>
                </div>
              ))}
              <p className="col-span-2 text-[11px] leading-relaxed text-subtle">The leader is recomputed from the loaded data whenever the dataset or ranking metric changes.</p>
            </div>
          </motion.div>
        )}
      </CardBody>
    </Card>
  );
}

export default function Overview() {
  const data = useBenchmarkData();
  const rankingMetric = useAppStore((s) => s.rankingMetric);
  const benchmarks = useAppStore((s) => s.benchmarks);
  const { filteredRows, activeDatasets, rows, datasets, models, shownModels } = data;

  const [sort, setSort] = useState<'metric' | 'name'>('metric');
  const [attackMetrics, setAttackMetrics] = useState<MetricKey[]>(['attackPrecision', 'attackRecall', 'attackF1']);
  const [radarDs, setRadarDs] = useState<string>('');
  const [radarA, setRadarA] = useState('');
  const [radarB, setRadarB] = useState('');

  const rd = activeDatasets.includes(radarDs) ? radarDs : activeDatasets[0] ?? '';
  const radarModels = models.filter((m) => rows.some((r) => r.dataset === rd && r.model === m));
  const a = radarModels.includes(radarA) ? radarA : radarModels[0] ?? '';
  const b = radarModels.includes(radarB) && radarB !== a ? radarB : radarModels.find((m) => m !== a) ?? '';

  const radarRows = useMemo(() => [a, b].filter(Boolean).map((m) => rows.find((r) => r.dataset === rd && r.model === m)).filter((r): r is BenchmarkRow => !!r), [a, b, rd, rows]);

  const topAcc = topOf(filteredRows, 'accuracy');
  const topRec = topOf(filteredRows, 'attackRecall');

  // Best model by the selected metric: one leader per active dataset.
  const leaders = activeDatasets.map((d) => ({ d, entries: rankRows(filteredRows.filter((r) => r.dataset === d), rankingMetric).ranked.filter((e) => e.rank === 1) })).filter((x) => x.entries.length);

  const toggleAttack = (m: MetricKey) => setAttackMetrics((cur) => (cur.includes(m) ? (cur.length > 1 ? cur.filter((x) => x !== m) : cur) : [...cur, m]));

  if (!data.hasData) return <NoDataState />;

  return (
    <div className="space-y-6">
      {/* ---------------- Hero ---------------- */}
      <section className="card relative overflow-hidden px-6 py-9 md:px-10 md:py-12" aria-labelledby="hero-title">
        <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <NetworkBackdrop className="absolute inset-0 h-full w-full opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/30 to-transparent" />
        <div className="relative max-w-3xl">
          <Stagger>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan" dot>
                Offline batch benchmark
              </Badge>
              <ActiveSource />
            </div>
            <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Network Intrusion <span className="gradient-text">Intelligence</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg">Comparative evaluation of machine learning models for large-scale network threat detection.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/leaderboard" className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-cyan to-cyan/80 px-5 text-[15px] font-medium text-[#04121a] shadow-[0_8px_24px_-8px_rgb(var(--cyan)/0.6)] transition hover:brightness-110">
                <Trophy className="h-4 w-4" /> View leaderboard
              </Link>
              <Link to="/methodology" className="inline-flex h-11 items-center gap-2 rounded-lg border border-line/15 bg-surface/60 px-5 text-[15px] font-medium transition hover:border-line/30">
                <Waypoints className="h-4 w-4 text-violet" /> How it works
              </Link>
            </div>
          </Stagger>
        </div>
        <p className="absolute bottom-3 right-4 hidden text-[10px] uppercase tracking-[0.14em] text-subtle md:block">Decorative visual · not live network data</p>
      </section>

      {/* ---------------- Controls ---------------- */}
      <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-xs">Scope</span>
          <ModelFilter />
        </div>
        <GlobalMetricSelect id="overview-metric" />
      </Card>

      {/* ---------------- KPIs ---------------- */}
      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <Kpi delay={0} label="Datasets evaluated" icon={<Layers className="h-4 w-4" />} sub={joinList(datasets)}>
          <AnimatedNumber value={datasets.length} format={(v) => Math.round(v).toString()} />
        </Kpi>
        <Kpi delay={0.04} label="Models benchmarked" accent="violet" icon={<Activity className="h-4 w-4" />} sub="Spark MLlib classifiers">
          <AnimatedNumber value={models.length} format={(v) => Math.round(v).toString()} />
        </Kpi>
        <Kpi delay={0.08} label="Completed evaluations" accent="blue" icon={<BarChart3 className="h-4 w-4" />} sub={`${benchmarks.rows.length} dataset × model results`}>
          <AnimatedNumber value={rows.length} format={(v) => Math.round(v).toString()} />
        </Kpi>
        <Kpi delay={0.12} label={`Best · ${METRICS[rankingMetric].label}`} accent="emerald" icon={<Crown className="h-4 w-4" />} sub={leaders.length > 1 ? leaders.map((l) => `${l.d}: ${l.entries[0].row.model}`).join(' · ') : leaders[0] ? `${leaders[0].d} · ${fmtPct(leaders[0].entries[0].value)}` : 'No valid values'}>
          <span className="text-[20px] leading-tight">{leaders.length ? joinList([...new Set(leaders.flatMap((l) => l.entries.map((e) => e.row.model)))]) : '—'}</span>
        </Kpi>
        <Kpi delay={0.16} label="Best accuracy" icon={<Target className="h-4 w-4" />} sub={topAcc ? joinList(topAcc.rows.map((r) => `${r.model}${activeDatasets.length > 1 ? ` (${r.dataset})` : ''}`)) : 'No valid values'}>
          <AnimatedNumber value={topAcc ? topAcc.value * 100 : null} format={(v) => `${v.toFixed(2)}%`} />
        </Kpi>
        <Kpi delay={0.2} label="Best attack recall" accent="violet" icon={<ShieldCheck className="h-4 w-4" />} sub={topRec ? joinList(topRec.rows.map((r) => `${r.model}${activeDatasets.length > 1 ? ` (${r.dataset})` : ''}`)) : 'No valid values'}>
          <AnimatedNumber value={topRec ? topRec.value * 100 : null} format={(v) => `${v.toFixed(2)}%`} />
        </Kpi>
      </section>

      {/* ---------------- Spotlight ---------------- */}
      <Spotlight rows={rows} datasets={activeDatasets} metric={rankingMetric} />

      {/* ---------------- Charts A & C ---------------- */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            as="h2"
            icon={<BarChart3 className="h-4 w-4" />}
            title="Model Accuracy Comparison"
            subtitle="Share of held-out test records classified correctly. Green outline marks the best model per dataset."
            actions={<Segmented ariaLabel="Sort order" size="sm" value={sort} onChange={setSort} options={[{ value: 'metric', label: 'By accuracy' }, { value: 'name', label: 'By name' }]} />}
          />
          <CardBody>
            <HorizontalModelBars rows={filteredRows} datasets={activeDatasets} metric="accuracy" sort={sort} domain={[0.5, 1]} />
            <p className="mt-2 text-[11px] text-subtle">Axis starts at 50% to make differences legible; bar labels show exact values.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            as="h2"
            icon={<Scale className="h-4 w-4" />}
            title="AUC-ROC Comparison"
            subtitle={
              <>
                Scalar AUC per model. <InfoTip label="What is AUC?" content={METRICS.aucRoc.description}><span className="underline decoration-dotted">What does AUC measure?</span></InfoTip>
              </>
            }
          />
          <CardBody>
            <HorizontalModelBars rows={filteredRows} datasets={activeDatasets} metric="aucRoc" sort={sort} domain={[0.4, 1]} />
            <Callout className="mt-3" tone="info" title="How to read AUC-ROC">
              AUC is the probability that a randomly chosen attack record receives a higher score than a randomly chosen normal record (0.5 = random ranking, 1.0 = perfect). It is threshold-independent, so a higher AUC does not guarantee higher attack recall at the default decision threshold. No ROC curve is drawn because only scalar AUC values are available.
            </Callout>
          </CardBody>
        </Card>
      </div>

      {/* ---------------- Chart B ---------------- */}
      <Card>
        <CardHeader
          as="h2"
          icon={<Target className="h-4 w-4" />}
          title="Attack Detection Performance"
          subtitle="Precision falls when the model raises false alarms; recall falls when attacks are missed. F1 balances both."
          actions={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Attack metrics to show">
              {(['attackPrecision', 'attackRecall', 'attackF1'] as MetricKey[]).map((m) => (
                <button key={m} type="button" aria-pressed={attackMetrics.includes(m)} onClick={() => toggleAttack(m)} className={cn('h-7 rounded-full border px-3 text-xs font-medium transition-colors', attackMetrics.includes(m) ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-line/10 text-muted hover:text-fg')}>
                  {METRICS[m].label}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <div className={cn('grid gap-6', activeDatasets.length > 1 && 'xl:grid-cols-2')}>
            {activeDatasets.map((d) => (
              <div key={d}>
                <p className="mb-1 flex items-center gap-2 text-[13px] font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: datasetColor(d) }} /> {d}
                </p>
                <MetricGroupBars rows={filteredRows.filter((r) => r.dataset === d)} metrics={attackMetrics} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 text-[13px] text-muted md:grid-cols-2">
            <div className="rounded-xl border border-amber/20 bg-amber/5 p-3">
              <p className="font-medium text-amber">Low precision → false alarms</p>
              <p className="mt-0.5">Analysts must triage alerts that turn out to be normal traffic.</p>
            </div>
            <div className="rounded-xl border border-coral/20 bg-coral/5 p-3">
              <p className="font-medium text-coral">Low recall → missed attacks</p>
              <p className="mt-0.5">Malicious records pass undetected, which is typically costlier in security.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ---------------- Chart D ---------------- */}
      <Card>
        <CardHeader
          as="h2"
          icon={<RadarIcon className="h-4 w-4" />}
          title="Model Performance Radar"
          subtitle="Pick two models. All axes use the same fixed 0–100% scale."
          actions={
            <>
              {activeDatasets.length > 1 && <DatasetPicker size="sm" value={rd} onChange={setRadarDs} datasets={activeDatasets} />}
              <label className="sr-only" htmlFor="radar-a">First model</label>
              <select id="radar-a" className="select-native" value={a} onChange={(e) => setRadarA(e.target.value)}>
                {radarModels.map((m) => (
                  <option key={m} value={m} disabled={m === b}>{m}</option>
                ))}
              </select>
              <span className="text-xs text-subtle">vs</span>
              <label className="sr-only" htmlFor="radar-b">Second model</label>
              <select id="radar-b" className="select-native" value={b} onChange={(e) => setRadarB(e.target.value)}>
                {radarModels.map((m) => (
                  <option key={m} value={m} disabled={m === a}>{m}</option>
                ))}
              </select>
            </>
          }
        />
        <CardBody className="grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
          <RadarCompare rows={radarRows} metrics={CORE_METRICS} height={360} />
          <div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-subtle">
                  <th className="pb-2 font-medium">Metric</th>
                  {radarRows.map((r) => (
                    <th key={r.id} className="pb-2 text-right font-medium" style={{ color: modelColor(r.model) }}>{r.model}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CORE_METRICS.map((m) => (
                  <tr key={m} className="border-t border-line/10">
                    <td className="py-2 text-muted"><MetricLabel metric={m} /></td>
                    {radarRows.map((r) => (
                      <td key={r.id} className="num py-2 text-right">{fmtPct(r.metrics[m])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Callout className="mt-4" tone="warning">Radar charts are supplementary. Polygon areas can exaggerate small differences; rely on the exact values in the table for comparisons.</Callout>
          </div>
        </CardBody>
      </Card>

      <p className="text-center text-xs text-subtle">
        {shownModels.length} of {models.length} models in scope · <LinkArrow to="/insights">Read the evaluation insights</LinkArrow>
      </p>
    </div>
  );
}
