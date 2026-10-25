/**
 * Deterministic, evidence-based narrative generation.
 * Every sentence is computed from loaded metrics — no language model, no invented claims.
 */
import type { BenchmarkRow, ConfusionRow, MetricKey, RankedEntry } from '@/types';
import { METRICS, CORE_METRICS } from '@/data/metrics';
import { fmtInt, fmtPct, fmtPP, joinList } from './format';
import { rankRows, valuesTie, bestEntries } from './ranking';
import { isValidMetric, deriveFromConfusion } from './metrics';

export interface MetricDiff {
  metric: MetricKey;
  a: number | null;
  b: number | null;
  /** a − b on the 0–1 scale (format as percentage points) */
  delta: number | null;
  winner: 'a' | 'b' | 'tie' | null;
}

export function diffRows(a: BenchmarkRow, b: BenchmarkRow, metrics: MetricKey[] = CORE_METRICS): MetricDiff[] {
  return metrics.map((metric) => {
    const va = a.metrics[metric];
    const vb = b.metrics[metric];
    if (!isValidMetric(va) || !isValidMetric(vb)) return { metric, a: va, b: vb, delta: null, winner: null };
    const delta = va - vb;
    return { metric, a: va, b: vb, delta, winner: valuesTie(va, vb) ? 'tie' : delta > 0 ? 'a' : 'b' };
  });
}

/** Head-to-head narrative for two models on the same dataset. */
export function headToHeadSummary(a: BenchmarkRow, b: BenchmarkRow): string[] {
  const diffs = diffRows(a, b);
  const out: string[] = [];
  const aWins = diffs.filter((d) => d.winner === 'a').map((d) => METRICS[d.metric].label);
  const bWins = diffs.filter((d) => d.winner === 'b').map((d) => METRICS[d.metric].label);
  const missing = diffs.filter((d) => d.winner === null).map((d) => METRICS[d.metric].label);

  if (aWins.length && !bWins.length) out.push(`${a.model} outperforms ${b.model} on every comparable headline metric on ${a.dataset}.`);
  else if (bWins.length && !aWins.length) out.push(`${b.model} outperforms ${a.model} on every comparable headline metric on ${a.dataset}.`);
  else if (aWins.length || bWins.length) {
    out.push(`${a.model} leads on ${joinList(aWins)}; ${b.model} leads on ${joinList(bWins)}.`);
  }

  const p = diffs.find((d) => d.metric === 'attackPrecision');
  const r = diffs.find((d) => d.metric === 'attackRecall');
  if (p?.winner && r?.winner && p.winner !== 'tie' && r.winner !== 'tie' && p.winner !== r.winner) {
    const recallModel = r.winner === 'a' ? a.model : b.model;
    const precModel = p.winner === 'a' ? a.model : b.model;
    out.push(
      `${recallModel} achieves higher attack recall (${fmtPP(Math.abs(r.delta!))}), while ${precModel} produces higher attack precision (${fmtPP(Math.abs(p.delta!))}). This is a trade-off between detecting more attacks and reducing false alarms.`,
    );
  }

  const f1 = diffs.find((d) => d.metric === 'attackF1');
  if (f1?.winner && f1.winner !== 'tie') {
    const lead = f1.winner === 'a' ? a.model : b.model;
    out.push(`On balance (attack F1), ${lead} is ahead by ${fmtPP(Math.abs(f1.delta!))}.`);
  }

  const auc = diffs.find((d) => d.metric === 'aucRoc');
  if (auc?.winner && r?.winner && auc.winner !== 'tie' && r.winner !== 'tie' && auc.winner !== r.winner) {
    const aucModel = auc.winner === 'a' ? a.model : b.model;
    out.push(
      `${aucModel} has the higher AUC-ROC but lower thresholded attack recall — better score ranking does not guarantee more attacks detected at the default decision threshold.`,
    );
  }

  if (missing.length) out.push(`Not compared (missing data): ${joinList(missing)}.`);
  return out;
}

/** Why a given model is the spotlight winner. */
export function spotlightNarrative(rows: BenchmarkRow[], dataset: string, metric: MetricKey, confusion?: ConfusionRow): string[] {
  const { ranked } = rankRows(
    rows.filter((r) => r.dataset === dataset),
    metric,
  );
  if (!ranked.length) return [];
  const top = ranked.filter((e) => e.rank === 1);
  const out: string[] = [];
  const label = METRICS[metric].label;

  if (top.length > 1) {
    out.push(`${joinList(top.map((t) => t.row.model))} tie for first place on ${label} (${fmtPct(top[0].value)}).`);
    return out;
  }
  const winner = top[0];
  const runnerUp = ranked.find((e) => e.rank > 1);
  out.push(
    runnerUp
      ? `Ranks #1 of ${ranked.length} on ${label} with ${fmtPct(winner.value)}, ${fmtPP(winner.value - runnerUp.value)} ahead of ${runnerUp.row.model}.`
      : `Only model with a valid ${label} score (${fmtPct(winner.value)}).`,
  );

  const alsoLeads = CORE_METRICS.filter((m) => m !== metric).filter((m) =>
    bestEntries(rows, dataset, m).some((e) => e.row.id === winner.row.id),
  );
  const notLeads = CORE_METRICS.filter((m) => m !== metric && !alsoLeads.includes(m))
    .map((m) => ({ m, best: bestEntries(rows, dataset, m) }))
    .filter((x) => x.best.length);
  if (alsoLeads.length) out.push(`It also leads on ${joinList(alsoLeads.map((m) => METRICS[m].label))}.`);
  if (notLeads.length) {
    out.push(
      `It does not lead on ${joinList(notLeads.map((x) => `${METRICS[x.m].label} (${joinList(x.best.map((b) => b.row.model))})`))}.`,
    );
  }

  if (confusion) {
    const d = deriveFromConfusion(confusion);
    out.push(
      `On the ${fmtInt(d.total)}-record test set it missed ${fmtInt(confusion.fn)} of ${fmtInt(d.attackSupport)} attacks and raised ${fmtInt(confusion.fp)} false alarms on ${fmtInt(d.normalSupport)} normal records.`,
    );
  }
  return out;
}

/** Precision-vs-recall trade-off on a dataset. */
export function tradeoffNarrative(rows: BenchmarkRow[], dataset: string): string | null {
  const rec = bestEntries(rows, dataset, 'attackRecall');
  const prec = bestEntries(rows, dataset, 'attackPrecision');
  if (!rec.length || !prec.length) return null;
  const r = rec[0];
  const p = prec[0];
  if (r.row.id === p.row.id) {
    return `On ${dataset}, ${r.row.model} leads on both attack recall (${fmtPct(r.value)}) and attack precision (${fmtPct(p.value)}) — no precision/recall trade-off at the top.`;
  }
  return `On ${dataset}, ${r.row.model} catches the most attacks (recall ${fmtPct(r.value)}, precision ${fmtPct(r.row.metrics.attackPrecision)}), whereas ${p.row.model} raises the fewest false alarms relative to its alerts (precision ${fmtPct(p.value)}, recall ${fmtPct(p.row.metrics.attackRecall)}).`;
}

export interface WinnerSummary {
  metric: MetricKey;
  dataset: string;
  winners: RankedEntry[];
  runnerUp?: RankedEntry;
}

export function winnersFor(rows: BenchmarkRow[], dataset: string, metric: MetricKey): WinnerSummary {
  const { ranked } = rankRows(
    rows.filter((r) => r.dataset === dataset),
    metric,
  );
  const winners = ranked.filter((e) => e.rank === 1);
  return { metric, dataset, winners, runnerUp: ranked.find((e) => e.rank > 1) };
}

/** Metrics on which the top model differs — explains "why different metrics produce different winners". */
export function divergentWinners(rows: BenchmarkRow[], dataset: string): { metric: MetricKey; models: string[] }[] {
  return CORE_METRICS.map((metric) => ({
    metric,
    models: bestEntries(rows, dataset, metric).map((e) => e.row.model),
  })).filter((x) => x.models.length);
}

/** Pairs where AUC-ROC ordering disagrees with attack-recall ordering. */
export function aucRecallDisagreements(rows: BenchmarkRow[], dataset: string): { higherAuc: BenchmarkRow; higherRecall: BenchmarkRow }[] {
  const ds = rows.filter((r) => r.dataset === dataset && isValidMetric(r.metrics.aucRoc) && isValidMetric(r.metrics.attackRecall));
  const out: { higherAuc: BenchmarkRow; higherRecall: BenchmarkRow }[] = [];
  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      const a = ds[i];
      const b = ds[j];
      const aucD = a.metrics.aucRoc! - b.metrics.aucRoc!;
      const recD = a.metrics.attackRecall! - b.metrics.attackRecall!;
      if (Math.abs(aucD) < 1e-10 || Math.abs(recD) < 1e-10) continue;
      if (aucD > 0 && recD < 0) out.push({ higherAuc: a, higherRecall: b });
      if (aucD < 0 && recD > 0) out.push({ higherAuc: b, higherRecall: a });
    }
  }
  return out.sort(
    (x, y) =>
      y.higherAuc.metrics.aucRoc! - y.higherRecall.metrics.aucRoc! - (x.higherAuc.metrics.aucRoc! - x.higherRecall.metrics.aucRoc!),
  );
}

export function mean(values: (number | null)[]): number | null {
  const v = values.filter(isValidMetric);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
