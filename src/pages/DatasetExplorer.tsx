import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Database, FileText, Layers, Tags } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { DATASETS, getDatasetInfo } from '@/data/datasets';
import type { ClassDistribution } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AccordionItem } from '@/components/ui/Accordion';
import { Callout, ImportPrompt } from '@/components/ui/Feedback';
import { ActiveSource, DatasetPicker, PageHeader } from '@/components/common/Controls';
import { fmtInt, fmtPct } from '@/utils/format';

const PIPELINE_STEPS = [
  { name: 'StringIndexer', text: 'Maps each categorical string value to a numeric index (handleInvalid keeps unseen test categories from crashing the pipeline).' },
  { name: 'OneHotEncoder', text: 'Converts category indices into sparse binary vectors so no false ordering is implied between categories.' },
  { name: 'VectorAssembler', text: 'Combines numerical columns and encoded categorical vectors into one feature vector column.' },
  { name: 'MinMaxScaler', text: 'Rescales each numerical feature into [0, 1] using minimum and maximum learned from training data. Also keeps features nonnegative, as Multinomial Naive Bayes requires.' },
];

function Distribution({ label, dist }: { label: string; dist?: ClassDistribution }) {
  if (!dist) return null;
  const total = dist.normal + dist.attack;
  if (total === 0) return <p className="text-xs text-muted">{label}: empty counts.</p>;
  const nShare = dist.normal / total;
  const aShare = dist.attack / total;
  const minority = Math.min(nShare, aShare);
  const level = minority >= 0.4 ? { t: 'Balanced', tone: 'emerald' as const } : minority >= 0.2 ? { t: 'Moderate imbalance', tone: 'amber' as const } : { t: 'Strong imbalance', tone: 'coral' as const };
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="font-medium">{label} <span className="num font-normal text-subtle">({fmtInt(total)})</span></span>
        <Badge tone={level.tone}>{level.t}</Badge>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line/10" role="img" aria-label={`${label}: ${fmtPct(nShare, 1)} normal, ${fmtPct(aShare, 1)} attack`}>
        <motion.div className="bg-emerald" initial={{ width: 0 }} animate={{ width: `${nShare * 100}%` }} transition={{ duration: 0.8 }} />
        <motion.div className="bg-coral" initial={{ width: 0 }} animate={{ width: `${aShare * 100}%` }} transition={{ duration: 0.8 }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-xs text-muted">
        <span><span className="text-emerald">●</span> Normal {fmtInt(dist.normal)} · {fmtPct(nShare, 1)}</span>
        <span><span className="text-coral">●</span> Attack {fmtInt(dist.attack)} · {fmtPct(aShare, 1)}</span>
      </div>
    </div>
  );
}

export default function DatasetExplorer() {
  const { datasets: loaded } = useBenchmarkData();
  const metadata = useAppStore((s) => s.metadata);
  const names = useMemo(() => [...new Set([...DATASETS.map((d) => d.name), ...loaded])], [loaded]);
  const [sel, setSel] = useState(names[0]);
  const name = names.includes(sel) ? sel : names[0];
  const info = getDatasetInfo(name);
  const meta = metadata.rows.find((m) => m.dataset === name);
  const evaluated = loaded.includes(name);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data sources"
        title="Dataset Explorer"
        description="The two datasets have different feature schemas, so models are trained and evaluated independently on each one."
        actions={<DatasetPicker value={name} onChange={setSel} datasets={names} />}
      />

      {info ? (
        <>
          <Card className="overflow-hidden" glow={false}>
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${info.color}, transparent)` }} />
            <CardHeader as="h2" icon={<Database className="h-4 w-4" />} title={info.fullName} subtitle={info.purpose} actions={<Badge tone={evaluated ? 'emerald' : 'neutral'}>{evaluated ? 'Results loaded' : 'No results loaded'}</Badge>} />
            <CardBody className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-[13.5px] leading-relaxed text-muted">{info.description}</p>
                <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
                  <div className="rounded-xl border border-line/10 p-3"><dt className="label-xs">Source format</dt><dd className="mt-1">{info.sourceFormat}</dd></div>
                  <div className="rounded-xl border border-line/10 p-3"><dt className="label-xs">Features</dt><dd className="mt-1">{info.featureCount}</dd></div>
                </dl>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line/10 bg-surface-2/50 p-4"><p className="label-xs">Training records</p><p className="num mt-1 text-2xl font-semibold">{fmtInt(info.trainRecords)}</p></div>
                <div className="rounded-xl border border-line/10 bg-surface-2/50 p-4"><p className="label-xs">Testing records</p><p className="num mt-1 text-2xl font-semibold">{fmtInt(info.testRecords)}</p></div>
                <div className="col-span-2">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-line/10" role="img" aria-label="Train and test record proportions">
                    <div style={{ width: `${(info.trainRecords / (info.trainRecords + info.testRecords)) * 100}%`, background: info.color }} />
                    <div className="bg-line/30" style={{ width: `${(info.testRecords / (info.trainRecords + info.testRecords)) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-subtle">Predefined train / test split from the source files — no random re-splitting.</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader as="h2" icon={<Layers className="h-4 w-4" />} title="Feature categories" subtitle={`Categorical: ${info.categorical.join(', ')}`} />
              <CardBody className="space-y-3">
                {info.featureCategories.map((c) => (
                  <div key={c.name} className="rounded-xl border border-line/10 p-3">
                    <p className="text-[13px] font-medium">{c.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.examples.map((e) => <span key={e} className="num rounded-md bg-line/5 px-1.5 py-0.5 text-[11px] text-muted">{e}</span>)}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-subtle">Example columns per group; not an exhaustive schema.</p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader as="h2" icon={<Tags className="h-4 w-4" />} title="Label definition" subtitle={info.labelDefinition} />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 text-center text-[13px]">
                  <div className="rounded-xl border border-emerald/25 bg-emerald/5 p-3"><p className="num text-xl font-semibold text-emerald">0</p><p className="text-muted">Normal</p></div>
                  <div className="rounded-xl border border-coral/25 bg-coral/5 p-3"><p className="num text-xl font-semibold text-coral">1</p><p className="text-muted">Attack</p></div>
                </div>
                <ul className="mt-3 space-y-1 text-[13px] text-muted">{info.labelNotes.map((n) => <li key={n}>• {n}</li>)}</ul>

                <h3 className="label-xs mb-3 mt-6">Class distribution</h3>
                {meta && (meta.train || meta.test) ? (
                  <div className="space-y-5">
                    <Distribution label="Training set" dist={meta.train} />
                    <Distribution label="Test set" dist={meta.test} />
                    {meta.train && meta.train.normal + meta.train.attack !== info.trainRecords && (
                      <Callout tone="warning">Imported training counts ({fmtInt(meta.train.normal + meta.train.attack)}) differ from the documented {fmtInt(info.trainRecords)} records.</Callout>
                    )}
                    {meta.test && meta.test.normal + meta.test.attack !== info.testRecords && (
                      <Callout tone="warning">Imported test counts ({fmtInt(meta.test.normal + meta.test.attack)}) differ from the documented {fmtInt(info.testRecords)} records.</Callout>
                    )}
                    <p className="text-[11px] text-subtle">Imbalance labels use fixed display thresholds (minority class ≥40% balanced, 20–40% moderate, &lt;20% strong). Source: <ActiveSource kind="metadata" /></p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line/20 p-5 text-center">
                    <p className="text-sm font-medium">Class distribution data has not been imported.</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted">No distribution is generated or estimated. Upload a dataset metadata JSON with normal/attack counts.</p>
                    <div className="mt-3"><ImportPrompt what="dataset metadata" /></div>
                  </div>
                )}
                {meta?.description && <p className="mt-4 rounded-xl border border-line/10 p-3 text-[13px] text-muted">{meta.description}</p>}
                {meta?.notes?.length ? <ul className="mt-3 space-y-1 text-[13px] text-muted">{meta.notes.map((n) => <li key={n}>• {n}</li>)}</ul> : null}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader as="h2" icon={<Boxes className="h-4 w-4" />} title="Preprocessing pipeline" subtitle="Fitted on training data only, then applied unchanged to the test data." />
            <CardBody className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.name} className="rounded-xl border border-line/10 bg-surface-2/40 p-4">
                    <p className="num text-[11px] text-cyan">STEP {i + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{s.name}</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{s.text}</p>
                  </div>
                ))}
              </div>
              <AccordionItem icon={<FileText className="h-4 w-4" />} title="Numerical vs categorical features" subtitle="Why they are handled differently">
                Numerical features (durations, byte and packet counts, rates) are scaled with MinMaxScaler. Categorical features ({info.categorical.join(', ')}) are indexed and one-hot encoded because their values have no natural order. The binary label is mapped separately and is never part of the feature vector.
              </AccordionItem>
              <AccordionItem icon={<FileText className="h-4 w-4" />} title="Why fit on training data only?" subtitle="Avoiding information leakage">
                Fitting the indexer, encoder and scaler on the test data would leak information about the evaluation set into preprocessing and inflate results. Statistics (category lists, min/max) come from the training set; the test set is only transformed.
              </AccordionItem>
              <AccordionItem icon={<FileText className="h-4 w-4" />} title="Different schemas, independent evaluation" subtitle="UNSW-NB15 vs NSL-KDD">
                The two datasets have different columns, categorical vocabularies and class balance. A separate pipeline and model set is fitted per dataset, so scores are compared within a dataset and never averaged across datasets.
              </AccordionItem>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader as="h2" icon={<Database className="h-4 w-4" />} title={name} subtitle="Imported dataset without built-in documentation" />
          <CardBody>
            <p className="text-sm text-muted">Benchmark results are loaded for this dataset, but no descriptive information is available. Dataset metadata JSON can supply a description and class counts.</p>
            {meta?.description && <p className="mt-3 text-sm">{meta.description}</p>}
            {meta && (meta.train || meta.test) ? (
              <div className="mt-4 space-y-4"><Distribution label="Training set" dist={meta.train} /><Distribution label="Test set" dist={meta.test} /></div>
            ) : (
              <p className="mt-4 text-sm font-medium">Class distribution data has not been imported.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
