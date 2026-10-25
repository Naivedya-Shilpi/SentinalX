import { create } from 'zustand';
import type { Artifact, BenchmarkRow, ConfusionRow, DatasetMetadataEntry, DatasetView, MetricKey } from '@/types';
import { DEMO_BENCHMARKS, DEMO_CONFUSION, DEMO_FILE_LABEL } from '@/data/demoData';
import { DEFAULT_RANKING_METRIC, METRIC_KEYS } from '@/data/metrics';

const STORAGE_KEY = 'sentinelx:v1';

type Theme = 'dark' | 'light';

interface PersistedState {
  benchmarks: Artifact<BenchmarkRow>;
  confusion: Artifact<ConfusionRow>;
  metadata: Artifact<DatasetMetadataEntry>;
  datasetView: DatasetView;
  rankingMetric: MetricKey;
  visibleModels: string[];
  theme: Theme;
  sidebarCollapsed: boolean;
}

export interface AppState extends PersistedState {
  storageError: string | null;
  presentation: boolean;
  paletteOpen: boolean;
  focusRowId: string | null;
  modelQuery: string;

  setModelQuery: (q: string) => void;
  setDatasetView: (v: DatasetView) => void;
  setRankingMetric: (m: MetricKey) => void;
  setVisibleModels: (models: string[]) => void;
  toggleModel: (model: string, all: string[]) => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setPresentation: (on: boolean) => void;
  setPaletteOpen: (on: boolean) => void;
  setFocusRowId: (id: string | null) => void;

  importBenchmarks: (rows: BenchmarkRow[], fileName: string) => void;
  importConfusion: (rows: ConfusionRow[], fileName: string) => void;
  importMetadata: (rows: DatasetMetadataEntry[], fileName: string) => void;
  clearArtifact: (kind: 'benchmarks' | 'confusion' | 'metadata') => void;
  resetToDemo: () => void;
  clearAll: () => void;
}

const demoArtifacts = (): Pick<PersistedState, 'benchmarks' | 'confusion' | 'metadata'> => ({
  benchmarks: { source: 'demo', rows: DEMO_BENCHMARKS, fileName: DEMO_FILE_LABEL },
  confusion: { source: 'demo', rows: DEMO_CONFUSION, fileName: DEMO_FILE_LABEL },
  metadata: { source: null, rows: [] },
});

const empty = <T,>(): Artifact<T> => ({ source: null, rows: [] });

const DEFAULTS: PersistedState = {
  ...demoArtifacts(),
  datasetView: 'both',
  rankingMetric: DEFAULT_RANKING_METRIC,
  visibleModels: [],
  theme: 'dark',
  sidebarCollapsed: false,
};

function isArtifact(a: unknown): a is Artifact<unknown> {
  return !!a && typeof a === 'object' && Array.isArray((a as Artifact<unknown>).rows);
}

function load(): { state: PersistedState; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: DEFAULTS, error: null };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const state: PersistedState = { ...DEFAULTS };
    // Demo artifacts are always re-hydrated from source code so code fixes propagate.
    if (isArtifact(parsed.benchmarks)) state.benchmarks = parsed.benchmarks.source === 'demo' ? DEFAULTS.benchmarks : (parsed.benchmarks as Artifact<BenchmarkRow>);
    if (isArtifact(parsed.confusion)) state.confusion = parsed.confusion.source === 'demo' ? DEFAULTS.confusion : (parsed.confusion as Artifact<ConfusionRow>);
    if (isArtifact(parsed.metadata)) state.metadata = parsed.metadata as Artifact<DatasetMetadataEntry>;
    if (typeof parsed.datasetView === 'string') state.datasetView = parsed.datasetView;
    if (parsed.rankingMetric && METRIC_KEYS.includes(parsed.rankingMetric)) state.rankingMetric = parsed.rankingMetric;
    if (Array.isArray(parsed.visibleModels)) state.visibleModels = parsed.visibleModels.filter((m) => typeof m === 'string');
    if (parsed.theme === 'light' || parsed.theme === 'dark') state.theme = parsed.theme;
    if (typeof parsed.sidebarCollapsed === 'boolean') state.sidebarCollapsed = parsed.sidebarCollapsed;
    return { state, error: null };
  } catch (e) {
    return { state: DEFAULTS, error: `Could not read saved data from browser storage (${(e as Error).message}). Demo data loaded instead.` };
  }
}

const initial = load();

export const useAppStore = create<AppState>()((set, get) => ({
  ...initial.state,
  storageError: initial.error,
  presentation: false,
  paletteOpen: false,
  focusRowId: null,
  modelQuery: '',

  setModelQuery: (modelQuery) => set({ modelQuery }),
  setDatasetView: (datasetView) => set({ datasetView }),
  setRankingMetric: (rankingMetric) => set({ rankingMetric }),
  setVisibleModels: (visibleModels) => set({ visibleModels }),
  toggleModel: (model, all) => {
    const current = get().visibleModels.length ? get().visibleModels : all;
    const next = current.includes(model) ? current.filter((m) => m !== model) : [...current, model];
    // Never allow an empty selection; an empty array means "all".
    set({ visibleModels: next.length === 0 || next.length === all.length ? [] : next });
  },
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setPresentation: (presentation) => set({ presentation }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setFocusRowId: (focusRowId) => set({ focusRowId }),

  importBenchmarks: (rows, fileName) =>
    set({ benchmarks: { source: 'imported', rows, fileName, importedAt: new Date().toISOString() }, visibleModels: [], datasetView: 'both' }),
  importConfusion: (rows, fileName) => set({ confusion: { source: 'imported', rows, fileName, importedAt: new Date().toISOString() } }),
  importMetadata: (rows, fileName) => set({ metadata: { source: 'imported', rows, fileName, importedAt: new Date().toISOString() } }),
  clearArtifact: (kind) => set({ [kind]: empty() } as Partial<AppState>),
  resetToDemo: () => set({ ...demoArtifacts(), visibleModels: [], datasetView: 'both' }),
  clearAll: () => set({ benchmarks: empty(), confusion: empty(), metadata: empty(), visibleModels: [], datasetView: 'both' }),
}));

/* ---------------- Persistence (guarded against storage failures) ---------------- */
let saveTimer: number | undefined;
useAppStore.subscribe((s) => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const persisted: PersistedState = {
      // Demo rows are not stored verbatim — only a marker — keeping storage small.
      benchmarks: s.benchmarks.source === 'demo' ? { ...s.benchmarks, rows: [] } : s.benchmarks,
      confusion: s.confusion.source === 'demo' ? { ...s.confusion, rows: [] } : s.confusion,
      metadata: s.metadata,
      datasetView: s.datasetView,
      rankingMetric: s.rankingMetric,
      visibleModels: s.visibleModels,
      theme: s.theme,
      sidebarCollapsed: s.sidebarCollapsed,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      if (useAppStore.getState().storageError) useAppStore.setState({ storageError: null });
    } catch (e) {
      const msg = `Browser storage is unavailable or full (${(e as Error).name}). Changes will be lost on refresh.`;
      if (useAppStore.getState().storageError !== msg) useAppStore.setState({ storageError: msg });
    }
  }, 150);
});

/* ---------------- Toasts ---------------- */
export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), t.kind === 'error' ? 7000 : 4500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);
