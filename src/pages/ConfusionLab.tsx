import { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid2x2 } from 'lucide-react';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useAppStore } from '@/store/useAppStore';
import { datasetColor } from '@/data/datasets';
import { modelColor } from '@/data/models';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, Callout } from '@/components/ui/Feedback';
import { InfoTip } from '@/components/ui/InfoTip';
import { ActiveSource, DatasetPicker, PageHeader } from '@/components/common/Controls';
import { ImportPrompt } from '@/components/ui/Feedback';
import { deriveFromConfusion } from '@/utils/metrics';
import { cn, fmtInt, fmtPct, fmtScore } from '@/utils/format';
import type { MetricValue } from '@/types';

const CELLS = {
  tn: { label: 'True Negative', tone: 'emerald', tip: 'Normal traffic correctly classified as normal.' },
  fp: { label: 'False Positive', tone: 'amber', tip: 'Normal traffic wrongly flagged as an attack — a false alarm.' },
  fn: { label: 'False Negative', tone: 'coral', tip: 'Real attack classified as normal — a missed attack.' },
  tp: { label: 'True Positive', tone: 'emerald', tip: 'Attack correctly detected.' },
} as const;

const TONE = {
  emerald: 'border-emerald/30 bg-emerald/[0.09] hover:bg-emerald/[0.15] text-emerald',
  amber: 'border-amber/30 bg-amber/[0.09] hover:bg-amber/[0.15] text-amber',
  coral: 'border-coral/30 bg-coral/[0.09] hover:bg-coral/[0.15] text-coral',
};

export default function ConfusionLab() {
  const { confusionRows, getConfusion } = useBenchmarkData();
  const globalView = useAppStore((s) => s.datasetView);
  const source = useAppStore((s) => s.confusion.source);

  const datasets = [...new Set(confusionRows.map((r) => r.dataset))];
  const [dsState, setDs] = useState('');
  const ds = datasets.includes(dsState) ? dsState : datasets.includes(globalView) ? globalView : datasets[0] ?? '';
  const models = confusionRows.filter((r) => r.dataset === ds).map((r) => r.model);
  const [modelState, setModel] = useState('');
  const model = models.includes(modelState) ? modelState : models[0] ?? '';

  const cm = getConfusion(ds, model);
  const d = cm ? deriveFromConfusion(cm) : null;

  if (!confusionRows.length)
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Prediction summaries" title="Confusion Matrix Lab" />
        <Card>
          <EmptyState
            icon={<Grid2x2 className="h-5 w-5" />}
            title="No confusion matrices imported"
            description="Counts are never estimated from rounded metrics. Import a CSV with the columns Dataset,Model,TN,FP,FN,TP to explore them."
            action={<ImportPrompt what="confusion matrices" />}
          />
        </Card>
      </div>
    );

  const metricRows: { label: string; value: MetricValue; tip: string; formula: string }[] = d
    ? [
        { label: 'Accuracy', value: d.accuracy, tip: 'Correct predictions over all records.', formula: '(TP+TN)/(TP+TN+FP+FN)' },
        { label: 'Attack precision', value: d.attackPrecision, tip: 'Of flagged records, the share that were attacks.', formula: 'TP/(TP+FP)' },
        { label: 'Attack recall', value: d.attackRecall, tip: 'Of real attacks, the share detected (sensitivity).', formula: 'TP/(TP+FN)' },
        { label: 'Attack F1', value: d.attackF1, tip: 'Harmonic mean of precision and recall.', formula: '2PR/(P+R)' },
        { label: 'Specificity', value: d.specificity, tip: 'Of normal records, the share correctly left alone.', formula: 'TN/(TN+FP)' },
        { label: 'False positive rate', value: d.falsePositiveRate, tip: 'Share of normal records wrongly flagged.', formula: 'FP/(FP+TN)' },
        { label: 'False negative rate', value: d.falseNegativeRate, tip: 'Share of real attacks that were missed.', formula: 'FN/(FN+TP)' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prediction summaries"
        title="Confusion Matrix Lab"
        description="Exact test-set counts per model (positive class = Attack). All metrics below are derived from these counts with safe division."
        actions={<ActiveSource kind="confusion" />}
      />

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="label-xs">Dataset</span>
          <DatasetPicker value={ds} onChange={setDs} datasets={datasets} />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted" htmlFor="cm-model">
          <span className="label-xs">Model</span>
          <select id="cm-model" className="select-native" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </Card>

      {!cm || !d ? (
        <Card><EmptyState icon={<Grid2x2 className="h-5 w-5" />} title="No matrix for this selection" description={`No confusion matrix was imported for ${model || 'this model'} on ${ds}.`} action={<ImportPrompt what="confusion matrices" />} /></Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              as="h2"
              icon={<Grid2x2 className="h-4 w-4" />}
              title={<span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: modelColor(model) }} />{model}</span>}
              subtitle={<><span style={{ color: datasetColor(ds) }}>{ds}</span> · <span className="num">{fmtInt(d.total)}</span> test records</>}
            />
            <CardBody>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 sm:gap-3">
                <div />
                <p className="pb-1 text-center text-xs font-medium text-muted">Predicted Normal</p>
                <p className="pb-1 text-center text-xs font-medium text-muted">Predicted Attack</p>

                <p className="grid place-items-center text-xs font-medium text-muted [writing-mode:vertical-rl] [transform:rotate(180deg)]">Actual Normal</p>
                {(['tn', 'fp'] as const).map((k) => <Cell key={k} k={k} value={cm[k]} total={d.total} delay={k === 'tn' ? 0 : 0.06} />)}

                <p className="grid place-items-center text-xs font-medium text-muted [writing-mode:vertical-rl] [transform:rotate(180deg)]">Actual Attack</p>
                {(['fn', 'tp'] as const).map((k) => <Cell key={k} k={k} value={cm[k]} total={d.total} delay={k === 'fn' ? 0.12 : 0.18} />)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] text-muted">
                <div className="rounded-lg border border-line/10 p-3">Actual normal: <span className="num text-fg">{fmtInt(d.normalSupport)}</span> ({fmtPct(d.normalSupport / d.total, 1)})</div>
                <div className="rounded-lg border border-line/10 p-3">Actual attacks: <span className="num text-fg">{fmtInt(d.attackSupport)}</span> ({fmtPct(d.attackSupport / d.total, 1)})</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader as="h2" title="Derived metrics" subtitle="Computed from the four counts; undefined ratios show —" />
            <CardBody className="pt-3">
              <dl>
                {metricRows.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-3 border-b border-line/5 py-2.5 last:border-0">
                    <dt className="flex items-center gap-1.5 text-[13px] text-muted">
                      {m.label}
                      <InfoTip label={`About ${m.label}`} content={<><span className="block">{m.tip}</span><span className="num mt-1 block text-[11px] text-cyan">{m.formula}</span></>} />
                    </dt>
                    <dd className="num text-right text-[15px] font-semibold">
                      {fmtPct(m.value)} <span className="ml-1 text-xs font-normal text-subtle">{fmtScore(m.value)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <Callout className="mt-4" tone="warning" title="Reading the errors">
                A false negative is a missed attack; a false positive is a false alarm. The model here missed <b className="num">{fmtInt(cm.fn)}</b> attacks and raised <b className="num">{fmtInt(cm.fp)}</b> false alarms.
              </Callout>
              {source === 'demo' && <p className="mt-3 text-[11px] text-subtle">Counts shown are the project's recorded experiment counts (demo data source).</p>}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function Cell({ k, value, total, delay }: { k: keyof typeof CELLS; value: number; total: number; delay: number }) {
  const c = CELLS[k];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      tabIndex={0}
      title={`${c.label}: ${c.tip}`}
      aria-label={`${c.label}: ${fmtInt(value)} records, ${fmtPct(value / total)} of test set. ${c.tip}`}
      className={cn('group relative flex min-h-[130px] cursor-default flex-col items-center justify-center rounded-2xl border p-4 text-center transition-colors', TONE[c.tone])}
    >
      <span className="absolute left-3 top-2.5 text-[11px] font-semibold tracking-wider">{k.toUpperCase()}</span>
      <p className="num text-2xl font-semibold text-fg sm:text-3xl">{fmtInt(value)}</p>
      <p className="num mt-1 text-sm">{fmtPct(value / total)}</p>
      <p className="mt-1 text-[11px] text-muted">{c.label}</p>
      <span className="pointer-events-none absolute inset-x-2 bottom-full z-10 mb-1 hidden rounded-lg border border-line/20 bg-surface-2 px-2.5 py-1.5 text-[11px] text-fg shadow-xl group-hover:block group-focus:block">{c.tip}</span>
    </motion.div>
  );
}
