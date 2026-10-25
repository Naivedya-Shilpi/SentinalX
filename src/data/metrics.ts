import type { MetricKey } from '@/types';

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  short: string;
  csvColumn: string;
  description: string;
  formula: string;
  group: 'overall' | 'weighted' | 'attack' | 'ranking';
}

export const METRICS: Record<MetricKey, MetricDefinition> = {
  accuracy: {
    key: 'accuracy',
    label: 'Accuracy',
    short: 'Acc',
    csvColumn: 'Accuracy',
    description: 'Share of all test records classified correctly. Can look strong even when many attacks are missed.',
    formula: '(TP + TN) / (TP + TN + FP + FN)',
    group: 'overall',
  },
  weightedPrecision: {
    key: 'weightedPrecision',
    label: 'Weighted Precision',
    short: 'W-Prec',
    csvColumn: 'Weighted_Precision',
    description: 'Per-class precision averaged by class support (Normal and Attack).',
    formula: 'Σ_c precision_c × support_c / N',
    group: 'weighted',
  },
  weightedRecall: {
    key: 'weightedRecall',
    label: 'Weighted Recall',
    short: 'W-Rec',
    csvColumn: 'Weighted_Recall',
    description: 'Per-class recall averaged by class support. For binary tasks this equals accuracy.',
    formula: 'Σ_c recall_c × support_c / N',
    group: 'weighted',
  },
  weightedF1: {
    key: 'weightedF1',
    label: 'Weighted F1',
    short: 'W-F1',
    csvColumn: 'Weighted_F1',
    description: 'Per-class F1 averaged by class support.',
    formula: 'Σ_c F1_c × support_c / N',
    group: 'weighted',
  },
  attackPrecision: {
    key: 'attackPrecision',
    label: 'Attack Precision',
    short: 'Atk-P',
    csvColumn: 'Attack_Precision',
    description: 'Of all records flagged as attacks, the share that really were attacks. Low precision = more false alarms.',
    formula: 'TP / (TP + FP)',
    group: 'attack',
  },
  attackRecall: {
    key: 'attackRecall',
    label: 'Attack Recall',
    short: 'Atk-R',
    csvColumn: 'Attack_Recall',
    description: 'Of all real attacks, the share the model detected. Low recall = more missed attacks.',
    formula: 'TP / (TP + FN)',
    group: 'attack',
  },
  attackF1: {
    key: 'attackF1',
    label: 'Attack F1',
    short: 'Atk-F1',
    csvColumn: 'Attack_F1',
    description: 'Harmonic mean of attack precision and attack recall. Balances false alarms against missed attacks.',
    formula: '2 × P × R / (P + R)',
    group: 'attack',
  },
  aucRoc: {
    key: 'aucRoc',
    label: 'AUC-ROC',
    short: 'AUC',
    csvColumn: 'AUC_ROC',
    description:
      'Area under the ROC curve: how well the model scores rank attacks above normal records across all thresholds. 0.5 = random ranking.',
    formula: 'P(score(attack) > score(normal))',
    group: 'ranking',
  },
};

export const METRIC_KEYS: MetricKey[] = [
  'accuracy',
  'weightedPrecision',
  'weightedRecall',
  'weightedF1',
  'attackPrecision',
  'attackRecall',
  'attackF1',
  'aucRoc',
];

/** The five headline metrics used across charts and radar views. */
export const CORE_METRICS: MetricKey[] = ['accuracy', 'attackPrecision', 'attackRecall', 'attackF1', 'aucRoc'];

export const DEFAULT_RANKING_METRIC: MetricKey = 'attackF1';
