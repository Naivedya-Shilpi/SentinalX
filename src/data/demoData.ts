/**
 * DEMONSTRATION DATA — measured results from the project's Databricks / Spark MLlib experiments.
 *
 * Provenance policy:
 *  - Confusion-matrix counts are the exact experimental counts supplied for this project.
 *  - Accuracy, attack precision/recall/F1 and weighted precision/recall/F1 are recomputed at full
 *    precision from those counts (e.g. UNSW-NB15 Naive Bayes precision = 30405 / 34230).
 *  - AUC-ROC cannot be derived from a single confusion matrix, so the reported scalar value is used.
 */
import type { BenchmarkRow, ConfusionRow, MetricKey } from '@/types';
import { deriveFromConfusion } from '@/utils/metrics';
import { rowId } from '@/utils/format';

type Counts = [tn: number, fp: number, fn: number, tp: number];

const RAW: { dataset: string; model: string; counts: Counts; reported: Partial<Record<MetricKey, number>> }[] = [
  // ---------------- UNSW-NB15 ----------------
  { dataset: 'UNSW-NB15', model: 'Logistic Regression', counts: [21398, 15602, 1914, 43418], reported: { accuracy: 0.7873, attackPrecision: 0.7356, attackRecall: 0.9578, attackF1: 0.8321, aucRoc: 0.896 } },
  { dataset: 'UNSW-NB15', model: 'Random Forest', counts: [21162, 15838, 265, 45067], reported: { accuracy: 0.8044, attackPrecision: 0.74, attackRecall: 0.9942, attackF1: 0.8484, aucRoc: 0.9134 } },
  { dataset: 'UNSW-NB15', model: 'Linear SVC', counts: [20872, 16128, 1639, 43693], reported: { accuracy: 0.7842, attackPrecision: 0.7304, attackRecall: 0.9638, attackF1: 0.831, aucRoc: 0.8024 } },
  { dataset: 'UNSW-NB15', model: 'Gradient-Boosted Trees', counts: [22616, 14384, 409, 44923], reported: { accuracy: 0.8203, attackPrecision: 0.7575, attackRecall: 0.991, attackF1: 0.8586, aucRoc: 0.972 } },
  { dataset: 'UNSW-NB15', model: 'Naive Bayes', counts: [33175, 3825, 14927, 30405], reported: { accuracy: 0.7722, attackPrecision: 0.89, attackRecall: 0.6709, attackF1: 0.7651, aucRoc: 0.6959 } },
  // ---------------- NSL-KDD ----------------
  { dataset: 'NSL-KDD', model: 'Logistic Regression', counts: [8990, 721, 4869, 7964], reported: { accuracy: 0.752, attackPrecision: 0.917, attackRecall: 0.6206, attackF1: 0.7402, aucRoc: 0.7831 } },
  { dataset: 'NSL-KDD', model: 'Random Forest', counts: [9431, 280, 4827, 8006], reported: { accuracy: 0.7735, attackPrecision: 0.9662, attackRecall: 0.6239, attackF1: 0.7582, aucRoc: 0.9512 } },
  { dataset: 'NSL-KDD', model: 'Linear SVC', counts: [8992, 719, 5046, 7787], reported: { accuracy: 0.7443, attackPrecision: 0.9155, attackRecall: 0.6068, attackF1: 0.7298, aucRoc: 0.8747 } },
  { dataset: 'NSL-KDD', model: 'Gradient-Boosted Trees', counts: [9442, 269, 4261, 8572], reported: { accuracy: 0.7991, attackPrecision: 0.9696, attackRecall: 0.668, attackF1: 0.791, aucRoc: 0.9118 } },
  { dataset: 'NSL-KDD', model: 'Naive Bayes', counts: [9445, 266, 5190, 7643], reported: { accuracy: 0.758, attackPrecision: 0.9664, attackRecall: 0.5956, attackF1: 0.737, aucRoc: 0.4769 } },
];

/** Values as reported in the experiment summary table (rounded to 4 d.p.) — kept for transparency checks. */
export const DEMO_REPORTED = RAW.map((r) => ({ dataset: r.dataset, model: r.model, ...r.reported }));

export const DEMO_CONFUSION: ConfusionRow[] = RAW.map(({ dataset, model, counts: [tn, fp, fn, tp] }) => ({
  id: rowId(dataset, model),
  dataset,
  model,
  tn,
  fp,
  fn,
  tp,
}));

const DERIVED_NOTE = 'Recomputed at full precision from the experimental confusion-matrix counts';

export const DEMO_BENCHMARKS: BenchmarkRow[] = RAW.map(({ dataset, model, counts: [tn, fp, fn, tp], reported }) => {
  const d = deriveFromConfusion({ tn, fp, fn, tp });
  return {
    id: rowId(dataset, model),
    dataset,
    model,
    metrics: {
      accuracy: d.accuracy,
      weightedPrecision: d.weightedPrecision,
      weightedRecall: d.weightedRecall,
      weightedF1: d.weightedF1,
      attackPrecision: d.attackPrecision,
      attackRecall: d.attackRecall,
      attackF1: d.attackF1,
      aucRoc: reported.aucRoc ?? null,
    },
    provenance: {
      accuracy: DERIVED_NOTE,
      weightedPrecision: `${DERIVED_NOTE} (Spark MulticlassMetrics weighting)`,
      weightedRecall: `${DERIVED_NOTE} (Spark MulticlassMetrics weighting)`,
      weightedF1: `${DERIVED_NOTE} (Spark MulticlassMetrics weighting)`,
      attackPrecision: DERIVED_NOTE,
      attackRecall: DERIVED_NOTE,
      attackF1: DERIVED_NOTE,
      aucRoc: 'Reported scalar AUC-ROC from Spark BinaryClassificationEvaluator',
    },
  };
});

export const DEMO_FILE_LABEL = 'Built-in demo · project experiment results';
