import Papa from 'papaparse';
import type {
  BenchmarkRow,
  ClassDistribution,
  ConfusionRow,
  DatasetMetadataEntry,
  MetricKey,
  MetricRecord,
  ParseResult,
  ValidationIssue,
} from '@/types';
import { METRICS, METRIC_KEYS } from '@/data/metrics';
import { canonicalDatasetName } from '@/data/datasets';
import { canonicalModelName } from '@/data/models';
import { rowId } from './format';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Tokens interpreted as an explicitly missing value. */
const MISSING_TOKENS = new Set(['', 'nan', 'null', 'none', 'na', 'n/a', '-', '—', 'undefined', 'missing']);

const HEADER_ALIASES: Record<string, string[]> = {
  dataset: ['dataset', 'data', 'datasetname'],
  model: ['model', 'modelname', 'algorithm', 'classifier'],
  accuracy: ['accuracy', 'acc'],
  weightedPrecision: ['weightedprecision', 'precisionweighted', 'wprecision'],
  weightedRecall: ['weightedrecall', 'recallweighted', 'wrecall'],
  weightedF1: ['weightedf1', 'f1weighted', 'wf1', 'weightedf1score'],
  attackPrecision: ['attackprecision', 'precisionattack', 'precision1', 'attackprec'],
  attackRecall: ['attackrecall', 'recallattack', 'recall1', 'detectionrate'],
  attackF1: ['attackf1', 'f1attack', 'f11', 'attackf1score'],
  aucRoc: ['aucroc', 'auc', 'rocauc', 'areaunderroc'],
  tn: ['tn', 'truenegative', 'truenegatives'],
  fp: ['fp', 'falsepositive', 'falsepositives'],
  fn: ['fn', 'falsenegative', 'falsenegatives'],
  tp: ['tp', 'truepositive', 'truepositives'],
};

function resolveHeaders(headers: string[], wanted: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of headers) {
    const sq = squash(h);
    for (const key of wanted) {
      if (!map.has(key) && HEADER_ALIASES[key].includes(sq)) map.set(key, h);
    }
  }
  return map;
}

export function checkFile(file: File, allowed: string[]): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowed.includes(ext)) {
    return `Unsupported file type ".${ext || '?'}". Expected ${allowed.map((a) => '.' + a).join(' or ')}.`;
  }
  if (file.size === 0) return 'The file is empty.';
  if (file.size > MAX_FILE_BYTES) return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is 5 MB.`;
  return null;
}

function parseCsvText(text: string): { headers: string[]; data: Record<string, string>[]; issues: ValidationIssue[]; fatal?: string } {
  const cleaned = text.replace(/^\uFEFF/, '');
  if (!cleaned.trim()) return { headers: [], data: [], issues: [], fatal: 'The CSV file is empty.' };

  const res = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });

  const issues: ValidationIssue[] = res.errors
    .filter((e) => e.code !== 'UndetectableDelimiter')
    .slice(0, 20)
    .map((e) => ({ level: 'error' as const, message: `CSV parse error: ${e.message}`, row: e.row != null ? e.row + 1 : undefined }));

  const headers = (res.meta.fields ?? []).filter((h) => h !== '');
  if (headers.length === 0) return { headers, data: [], issues, fatal: 'No header row found.' };
  if (res.data.length === 0) return { headers, data: [], issues, fatal: 'The CSV has a header but no data rows.' };
  return { headers, data: res.data, issues };
}

type CellResult = { value: number | null; issue?: ValidationIssue };

function parseMetricCell(raw: string | undefined, row: number, column: string): CellResult {
  const s = (raw ?? '').trim();
  if (MISSING_TOKENS.has(s.toLowerCase())) return { value: null };
  const isPct = s.endsWith('%');
  const num = Number(isPct ? s.slice(0, -1) : s);
  if (!Number.isFinite(num)) {
    return { value: null, issue: { level: 'error', row, column, message: `"${s}" is not a valid number — value rejected and treated as missing.` } };
  }
  const v = isPct ? num / 100 : num;
  if (v < 0 || v > 1) {
    const hint = v > 1 && v <= 100 ? ' If your export uses percentages, divide by 100.' : '';
    return { value: null, issue: { level: 'error', row, column, message: `${s} is outside the valid range 0–1 — value rejected.${hint}` } };
  }
  return { value: v };
}

/* ------------------------------------------------------------------ */
/* Benchmark CSV                                                       */
/* ------------------------------------------------------------------ */

export function parseBenchmarkCsv(text: string): ParseResult<BenchmarkRow> {
  const { headers, data, issues, fatal } = parseCsvText(text);
  if (fatal) return { rows: [], issues, totalRows: 0, ok: false, fatal };

  const cols = resolveHeaders(headers, ['dataset', 'model', ...METRIC_KEYS]);
  const missingRequired = ['dataset', 'model'].filter((k) => !cols.has(k));
  if (missingRequired.length) {
    return {
      rows: [],
      issues,
      totalRows: data.length,
      ok: false,
      fatal: `Missing required column(s): ${missingRequired.map((k) => (k === 'dataset' ? 'Dataset' : 'Model')).join(', ')}. Found: ${headers.join(', ')}.`,
    };
  }
  const presentMetrics = METRIC_KEYS.filter((k) => cols.has(k));
  if (presentMetrics.length === 0) {
    return {
      rows: [],
      issues,
      totalRows: data.length,
      ok: false,
      fatal: `No metric columns recognised. Expected e.g. ${METRIC_KEYS.map((k) => METRICS[k].csvColumn).join(', ')}.`,
    };
  }
  const absent = METRIC_KEYS.filter((k) => !cols.has(k));
  if (absent.length) {
    issues.push({
      level: 'warning',
      message: `Column(s) not present: ${absent.map((k) => METRICS[k].csvColumn).join(', ')}. These metrics will be shown as missing.`,
    });
  }
  const unknown = headers.filter((h) => ![...cols.values()].includes(h));
  if (unknown.length) issues.push({ level: 'warning', message: `Ignored unrecognised column(s): ${unknown.join(', ')}.` });

  const rows: BenchmarkRow[] = [];
  const seen = new Map<string, number>();
  let missingCells = 0;

  data.forEach((rec, i) => {
    const rowNum = i + 1;
    const rawDataset = (rec[cols.get('dataset')!] ?? '').trim();
    const rawModel = (rec[cols.get('model')!] ?? '').trim();
    if (!rawDataset || !rawModel) {
      issues.push({ level: 'error', row: rowNum, message: 'Row skipped: Dataset and Model are required.' });
      return;
    }
    const dataset = canonicalDatasetName(rawDataset);
    const model = canonicalModelName(rawModel);
    const id = rowId(dataset, model);
    if (seen.has(id)) {
      issues.push({ level: 'error', row: rowNum, message: `Duplicate ${dataset} / ${model} (first seen on row ${seen.get(id)}). Row skipped.` });
      return;
    }
    seen.set(id, rowNum);

    const metrics = Object.fromEntries(METRIC_KEYS.map((k) => [k, null])) as MetricRecord;
    for (const k of presentMetrics) {
      const col = cols.get(k)!;
      const res = parseMetricCell(rec[col], rowNum, col);
      if (res.issue) issues.push(res.issue);
      else if (res.value == null) missingCells++;
      metrics[k] = res.value;
    }
    rows.push({ id, dataset, model, metrics });
  });

  if (missingCells > 0) {
    issues.push({ level: 'warning', message: `${missingCells} empty or NaN metric value(s) will be shown as missing and excluded from rankings.` });
  }
  const datasets = new Set(rows.map((r) => r.dataset));
  if (rows.length && datasets.size < 2) {
    issues.push({ level: 'warning', message: `Only one dataset found (${[...datasets][0]}). Cross-dataset views will be limited.` });
  }

  return { rows, issues, totalRows: data.length, ok: rows.length > 0, fatal: rows.length ? undefined : 'No valid rows found.' };
}

/* ------------------------------------------------------------------ */
/* Confusion-matrix CSV                                                */
/* ------------------------------------------------------------------ */

export function parseConfusionCsv(text: string): ParseResult<ConfusionRow> {
  const { headers, data, issues, fatal } = parseCsvText(text);
  if (fatal) return { rows: [], issues, totalRows: 0, ok: false, fatal };

  const cols = resolveHeaders(headers, ['dataset', 'model', 'tn', 'fp', 'fn', 'tp']);
  const missing = ['dataset', 'model', 'tn', 'fp', 'fn', 'tp'].filter((k) => !cols.has(k));
  if (missing.length) {
    return {
      rows: [],
      issues,
      totalRows: data.length,
      ok: false,
      fatal: `Missing required column(s): ${missing.map((m) => (m.length === 2 ? m.toUpperCase() : m[0].toUpperCase() + m.slice(1))).join(', ')}. Expected Dataset,Model,TN,FP,FN,TP.`,
    };
  }

  const rows: ConfusionRow[] = [];
  const seen = new Map<string, number>();
  data.forEach((rec, i) => {
    const rowNum = i + 1;
    const rawDataset = (rec[cols.get('dataset')!] ?? '').trim();
    const rawModel = (rec[cols.get('model')!] ?? '').trim();
    if (!rawDataset || !rawModel) {
      issues.push({ level: 'error', row: rowNum, message: 'Row skipped: Dataset and Model are required.' });
      return;
    }
    const counts: Record<'tn' | 'fp' | 'fn' | 'tp', number> = { tn: 0, fp: 0, fn: 0, tp: 0 };
    let bad = false;
    for (const k of ['tn', 'fp', 'fn', 'tp'] as const) {
      const raw = (rec[cols.get(k)!] ?? '').trim().replace(/,/g, '');
      const n = Number(raw);
      if (raw === '' || !Number.isInteger(n) || n < 0) {
        issues.push({ level: 'error', row: rowNum, column: k.toUpperCase(), message: `"${raw}" is not a non-negative integer count. Row skipped.` });
        bad = true;
      } else counts[k] = n;
    }
    if (bad) return;
    if (counts.tn + counts.fp + counts.fn + counts.tp === 0) {
      issues.push({ level: 'error', row: rowNum, message: 'All four counts are zero. Row skipped.' });
      return;
    }
    const dataset = canonicalDatasetName(rawDataset);
    const model = canonicalModelName(rawModel);
    const id = rowId(dataset, model);
    if (seen.has(id)) {
      issues.push({ level: 'error', row: rowNum, message: `Duplicate ${dataset} / ${model} (first seen on row ${seen.get(id)}). Row skipped.` });
      return;
    }
    seen.set(id, rowNum);
    rows.push({ id, dataset, model, ...counts });
  });

  // Consistency: every model in a dataset should be evaluated on the same test set.
  const byDataset = new Map<string, Set<number>>();
  for (const r of rows) {
    const s = byDataset.get(r.dataset) ?? new Set<number>();
    s.add(r.tn + r.fp + r.fn + r.tp);
    byDataset.set(r.dataset, s);
  }
  for (const [ds, totals] of byDataset) {
    if (totals.size > 1) {
      issues.push({ level: 'warning', message: `${ds}: confusion matrices sum to different totals (${[...totals].join(', ')}). Models may not share the same test set.` });
    }
  }

  return { rows, issues, totalRows: data.length, ok: rows.length > 0, fatal: rows.length ? undefined : 'No valid rows found.' };
}

/* ------------------------------------------------------------------ */
/* Dataset metadata JSON                                               */
/* ------------------------------------------------------------------ */

function parseDistribution(v: unknown, path: string, issues: ValidationIssue[]): ClassDistribution | undefined {
  if (v == null) return undefined;
  if (typeof v !== 'object') {
    issues.push({ level: 'error', message: `${path} must be an object like {"normal": 123, "attack": 456}.` });
    return undefined;
  }
  const o = v as Record<string, unknown>;
  const normal = Number(o.normal);
  const attack = Number(o.attack);
  if (!Number.isInteger(normal) || normal < 0 || !Number.isInteger(attack) || attack < 0) {
    issues.push({ level: 'error', message: `${path}: "normal" and "attack" must be non-negative integers. Ignored.` });
    return undefined;
  }
  return { normal, attack };
}

export function parseMetadataJson(text: string): ParseResult<DatasetMetadataEntry> {
  const issues: ValidationIssue[] = [];
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    return { rows: [], issues, totalRows: 0, ok: false, fatal: `Invalid JSON: ${(e as Error).message}` };
  }

  let list: unknown[] = [];
  if (Array.isArray(json)) list = json;
  else if (json && typeof json === 'object' && Array.isArray((json as { datasets?: unknown }).datasets)) list = (json as { datasets: unknown[] }).datasets;
  else if (json && typeof json === 'object') list = Object.entries(json as object).map(([k, v]) => ({ dataset: k, ...(v as object) }));

  if (list.length === 0) return { rows: [], issues, totalRows: 0, ok: false, fatal: 'No dataset entries found. Expected {"datasets": [...]}.' };

  const rows: DatasetMetadataEntry[] = [];
  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      issues.push({ level: 'error', row: i + 1, message: 'Entry is not an object. Skipped.' });
      return;
    }
    const o = item as Record<string, unknown>;
    if (typeof o.dataset !== 'string' || !o.dataset.trim()) {
      issues.push({ level: 'error', row: i + 1, message: 'Entry is missing a "dataset" name. Skipped.' });
      return;
    }
    const dataset = canonicalDatasetName(o.dataset);
    if (rows.some((r) => r.dataset === dataset)) {
      issues.push({ level: 'error', row: i + 1, message: `Duplicate entry for ${dataset}. Skipped.` });
      return;
    }
    rows.push({
      dataset,
      description: typeof o.description === 'string' ? o.description : undefined,
      train: parseDistribution(o.train, `${dataset}.train`, issues),
      test: parseDistribution(o.test, `${dataset}.test`, issues),
      notes: Array.isArray(o.notes) ? o.notes.filter((n): n is string => typeof n === 'string') : undefined,
    });
  });

  return { rows, issues, totalRows: list.length, ok: rows.length > 0, fatal: rows.length ? undefined : 'No valid entries found.' };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function benchmarksToCsv(rows: { rank?: number | null; row: BenchmarkRow }[]): string {
  const keys: MetricKey[] = METRIC_KEYS;
  const data = rows.map(({ rank, row }) => ({
    Rank: rank ?? '',
    Dataset: row.dataset,
    Model: row.model,
    ...Object.fromEntries(keys.map((k) => [METRICS[k].csvColumn, row.metrics[k] ?? ''])),
  }));
  return Papa.unparse(data);
}

export function downloadText(content: string, fileName: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
