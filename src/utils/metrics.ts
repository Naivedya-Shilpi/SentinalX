import type { ConfusionRow, MetricValue } from '@/types';

/** Returns null instead of NaN/Infinity when the denominator is zero. */
export function safeDiv(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

export function f1Score(precision: MetricValue, recall: MetricValue): MetricValue {
  if (precision == null || recall == null) return null;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export interface ConfusionDerived {
  total: number;
  normalSupport: number;
  attackSupport: number;
  predictedAttack: number;
  predictedNormal: number;
  accuracy: MetricValue;
  attackPrecision: MetricValue;
  attackRecall: MetricValue;
  attackF1: MetricValue;
  normalPrecision: MetricValue;
  normalRecall: MetricValue;
  normalF1: MetricValue;
  specificity: MetricValue;
  falsePositiveRate: MetricValue;
  falseNegativeRate: MetricValue;
  weightedPrecision: MetricValue;
  weightedRecall: MetricValue;
  weightedF1: MetricValue;
}

/** Support-weighted average that returns null if any component is missing. */
function weighted(a: MetricValue, wa: number, b: MetricValue, wb: number): MetricValue {
  if (a == null || b == null) return null;
  return safeDiv(a * wa + b * wb, wa + wb);
}

/**
 * Exact metrics from binary confusion-matrix counts (positive class = Attack).
 * Weighted metrics follow Spark MLlib's MulticlassMetrics definition (weighted by true-class support).
 */
export function deriveFromConfusion({ tn, fp, fn, tp }: Pick<ConfusionRow, 'tn' | 'fp' | 'fn' | 'tp'>): ConfusionDerived {
  const total = tn + fp + fn + tp;
  const normalSupport = tn + fp;
  const attackSupport = tp + fn;

  const attackPrecision = safeDiv(tp, tp + fp);
  const attackRecall = safeDiv(tp, tp + fn);
  const normalPrecision = safeDiv(tn, tn + fn);
  const normalRecall = safeDiv(tn, tn + fp);
  const attackF1 = f1Score(attackPrecision, attackRecall);
  const normalF1 = f1Score(normalPrecision, normalRecall);

  return {
    total,
    normalSupport,
    attackSupport,
    predictedAttack: tp + fp,
    predictedNormal: tn + fn,
    accuracy: safeDiv(tp + tn, total),
    attackPrecision,
    attackRecall,
    attackF1,
    normalPrecision,
    normalRecall,
    normalF1,
    specificity: normalRecall,
    falsePositiveRate: safeDiv(fp, fp + tn),
    falseNegativeRate: safeDiv(fn, fn + tp),
    weightedPrecision: weighted(normalPrecision, normalSupport, attackPrecision, attackSupport),
    weightedRecall: weighted(normalRecall, normalSupport, attackRecall, attackSupport),
    weightedF1: weighted(normalF1, normalSupport, attackF1, attackSupport),
  };
}

/** A metric is usable only if it is a finite number. */
export function isValidMetric(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
