import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, FileSpreadsheet, FlaskConical, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { useAppStore, toast } from '@/store/useAppStore';
import type { Artifact, ParseResult } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Callout } from '@/components/ui/Feedback';
import { PageHeader, SourceBadge } from '@/components/common/Controls';
import { checkFile, downloadText, parseBenchmarkCsv, parseConfusionCsv, parseMetadataJson } from '@/utils/csv';
import { METRICS, METRIC_KEYS } from '@/data/metrics';
import { cn, fmtDate, fmtInt } from '@/utils/format';

type Kind = 'benchmarks' | 'confusion' | 'metadata';

interface Report {
  fileName: string;
  result: ParseResult<unknown>;
  committed: boolean;
}

const BENCH_HEADER = ['Dataset', 'Model', ...METRIC_KEYS.map((k) => METRICS[k].csvColumn)].join(',');

function UploadCard({ kind, title, description, schema, accept, icon, optional }: { kind: Kind; title: string; description: string; schema: string; accept: string[]; icon: React.ReactNode; optional?: boolean }) {
  const artifact = useAppStore((s) => s[kind]) as Artifact<unknown>;
  const importBenchmarks = useAppStore((s) => s.importBenchmarks);
  const importConfusion = useAppStore((s) => s.importConfusion);
  const importMetadata = useAppStore((s) => s.importMetadata);
  const clearArtifact = useAppStore((s) => s.clearArtifact);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    const bad = checkFile(file, accept);
    if (bad) {
      setReport(null);
      toast({ kind: 'error', title: `${file.name} rejected`, description: bad });
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const result: ParseResult<unknown> =
        kind === 'benchmarks' ? parseBenchmarkCsv(text) : kind === 'confusion' ? parseConfusionCsv(text) : parseMetadataJson(text);
      if (result.ok) {
        if (kind === 'benchmarks') importBenchmarks(result.rows as never, file.name);
        else if (kind === 'confusion') importConfusion(result.rows as never, file.name);
        else importMetadata(result.rows as never, file.name);
        const errors = result.issues.filter((i) => i.level === 'error').length;
        toast({
          kind: errors ? 'warning' : 'success',
          title: `Imported ${file.name}`,
          description: `${result.rows.length} of ${result.totalRows} row(s) accepted${errors ? `, ${errors} skipped or rejected` : ''}.`,
        });
      } else {
        toast({ kind: 'error', title: `Could not import ${file.name}`, description: result.fatal ?? 'Validation failed.' });
      }
      setReport({ fileName: file.name, result, committed: result.ok });
    } catch (e) {
      toast({ kind: 'error', title: `Could not read ${file.name}`, description: (e as Error).message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const errors = report?.result.issues.filter((i) => i.level === 'error') ?? [];
  const warnings = report?.result.issues.filter((i) => i.level === 'warning') ?? [];
  const loaded = artifact.rows.length > 0;

  return (
    <Card>
      <CardHeader
        as="h2"
        icon={icon}
        title={<span className="inline-flex items-center gap-2">{title}{optional && <Badge>Optional</Badge>}</span>}
        subtitle={description}
        actions={<SourceBadge source={loaded ? artifact.source : null} />}
      />
      <CardBody className="space-y-4">
        <p className="num rounded-lg bg-bg-2/70 px-3 py-2 text-[11px] leading-relaxed text-muted break-words">{schema}</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files?.[0]); }}
          className={cn('relative rounded-xl border border-dashed p-6 text-center transition-colors', drag ? 'border-cyan bg-cyan/10' : 'border-line/20 hover:border-line/40')}
        >
          <UploadCloud className="mx-auto h-6 w-6 text-cyan" />
          <p className="mt-2 text-sm font-medium">{busy ? 'Validating…' : loaded && artifact.source === 'imported' ? 'Drop a file to replace the current import' : 'Drop a file here'}</p>
          <p className="text-xs text-subtle">{accept.map((a) => '.' + a).join(' / ')} · max 5 MB · parsed locally, never uploaded</p>
          <input ref={inputRef} id={`file-${kind}`} type="file" accept={accept.map((a) => '.' + a).join(',')} className="sr-only" onChange={(e) => void handle(e.target.files?.[0])} aria-label={`Choose ${title} file`} />
          <Button className="mt-3" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>Choose file</Button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-lg border border-line/10 p-3"><dt className="label-xs">Active file</dt><dd className="mt-1 break-words">{loaded ? artifact.fileName ?? '—' : 'None'}</dd></div>
          <div className="rounded-lg border border-line/10 p-3"><dt className="label-xs">Rows loaded</dt><dd className="num mt-1">{fmtInt(artifact.rows.length)}</dd></div>
          <div className="col-span-2 rounded-lg border border-line/10 p-3"><dt className="label-xs">Status</dt><dd className="mt-1">{!loaded ? 'No data loaded' : artifact.source === 'demo' ? 'Built-in demo data' : `Imported ${fmtDate(artifact.importedAt)}`}</dd></div>
        </dl>

        {report && (
          <div className="space-y-2" aria-live="polite">
            <p className="flex items-center gap-2 text-[13px] font-medium">
              {report.committed ? <CheckCircle2 className="h-4 w-4 text-emerald" /> : <XCircle className="h-4 w-4 text-coral" />}
              {report.fileName}: {report.committed ? `${report.result.rows.length} of ${report.result.totalRows} rows accepted` : 'import failed'}
            </p>
            {report.result.fatal && !report.committed && <Callout tone="danger">{report.result.fatal}</Callout>}
            {(errors.length > 0 || warnings.length > 0) && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line/10 bg-bg-2/60 p-3 text-xs">
                {[...errors, ...warnings].slice(0, 60).map((i, idx) => (
                  <li key={idx} className={cn('flex gap-2', i.level === 'error' ? 'text-coral' : 'text-amber')}>
                    {i.level === 'error' ? <XCircle className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
                    <span className="text-fg/85">{i.row != null && <span className="num text-subtle">Row {i.row}{i.column ? ` · ${i.column}` : ''}: </span>}{i.message}</span>
                  </li>
                ))}
                {errors.length + warnings.length > 60 && <li className="text-subtle">…and {errors.length + warnings.length - 60} more.</li>}
              </ul>
            )}
          </div>
        )}

        {loaded && (
          <Button variant="danger" size="sm" onClick={() => { clearArtifact(kind); setReport(null); toast({ kind: 'info', title: `${title} cleared` }); }}>
            <Trash2 className="h-4 w-4" /> Clear this data
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export default function DataImport() {
  const resetToDemo = useAppStore((s) => s.resetToDemo);
  const clearAll = useAppStore((s) => s.clearAll);
  const storageError = useAppStore((s) => s.storageError);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Local-first"
        title="Data Import"
        description="Load results exported from Databricks. Files are parsed in your browser, stored in local storage and never sent anywhere. Every other page is computed from what you load here."
        actions={
          <>
            <Button variant="secondary" onClick={() => { resetToDemo(); toast({ kind: 'info', title: 'Reset to demo data', description: 'Built-in demonstration results are active again.' }); }}>
              <FlaskConical className="h-4 w-4" /> Reset to demo data
            </Button>
            <Button variant="danger" onClick={() => { clearAll(); toast({ kind: 'info', title: 'All data cleared', description: 'Pages will show import prompts until data is loaded.' }); }}>
              <Trash2 className="h-4 w-4" /> Clear everything
            </Button>
          </>
        }
      />

      {storageError && <Callout tone="warning" title="Browser storage problem">{storageError}</Callout>}

      <Callout tone="info" title="Demo vs imported data">
        The built-in demo contains the project’s recorded experiment results, recomputed from exact confusion-matrix counts (AUC-ROC uses the reported values). Badges across the app show whether you are viewing <b>Demo</b> or <b>Imported</b> data. Importing a file replaces the demo for that data type only.
      </Callout>

      <div className="grid gap-6 xl:grid-cols-3">
        <UploadCard
          kind="benchmarks"
          title="Benchmark results"
          description="Primary metrics per dataset and model."
          schema={BENCH_HEADER}
          accept={['csv']}
          icon={<FileSpreadsheet className="h-4 w-4" />}
        />
        <UploadCard
          kind="confusion"
          title="Confusion matrices"
          description="Exact test-set counts for the Confusion Matrix Lab."
          schema="Dataset,Model,TN,FP,FN,TP"
          accept={['csv']}
          icon={<FileSpreadsheet className="h-4 w-4" />}
          optional
        />
        <UploadCard
          kind="metadata"
          title="Dataset metadata"
          description="Class distribution counts and descriptions."
          schema={'{"datasets":[{"dataset":"NSL-KDD","train":{"normal":0,"attack":0},"test":{"normal":0,"attack":0},"description":"…"}]}'}
          accept={['json']}
          icon={<FileJson className="h-4 w-4" />}
          optional
        />
      </div>

      <Card>
        <CardHeader as="h2" title="Format notes" />
        <CardBody className="grid gap-6 text-[13px] leading-relaxed text-muted md:grid-cols-2">
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Required benchmark columns: <span className="num text-fg">Dataset, Model</span> plus at least one metric column. Headers are case-insensitive.</li>
            <li>Metrics must be on a <span className="text-fg">0–1</span> scale. Values outside it, or non-numeric text, are rejected and counted as missing.</li>
            <li>Empty cells and <span className="num">NaN</span>/<span className="num">null</span> are treated as <span className="text-fg">missing</span> — never as zero — and are excluded from rankings.</li>
            <li>Duplicate Dataset + Model rows are reported and the later row is skipped.</li>
          </ul>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Model names are matched flexibly (e.g. <span className="num">GBTClassifier</span> → Gradient-Boosted Trees); unknown models are kept as written.</li>
            <li>Confusion-matrix counts must be non-negative integers. Nothing is estimated from rounded metrics.</li>
            <li>Metadata JSON may be an array, or an object with a <span className="num">datasets</span> array.</li>
            <li className="list-none -ml-4 mt-2"><Button variant="outline" size="sm" onClick={() => downloadText(BENCH_HEADER + '\n', 'sentinelx-benchmark-template.csv')}><Download className="h-4 w-4" /> Download benchmark CSV template</Button></li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
