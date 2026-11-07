/**
 * DATABRICKS EXPERIMENTAL DATA — genuine offline batch evaluation results exported from
 * the project's Databricks / Apache Spark MLlib pipeline (`final_benchmarks.csv` and
 * `confusion_matrices.csv`).
 *
 * Provenance policy:
 *  - Primary default data (`DEMO_BENCHMARKS` and `DEMO_CONFUSION`) is parsed directly from
 *    the exact Databricks CSV exports (`final_benchmarks.csv` and `confusion_matrices.csv`).
 *  - Original confusion-derived fallback calculation is preserved only as an emergency
 *    fallback (`FALLBACK_BENCHMARKS` / `FALLBACK_CONFUSION`) if CSV parsing ever fails.
 *  - Test-set class distributions in `DEMO_METADATA` are derived strictly from the held-out
 *    test set confusion matrices (`Normal = TN + FP`, `Attack = FN + TP`) and are never mixed
 *    with documented training-set record totals.
 */
import type { BenchmarkRow, ConfusionRow, DatasetMetadataEntry, MetricKey } from '@/types';
import { datasetOrder } from '@/data/datasets';
import { modelOrder } from '@/data/models';
import { parseBenchmarkCsv, parseConfusionCsv } from '@/utils/csv';
import { deriveFromConfusion } from '@/utils/metrics';
import { rowId } from '@/utils/format';
import finalBenchmarksCsv from './final_benchmarks.csv?raw';
import confusionMatricesCsv from './confusion_matrices.csv?raw';

export const FINAL_BENCHMARKS_CSV = finalBenchmarksCsv;
export const CONFUSION_MATRICES_CSV = confusionMatricesCsv;

type Counts = [tn: number, fp: number, fn: number, tp: number];

/** Optional fallback table retained from initial setup in case CSV parsing ever fails. */
const FALLBACK_RAW: { dataset: string; model: string; counts: Counts; reported: Partial<Record<MetricKey, number>> }[] = [
  // ---------------- UNSW-NB15 ----------------
  { dataset: 'UNSW-NB15', model: 'Logistic Regression', counts: [21398, 15602, 1914, 43418], reported: { accuracy: 0.7873, weightedPrecision: 0.8176, weightedRecall: 0.7873, weightedF1: 0.7771, attackPrecision: 0.7356, attackRecall: 0.9578, attackF1: 0.8321, aucRoc: 0.896 } },
  { dataset: 'UNSW-NB15', model: 'Random Forest', counts: [21162, 15838, 265, 45067], reported: { accuracy: 0.8044, weightedPrecision: 0.8513, weightedRecall: 0.8044, weightedF1: 0.7927, attackPrecision: 0.74, attackRecall: 0.9942, attackF1: 0.8484, aucRoc: 0.9134 } },
  { dataset: 'UNSW-NB15', model: 'Linear SVC', counts: [20872, 16128, 1639, 43693], reported: { accuracy: 0.7842, weightedPrecision: 0.8188, weightedRecall: 0.7842, weightedF1: 0.7728, attackPrecision: 0.7304, attackRecall: 0.9638, attackF1: 0.831, aucRoc: 0.8024 } },
  { dataset: 'UNSW-NB15', model: 'Gradient-Boosted Trees', counts: [22616, 14384, 409, 44923], reported: { accuracy: 0.8203, weightedPrecision: 0.8585, weightedRecall: 0.8203, weightedF1: 0.8114, attackPrecision: 0.7575, attackRecall: 0.991, attackF1: 0.8586, aucRoc: 0.972 } },
  { dataset: 'UNSW-NB15', model: 'Naive Bayes', counts: [33175, 3825, 14927, 30405], reported: { accuracy: 0.7722, weightedPrecision: 0.799, weightedRecall: 0.7722, weightedF1: 0.7712, attackPrecision: 0.8883, attackRecall: 0.6707, attackF1: 0.7643, aucRoc: 0.6959 } },
  // ---------------- NSL-KDD ----------------
  { dataset: 'NSL-KDD', model: 'Logistic Regression', counts: [8990, 721, 4869, 7964], reported: { accuracy: 0.752, weightedPrecision: 0.8014, weightedRecall: 0.752, weightedF1: 0.75, attackPrecision: 0.917, attackRecall: 0.6206, attackF1: 0.7402, aucRoc: 0.7831 } },
  { dataset: 'NSL-KDD', model: 'Random Forest', counts: [9431, 280, 4827, 8006], reported: { accuracy: 0.7735, weightedPrecision: 0.8349, weightedRecall: 0.7735, weightedF1: 0.7706, attackPrecision: 0.9662, attackRecall: 0.6239, attackF1: 0.7582, aucRoc: 0.9512 } },
  { dataset: 'NSL-KDD', model: 'Linear SVC', counts: [8992, 719, 5046, 7787], reported: { accuracy: 0.7443, weightedPrecision: 0.797, weightedRecall: 0.7443, weightedF1: 0.7416, attackPrecision: 0.9155, attackRecall: 0.6068, attackF1: 0.7298, aucRoc: 0.8747 } },
  { dataset: 'NSL-KDD', model: 'Gradient-Boosted Trees', counts: [9442, 269, 4261, 8572], reported: { accuracy: 0.7991, weightedPrecision: 0.8487, weightedRecall: 0.7991, weightedF1: 0.7977, attackPrecision: 0.9696, attackRecall: 0.668, attackF1: 0.791, aucRoc: 0.9118 } },
  { dataset: 'NSL-KDD', model: 'Naive Bayes', counts: [9445, 266, 5190, 7643], reported: { accuracy: 0.758, weightedPrecision: 0.8281, weightedRecall: 0.758, weightedF1: 0.7537, attackPrecision: 0.9664, attackRecall: 0.5956, attackF1: 0.737, aucRoc: 0.4769 } },
];

export const FALLBACK_CONFUSION: ConfusionRow[] = FALLBACK_RAW.map(({ dataset, model, counts: [tn, fp, fn, tp] }) => ({
  id: rowId(dataset, model),
  dataset,
  model,
  tn,
  fp,
  fn,
  tp,
}));

export const FALLBACK_BENCHMARKS: BenchmarkRow[] = FALLBACK_RAW.map(({ dataset, model, counts: [tn, fp, fn, tp], reported }) => {
  const d = deriveFromConfusion({ tn, fp, fn, tp });
  return {
    id: rowId(dataset, model),
    dataset,
    model,
    metrics: {
      accuracy: reported.accuracy ?? d.accuracy,
      weightedPrecision: reported.weightedPrecision ?? d.weightedPrecision,
      weightedRecall: reported.weightedRecall ?? d.weightedRecall,
      weightedF1: reported.weightedF1 ?? d.weightedF1,
      attackPrecision: reported.attackPrecision ?? d.attackPrecision,
      attackRecall: reported.attackRecall ?? d.attackRecall,
      attackF1: reported.attackF1 ?? d.attackF1,
      aucRoc: reported.aucRoc ?? null,
    },
  };
});

const CSV_PROVENANCE_NOTE = 'Offline Databricks Spark MLlib benchmark export (final_benchmarks.csv)';
const CSV_AUC_PROVENANCE_NOTE = 'Reported scalar AUC-ROC from Spark BinaryClassificationEvaluator (final_benchmarks.csv)';

const parsedBenchmarks = parseBenchmarkCsv(finalBenchmarksCsv);
const parsedConfusion = parseConfusionCsv(confusionMatricesCsv);

const sortByDatasetAndModel = <T extends { dataset: string; model: string }>(rows: T[]): T[] =>
  [...rows].sort(
    (a, b) =>
      datasetOrder(a.dataset) - datasetOrder(b.dataset) ||
      a.dataset.localeCompare(b.dataset) ||
      modelOrder(a.model) - modelOrder(b.model) ||
      a.model.localeCompare(b.model),
  );

export const DEMO_CONFUSION: ConfusionRow[] =
  parsedConfusion.ok && parsedConfusion.rows.length === 10
    ? sortByDatasetAndModel(parsedConfusion.rows)
    : FALLBACK_CONFUSION;

export const DEMO_BENCHMARKS: BenchmarkRow[] =
  parsedBenchmarks.ok && parsedBenchmarks.rows.length === 10
    ? sortByDatasetAndModel(parsedBenchmarks.rows).map((row) => ({
        ...row,
        provenance: {
          accuracy: CSV_PROVENANCE_NOTE,
          weightedPrecision: `${CSV_PROVENANCE_NOTE} · Spark MulticlassMetrics weighted Precision`,
          weightedRecall: `${CSV_PROVENANCE_NOTE} · Spark MulticlassMetrics weighted Recall`,
          weightedF1: `${CSV_PROVENANCE_NOTE} · Spark MulticlassMetrics weighted F1`,
          attackPrecision: `${CSV_PROVENANCE_NOTE} · positive class = Attack (1)`,
          attackRecall: `${CSV_PROVENANCE_NOTE} · positive class = Attack (1)`,
          attackF1: `${CSV_PROVENANCE_NOTE} · positive class = Attack (1)`,
          aucRoc: CSV_AUC_PROVENANCE_NOTE,
        },
      }))
    : FALLBACK_BENCHMARKS;

/** Values as reported in the Databricks benchmark CSV export — kept for transparency and validation checks. */
export const DEMO_REPORTED = DEMO_BENCHMARKS.map((r) => ({
  dataset: r.dataset,
  model: r.model,
  ...r.metrics,
}));

/**
 * Held-out test-set class distributions derived strictly from the Databricks confusion matrices
 * (`Normal = TN + FP`, `Attack = FN + TP`). Documented training-set totals are never mixed with these counts.
 */
export const DEMO_METADATA: DatasetMetadataEntry[] = ['UNSW-NB15', 'NSL-KDD'].flatMap((dataset) => {
  const cm = DEMO_CONFUSION.find((r) => r.dataset === dataset);
  if (!cm) return [];
  return [
    {
      dataset,
      test: {
        normal: cm.tn + cm.fp,
        attack: cm.fn + cm.tp,
      },
      notes: [
        'Test-set class distribution is derived directly from the held-out test set confusion-matrix counts (Normal = TN + FP, Attack = FN + TP) in confusion_matrices.csv.',
        'Documented training-set total record count is shown separately above; per-class training counts are not mixed with test-set evaluation counts.',
      ],
    },
  ];
});

export const DEMO_FILE_LABEL = 'final_benchmarks.csv · Databricks Spark MLlib export';
export const DEMO_CONFUSION_FILE_LABEL = 'confusion_matrices.csv · Databricks Spark MLlib export';
export const DEMO_METADATA_FILE_LABEL = 'Derived from confusion_matrices.csv (test-set counts)';
