import { describe, expect, it } from 'vitest';
import { DEMO_BENCHMARKS, DEMO_CONFUSION, DEMO_METADATA, DEMO_REPORTED } from '@/data/demoData';
import { METRIC_KEYS } from '@/data/metrics';
import { bestEntries, rankRows } from '@/utils/ranking';
import { deriveFromConfusion, isValidMetric, safeDiv } from '@/utils/metrics';
import { parseBenchmarkCsv, parseConfusionCsv, parseMetadataJson } from '@/utils/csv';
import { diffRows } from '@/utils/insights';
import { fmtPP } from '@/utils/format';
import type { BenchmarkRow, MetricKey } from '@/types';

const winner = (ds: string, m: MetricKey) => bestEntries(DEMO_BENCHMARKS, ds, m).map((e) => e.row.model);

describe('Databricks CSV integration validation', () => {
  it('loads exactly 10 benchmark records and 10 confusion matrix records with 1-to-1 matching', () => {
    expect(DEMO_BENCHMARKS).toHaveLength(10);
    expect(DEMO_CONFUSION).toHaveLength(10);
    const benchIds = DEMO_BENCHMARKS.map((r) => r.id);
    const confIds = DEMO_CONFUSION.map((r) => r.id);
    expect(new Set(benchIds).size).toBe(10);
    expect(new Set(confIds).size).toBe(10);
    expect(benchIds).toEqual(confIds);
  });

  it('has numeric values for all 8 metrics across all 10 benchmark records', () => {
    for (const row of DEMO_BENCHMARKS) {
      for (const key of METRIC_KEYS) {
        expect(isValidMetric(row.metrics[key])).toBe(true);
      }
    }
  });

  it('uses the corrected UNSW-NB15 Naive Bayes result from final_benchmarks.csv', () => {
    const nb = DEMO_BENCHMARKS.find((r) => r.dataset === 'UNSW-NB15' && r.model === 'Naive Bayes')!;
    expect(nb.metrics).toEqual({
      accuracy: 0.7722,
      weightedPrecision: 0.799,
      weightedRecall: 0.7722,
      weightedF1: 0.7712,
      attackPrecision: 0.8883,
      attackRecall: 0.6707,
      attackF1: 0.7643,
      aucRoc: 0.6959,
    });
  });

  it('derives test-set class distributions from confusion matrices without mixing training counts', () => {
    expect(DEMO_METADATA).toHaveLength(2);
    const unsw = DEMO_METADATA.find((m) => m.dataset === 'UNSW-NB15')!;
    const nsl = DEMO_METADATA.find((m) => m.dataset === 'NSL-KDD')!;
    expect(unsw.train).toBeUndefined();
    expect(unsw.test).toEqual({ normal: 37000, attack: 45332 });
    expect(nsl.train).toBeUndefined();
    expect(nsl.test).toEqual({ normal: 9711, attack: 12833 });
  });
});

describe('expected ranking checks (demo data)', () => {
  it('UNSW-NB15', () => {
    expect(winner('UNSW-NB15', 'accuracy')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('UNSW-NB15', 'attackRecall')).toEqual(['Random Forest']);
    expect(winner('UNSW-NB15', 'attackF1')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('UNSW-NB15', 'aucRoc')).toEqual(['Gradient-Boosted Trees']);
  });
  it('NSL-KDD', () => {
    expect(winner('NSL-KDD', 'accuracy')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('NSL-KDD', 'attackPrecision')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('NSL-KDD', 'attackRecall')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('NSL-KDD', 'attackF1')).toEqual(['Gradient-Boosted Trees']);
    expect(winner('NSL-KDD', 'aucRoc')).toEqual(['Random Forest']);
  });
});

describe('confusion-derived metrics', () => {
  it('recomputes UNSW Naive Bayes precision and F1 at full precision and matches the CSV export', () => {
    const nb = DEMO_BENCHMARKS.find((r) => r.dataset === 'UNSW-NB15' && r.model === 'Naive Bayes')!;
    const nbCm = DEMO_CONFUSION.find((r) => r.dataset === 'UNSW-NB15' && r.model === 'Naive Bayes')!;
    const derived = deriveFromConfusion(nbCm);
    expect(derived.attackPrecision).toBeCloseTo(30405 / (30405 + 3825), 12);
    expect(nb.metrics.attackPrecision!).toBeCloseTo(derived.attackPrecision!, 4);
    expect(nb.metrics.attackPrecision!).toBe(0.8883); // corrected CSV value, not the rounded 0.8900
    expect(nb.metrics.attackF1!).toBe(0.7643);
  });
  it('matches the confusion-derived accuracy within rounding for every model', () => {
    for (const rep of DEMO_REPORTED) {
      const row = DEMO_BENCHMARKS.find((r) => r.dataset === rep.dataset && r.model === rep.model)!;
      const cm = DEMO_CONFUSION.find((r) => r.dataset === rep.dataset && r.model === rep.model)!;
      const derived = deriveFromConfusion(cm);
      expect(Math.abs(row.metrics.accuracy! - derived.accuracy!)).toBeLessThan(0.0006);
    }
  });
  it('test sets sum to the documented record counts', () => {
    for (const c of DEMO_CONFUSION) {
      const total = c.tn + c.fp + c.fn + c.tp;
      expect(total).toBe(c.dataset === 'UNSW-NB15' ? 82332 : 22544);
    }
  });
  it('weighted recall equals accuracy for binary problems', () => {
    const d = deriveFromConfusion({ tn: 10, fp: 5, fn: 3, tp: 12 });
    expect(d.weightedRecall).toBeCloseTo(d.accuracy!, 12);
  });
  it('safe division never returns NaN', () => {
    expect(safeDiv(1, 0)).toBeNull();
    const d = deriveFromConfusion({ tn: 5, fp: 0, fn: 0, tp: 0 });
    expect(d.attackPrecision).toBeNull();
    expect(d.attackF1).toBeNull();
    expect(d.falseNegativeRate).toBeNull();
  });
});

describe('ranking engine', () => {
  const mk = (model: string, v: number | null): BenchmarkRow => ({
    id: model,
    dataset: 'D',
    model,
    metrics: { accuracy: v, weightedPrecision: null, weightedRecall: null, weightedF1: null, attackPrecision: null, attackRecall: null, attackF1: null, aucRoc: null },
  });
  it('shares ranks for ties (1-1-3) and flags them', () => {
    const { ranked } = rankRows([mk('A', 0.9), mk('B', 0.9), mk('C', 0.5)], 'accuracy');
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(ranked[0].tied).toBe(true);
    expect(ranked[2].tied).toBe(false);
  });
  it('never ranks missing values or treats them as zero', () => {
    const { ranked, unranked } = rankRows([mk('A', 0.2), mk('B', null)], 'accuracy');
    expect(ranked).toHaveLength(1);
    expect(unranked.map((r) => r.model)).toEqual(['B']);
  });
});

describe('head-to-head differences', () => {
  it('uses percentage points', () => {
    const gbt = DEMO_BENCHMARKS.find((r) => r.dataset === 'UNSW-NB15' && r.model === 'Gradient-Boosted Trees')!;
    const rf = DEMO_BENCHMARKS.find((r) => r.dataset === 'UNSW-NB15' && r.model === 'Random Forest')!;
    const auc = diffRows(gbt, rf).find((d) => d.metric === 'aucRoc')!;
    expect(auc.delta!).toBeCloseTo(0.9720 - 0.9134, 10);
    expect(fmtPP(auc.delta)).toBe('+5.86 pp');
    expect(auc.winner).toBe('a');
  });
});

describe('CSV import validation', () => {
  const header = 'Dataset,Model,Accuracy,Weighted_Precision,Weighted_Recall,Weighted_F1,Attack_Precision,Attack_Recall,Attack_F1,AUC_ROC';
  it('parses quoted values and trims whitespace', () => {
    const r = parseBenchmarkCsv(`${header}\n" UNSW-NB15 ", "GBTClassifier" ,0.8,0.8,0.8,0.8,0.7,0.9,0.8,0.9`);
    expect(r.ok).toBe(true);
    expect(r.rows[0].dataset).toBe('UNSW-NB15');
    expect(r.rows[0].model).toBe('Gradient-Boosted Trees');
  });
  it('treats NaN/empty as missing, rejects out-of-range and non-numeric', () => {
    const r = parseBenchmarkCsv(`${header}\nNSL-KDD,Random Forest,NaN,,,,1.5,abc,0.5,0.6`);
    const m = r.rows[0].metrics;
    expect(m.accuracy).toBeNull();
    expect(m.attackPrecision).toBeNull();
    expect(m.attackRecall).toBeNull();
    expect(m.attackF1).toBe(0.5);
    expect(r.issues.filter((i) => i.level === 'error')).toHaveLength(2);
  });
  it('reports duplicates', () => {
    const r = parseBenchmarkCsv(`${header}\nNSL-KDD,Naive Bayes,.5,.5,.5,.5,.5,.5,.5,.5\nNSL-KDD,Naive Bayes,.6,.6,.6,.6,.6,.6,.6,.6`);
    expect(r.rows).toHaveLength(1);
    expect(r.issues.some((i) => /Duplicate/.test(i.message))).toBe(true);
  });
  it('fails clearly on empty files and missing columns', () => {
    expect(parseBenchmarkCsv('').ok).toBe(false);
    expect(parseBenchmarkCsv('Foo,Bar\n1,2').fatal).toMatch(/Missing required column/);
    expect(parseBenchmarkCsv('Dataset,Model\nA,B').fatal).toMatch(/No metric columns/);
  });
  it('validates confusion CSV counts', () => {
    const ok = parseConfusionCsv('Dataset,Model,TN,FP,FN,TP\nNSL-KDD,Naive Bayes,9445,266,5190,7643');
    expect(ok.rows[0]).toMatchObject({ tn: 9445, fp: 266, fn: 5190, tp: 7643 });
    const bad = parseConfusionCsv('Dataset,Model,TN,FP,FN,TP\nNSL-KDD,Naive Bayes,-1,2,3,x');
    expect(bad.ok).toBe(false);
  });
  it('parses metadata JSON and rejects invalid JSON', () => {
    const ok = parseMetadataJson('{"datasets":[{"dataset":"nsl_kdd","train":{"normal":10,"attack":5}}]}');
    expect(ok.rows[0].dataset).toBe('NSL-KDD');
    expect(parseMetadataJson('{oops').ok).toBe(false);
  });
});
