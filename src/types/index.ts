/** Every scalar benchmark metric the platform understands (all on a 0–1 scale). */
export type MetricKey =
  | 'accuracy'
  | 'weightedPrecision'
  | 'weightedRecall'
  | 'weightedF1'
  | 'attackPrecision'
  | 'attackRecall'
  | 'attackF1'
  | 'aucRoc';

/** A metric value is either a finite number in [0, 1] or explicitly missing. Never 0-as-missing. */
export type MetricValue = number | null;

export type MetricRecord = Record<MetricKey, MetricValue>;

export type DataSource = 'demo' | 'imported';

/** One dataset × model evaluation result. */
export interface BenchmarkRow {
  id: string;
  dataset: string;
  model: string;
  metrics: MetricRecord;
  /** Optional per-metric provenance note (e.g. "derived from confusion matrix"). */
  provenance?: Partial<Record<MetricKey, string>>;
}

/** Binary confusion matrix counts on the held-out test set (positive class = Attack). */
export interface ConfusionRow {
  id: string;
  dataset: string;
  model: string;
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface ClassDistribution {
  normal: number;
  attack: number;
}

export interface DatasetMetadataEntry {
  dataset: string;
  description?: string;
  train?: ClassDistribution;
  test?: ClassDistribution;
  notes?: string[];
}

/** A persisted data artifact (benchmarks, confusion matrices or metadata). */
export interface Artifact<T> {
  source: DataSource | null;
  rows: T[];
  fileName?: string;
  importedAt?: string;
}

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  message: string;
  /** 1-based data row number (excluding header) when applicable. */
  row?: number;
  column?: string;
}

export interface ParseResult<T> {
  rows: T[];
  issues: ValidationIssue[];
  totalRows: number;
  /** True when at least one valid row exists and no fatal (file-level) error occurred. */
  ok: boolean;
  fatal?: string;
}

/** "both" is the Compare Both view; otherwise a dataset name. */
export type DatasetView = string;

export interface RankedEntry {
  row: BenchmarkRow;
  value: number;
  rank: number;
  tied: boolean;
}

export interface RankingResult {
  ranked: RankedEntry[];
  /** Rows excluded from ranking because the metric is missing. */
  unranked: BenchmarkRow[];
}
