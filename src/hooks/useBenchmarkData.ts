import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { DATASETS, datasetOrder } from '@/data/datasets';
import { modelOrder } from '@/data/models';
import type { BenchmarkRow, ConfusionRow } from '@/types';

const unique = <T,>(xs: T[]) => [...new Set(xs)];

export interface BenchmarkData {
  rows: BenchmarkRow[];
  confusionRows: ConfusionRow[];
  datasets: string[];
  models: string[];
  /** Datasets in scope for the global dataset switcher. */
  activeDatasets: string[];
  /** Models in scope for the global model filter. */
  shownModels: string[];
  /** Rows within active datasets and shown models. */
  filteredRows: BenchmarkRow[];
  isCompare: boolean;
  hasData: boolean;
  getRow: (dataset: string, model: string) => BenchmarkRow | undefined;
  getConfusion: (dataset: string, model: string) => ConfusionRow | undefined;
}

export function useBenchmarkData(): BenchmarkData {
  const benchmarks = useAppStore((s) => s.benchmarks);
  const confusion = useAppStore((s) => s.confusion);
  const metadata = useAppStore((s) => s.metadata);
  const datasetView = useAppStore((s) => s.datasetView);
  const visibleModels = useAppStore((s) => s.visibleModels);

  return useMemo(() => {
    const rows = benchmarks.rows;
    const confusionRows = confusion.rows;
    const loadedDatasets = unique([
      ...rows.map((r) => r.dataset),
      ...confusionRows.map((r) => r.dataset),
      ...metadata.rows.map((r) => r.dataset),
    ]).sort((a, b) => datasetOrder(a) - datasetOrder(b) || a.localeCompare(b));
    const datasets = loadedDatasets.length > 0 ? loadedDatasets : DATASETS.map((d) => d.name);
    const models = unique(rows.map((r) => r.model)).sort((a, b) => modelOrder(a) - modelOrder(b) || a.localeCompare(b));
    const activeDatasets = datasetView === 'both' || !datasets.includes(datasetView) ? datasets : [datasetView];
    const vis = visibleModels.filter((m) => models.includes(m));
    const shownModels = vis.length ? vis : models;
    const filteredRows = rows.filter((r) => activeDatasets.includes(r.dataset) && shownModels.includes(r.model));
    const rowIndex = new Map(rows.map((r) => [`${r.dataset}|${r.model}`, r]));
    const cmIndex = new Map(confusionRows.map((r) => [`${r.dataset}|${r.model}`, r]));

    return {
      rows,
      confusionRows,
      datasets,
      models,
      activeDatasets,
      shownModels,
      filteredRows,
      isCompare: activeDatasets.length > 1,
      hasData: rows.length > 0,
      getRow: (d, m) => rowIndex.get(`${d}|${m}`),
      getConfusion: (d, m) => cmIndex.get(`${d}|${m}`),
    };
  }, [benchmarks, confusion, metadata, datasetView, visibleModels]);
}
