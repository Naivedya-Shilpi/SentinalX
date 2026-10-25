import type { BenchmarkRow, MetricKey, RankingResult, RankedEntry } from '@/types';
import { isValidMetric } from './metrics';
import { modelOrder } from '@/data/models';

/** Values equal to 10 decimal places are treated as ties (guards against float noise). */
const TIE_EPSILON = 1e-10;

export function valuesTie(a: number, b: number): boolean {
  return Math.abs(a - b) < TIE_EPSILON;
}

/**
 * Standard competition ranking ("1-2-2-4") within the given rows.
 * Rows with a missing / invalid metric are never ranked and never treated as zero.
 */
export function rankRows(rows: BenchmarkRow[], metric: MetricKey): RankingResult {
  const valid: { row: BenchmarkRow; value: number }[] = [];
  const unranked: BenchmarkRow[] = [];
  for (const row of rows) {
    const v = row.metrics[metric];
    if (isValidMetric(v)) valid.push({ row, value: v });
    else unranked.push(row);
  }

  valid.sort((a, b) => {
    if (!valuesTie(a.value, b.value)) return b.value - a.value;
    return modelOrder(a.row.model) - modelOrder(b.row.model) || a.row.model.localeCompare(b.row.model);
  });

  const ranked: RankedEntry[] = [];
  valid.forEach((entry, i) => {
    const prev = ranked[i - 1];
    const rank = prev && valuesTie(prev.value, entry.value) ? prev.rank : i + 1;
    ranked.push({ row: entry.row, value: entry.value, rank, tied: false });
  });
  // Mark ties
  for (const e of ranked) e.tied = ranked.filter((o) => o.rank === e.rank).length > 1;

  return { ranked, unranked };
}

/** All rows sharing the top rank for a metric within one dataset (empty if none have the metric). */
export function bestEntries(rows: BenchmarkRow[], dataset: string, metric: MetricKey): RankedEntry[] {
  const { ranked } = rankRows(
    rows.filter((r) => r.dataset === dataset),
    metric,
  );
  return ranked.filter((e) => e.rank === 1);
}

export function rankOf(rows: BenchmarkRow[], target: BenchmarkRow, metric: MetricKey): { rank: number; of: number; tied: boolean } | null {
  const { ranked } = rankRows(
    rows.filter((r) => r.dataset === target.dataset),
    metric,
  );
  const hit = ranked.find((e) => e.row.id === target.id);
  return hit ? { rank: hit.rank, of: ranked.length, tied: hit.tied } : null;
}
