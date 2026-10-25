import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, Trophy, X } from 'lucide-react';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useAppStore, toast } from '@/store/useAppStore';
import { CORE_METRICS, METRICS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { getModelInfo, modelColor, modelOrder } from '@/data/models';
import type { BenchmarkRow, MetricKey, RankedEntry } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Overlay } from '@/components/ui/Overlay';
import { ActiveSource, DatasetSwitcher, MetricLabel, MetricSelect, ModelFilter, PageHeader } from '@/components/common/Controls';
import { NoDataState } from '@/components/common/Misc';
import { METRIC_KEYS } from '@/data/metrics';
import { rankOf, rankRows } from '@/utils/ranking';
import { benchmarksToCsv, downloadText } from '@/utils/csv';
import { deriveFromConfusion, isValidMetric } from '@/utils/metrics';
import { cn, fmtInt, fmtPct, fmtScore } from '@/utils/format';

type SortKey = 'rank' | 'model' | MetricKey;
const COLUMNS: MetricKey[] = ['accuracy', 'attackPrecision', 'attackRecall', 'attackF1', 'aucRoc'];

function rankLabel(e: RankedEntry | undefined) {
  if (!e) return '—';
  return `${e.tied ? 'T-' : ''}${e.rank}`;
}

export default function Leaderboard() {
  const { filteredRows, activeDatasets, rows, hasData, getConfusion } = useBenchmarkData();
  const rankingMetric = useAppStore((s) => s.rankingMetric);
  const setRankingMetric = useAppStore((s) => s.setRankingMetric);
  const query = useAppStore((s) => s.modelQuery);
  const setQuery = useAppStore((s) => s.setModelQuery);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');
  const [selected, setSelected] = useState<BenchmarkRow | null>(null);

  const q = query.trim().toLowerCase();

  /** One section per dataset: ranks are computed within the dataset (never averaged across datasets). */
  const sections = useMemo(
    () =>
      activeDatasets.map((dataset) => {
        const dsRows = filteredRows.filter((r) => r.dataset === dataset);
        const { ranked, unranked } = rankRows(dsRows, rankingMetric);
        const rankMap = new Map(ranked.map((e) => [e.row.id, e]));
        let visible = dsRows.filter((r) => !q || r.model.toLowerCase().includes(q));
        const cmp = (a: BenchmarkRow, b: BenchmarkRow) => {
          if (sortKey === 'model') return modelOrder(a.model) - modelOrder(b.model) || a.model.localeCompare(b.model);
          const key: MetricKey = sortKey === 'rank' ? rankingMetric : sortKey;
          const va = a.metrics[key];
          const vb = b.metrics[key];
          if (!isValidMetric(va) && !isValidMetric(vb)) return 0;
          if (!isValidMetric(va)) return 1; // missing values always sort last
          if (!isValidMetric(vb)) return -1;
          const effective = sortKey === 'rank' ? 'desc' : dir;
          return effective === 'desc' ? vb - va : va - vb;
        };
        visible = [...visible].sort((a, b) => {
          const c = cmp(a, b);
          return sortKey === 'model' && dir === 'desc' ? -c : sortKey === 'rank' && dir === 'asc' ? -c : c;
        });
        return { dataset, rows: visible, rankMap, ranked, unrankedCount: unranked.length };
      }),
    [activeDatasets, filteredRows, rankingMetric, q, sortKey, dir],
  );

  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(k);
      setDir(k === 'model' ? 'asc' : 'desc');
    }
  };

  const exportCsv = () => {
    const items = sections.flatMap((s) => s.rows.map((row) => ({ rank: s.rankMap.get(row.id)?.rank ?? null, row })));
    if (!items.length) {
      toast({ kind: 'warning', title: 'Nothing to export', description: 'No rows match the current filters.' });
      return;
    }
    downloadText(benchmarksToCsv(items), `sentinelx-leaderboard-${rankingMetric}.csv`);
    toast({ kind: 'success', title: 'Leaderboard exported', description: `${items.length} row(s) ranked by ${METRICS[rankingMetric].label}.` });
  };

  if (!hasData) return <NoDataState />;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-40" /> : dir === 'desc' ? <ArrowDown className="h-3 w-3 text-cyan" /> : <ArrowUp className="h-3 w-3 text-cyan" />;

  const th = (k: SortKey, label: React.ReactNode, align: 'left' | 'right' = 'right', active = false) => (
    <th scope="col" aria-sort={sortKey === k ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'} className={cn('px-3 py-3 font-medium', align === 'right' ? 'text-right' : 'text-left', active && 'text-cyan')}>
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 rounded hover:text-fg" aria-label={`Sort by ${typeof label === 'string' ? label : k}`}>
          {typeof label === 'string' ? label : label}
          <SortIcon k={k} />
        </button>
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking engine"
        title="Model Leaderboard"
        description="Models are ranked within each dataset on the chosen metric. Ties share a rank, and models with a missing value are never ranked or treated as zero."
        actions={
          <>
            <ActiveSource />
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <DatasetSwitcher />
          <MetricSelect id="lb-metric" value={rankingMetric} onChange={setRankingMetric} />
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input id="lb-search" aria-label="Filter models" placeholder="Filter models…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-full rounded-lg border border-line/10 bg-surface-2/60 pl-9 pr-8 text-sm placeholder:text-subtle focus:border-cyan/50 focus:outline-none" />
            {query && (
              <button type="button" aria-label="Clear filter" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <ModelFilter />
        <p className="text-xs text-muted">
          <span className="font-medium text-fg">{METRICS[rankingMetric].label}:</span> {METRICS[rankingMetric].description}
        </p>
      </Card>

      {total === 0 && (
        <Card>
          <EmptyState icon={<Search className="h-5 w-5" />} title="No models match your filters" description="Clear the search box or re-enable models above." action={<Button variant="outline" onClick={() => setQuery('')}>Clear search</Button>} />
        </Card>
      )}

      {sections.map((s) =>
        s.rows.length === 0 ? null : (
          <Card key={s.dataset} className="overflow-hidden">
            <CardHeader
              as="h2"
              icon={<Trophy className="h-4 w-4" />}
              title={
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: datasetColor(s.dataset) }} />
                  {s.dataset} ranking
                </span>
              }
              subtitle={`Ranked by ${METRICS[rankingMetric].label} · ${s.ranked.length} ranked${s.unrankedCount ? ` · ${s.unrankedCount} not ranked (missing value)` : ''}`}
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="border-y border-line/10 bg-bg-2/40 text-xs text-subtle">
                  <tr>
                    {th('rank', 'Rank', 'left')}
                    {th('model', 'Model', 'left')}
                    <th scope="col" className="px-3 py-3 text-left font-medium">Dataset</th>
                    {COLUMNS.map((m) => th(m, <MetricLabel metric={m} />, 'right', m === rankingMetric))}
                    <th scope="col" className="px-3 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((row) => {
                    const entry = s.rankMap.get(row.id);
                    const top = entry?.rank === 1;
                    return (
                      <motion.tr
                        key={row.id}
                        layout="position"
                        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                        tabIndex={0}
                        onClick={() => setSelected(row)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(row))}
                        aria-label={`${row.model}, open details`}
                        className={cn('cursor-pointer border-b border-line/5 transition-colors last:border-0 hover:bg-line/5', top && 'bg-emerald/[0.05] hover:bg-emerald/10')}
                      >
                        <td className="px-3 py-3.5">
                          <span className={cn('num inline-grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-xs font-semibold', top ? 'bg-emerald/15 text-emerald ring-1 ring-emerald/40' : 'bg-line/5 text-muted')}>{rankLabel(entry)}</span>
                        </td>
                        <td className="px-3 py-3.5 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: modelColor(row.model) }} />
                            {row.model}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-muted">{row.dataset}</td>
                        {COLUMNS.map((m) => {
                          const v = row.metrics[m];
                          const colTop = rankOf(rows, row, m);
                          return (
                            <td key={m} className={cn('num px-3 py-3.5 text-right', m === rankingMetric && 'bg-cyan/[0.04] font-semibold text-fg', !isValidMetric(v) && 'text-neutral')}>
                              {isValidMetric(v) ? fmtPct(v) : <span title="Missing value — not ranked">n/a</span>}
                              {colTop?.rank === 1 && <span className="ml-1 text-emerald" title={`Best ${METRICS[m].label} on ${row.dataset}`}>★</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3.5">
                          {!entry ? <Badge tone="amber">Not ranked</Badge> : top ? <Badge tone="emerald" dot>{entry.tied ? 'Tied top' : 'Top performer'}</Badge> : entry.tied ? <Badge tone="neutral">Tied</Badge> : <Badge tone="neutral">Ranked</Badge>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line/10 px-5 py-2.5 text-[11px] text-subtle">★ = best value in that column for this dataset. Click a row for model details.</p>
          </Card>
        ),
      )}

      <ModelDrawer row={selected} onClose={() => setSelected(null)} getConfusion={getConfusion} rows={rows} rankingMetric={rankingMetric} />
    </div>
  );
}

function ModelDrawer({ row, onClose, getConfusion, rows, rankingMetric }: { row: BenchmarkRow | null; onClose: () => void; getConfusion: (d: string, m: string) => import('@/types').ConfusionRow | undefined; rows: BenchmarkRow[]; rankingMetric: MetricKey }) {
  const info = row ? getModelInfo(row.model) : undefined;
  const cm = row ? getConfusion(row.dataset, row.model) : undefined;
  const d = cm ? deriveFromConfusion(cm) : null;
  return (
    <Overlay
      open={!!row}
      onClose={onClose}
      variant="drawer"
      title={row ? row.model : ''}
      description={row ? `${row.dataset} · ${info?.family ?? 'Classifier'}` : undefined}
    >
      {row && (
        <div className="space-y-6">
          {info && (
            <>
              <p className="text-[13px] leading-relaxed text-muted">{info.summary}</p>
              <p className="num text-[11px] text-subtle">{info.sparkClass}</p>
            </>
          )}
          <section>
            <h3 className="label-xs mb-2">All metrics (rank within {row.dataset})</h3>
            <div className="overflow-hidden rounded-xl border border-line/10">
              {METRIC_KEYS.map((m) => {
                const r = rankOf(rows, row, m);
                return (
                  <div key={m} className={cn('flex items-center justify-between gap-3 border-b border-line/5 px-4 py-2.5 text-[13px] last:border-0', m === rankingMetric && 'bg-cyan/[0.06]')}>
                    <span className="text-muted"><MetricLabel metric={m} /></span>
                    <span className="flex items-center gap-3">
                      <span className="num">{fmtScore(row.metrics[m])} <span className="text-subtle">· {fmtPct(row.metrics[m])}</span></span>
                      <span className={cn('num w-14 text-right text-xs', r?.rank === 1 ? 'text-emerald' : 'text-subtle')}>{r ? `${r.tied ? 'T-' : '#'}${r.rank}/${r.of}` : 'n/a'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            {METRIC_KEYS.some((m) => !isValidMetric(row.metrics[m])) && <p className="mt-2 text-xs text-amber">Some metrics are missing for this model and are excluded from rankings.</p>}
          </section>
          <section>
            <h3 className="label-xs mb-2">Confusion matrix</h3>
            {cm && d ? (
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                {[['TN', cm.tn, 'emerald'], ['FP', cm.fp, 'amber'], ['FN', cm.fn, 'coral'], ['TP', cm.tp, 'emerald']].map(([k, v, c]) => (
                  <div key={k as string} className={cn('rounded-xl border p-3', c === 'emerald' && 'border-emerald/25 bg-emerald/5', c === 'amber' && 'border-amber/25 bg-amber/5', c === 'coral' && 'border-coral/25 bg-coral/5')}>
                    <p className="text-subtle">{k}</p>
                    <p className="num text-lg font-semibold text-fg">{fmtInt(v as number)}</p>
                    <p className="num text-subtle">{fmtPct((v as number) / d.total)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">No confusion matrix imported for this model.</p>
            )}
          </section>
          {row.provenance && (
            <section>
              <h3 className="label-xs mb-2">Data provenance</h3>
              <ul className="space-y-1 text-xs text-muted">
                {[...new Set(Object.values(row.provenance))].map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[11px] leading-relaxed text-subtle">Core headline metrics: {CORE_METRICS.map((m) => METRICS[m].label).join(', ')}.</p>
        </div>
      )}
    </Overlay>
  );
}
