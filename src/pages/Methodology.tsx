import { motion } from 'framer-motion';
import { BarChart3, Cpu, Database, GraduationCap, LayoutDashboard, Sparkles, Workflow } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { AccordionItem } from '@/components/ui/Accordion';
import { Callout } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/common/Controls';
import { MODELS } from '@/data/models';
import { METRICS, METRIC_KEYS } from '@/data/metrics';

const STAGES = [
  { icon: Database, title: 'Network Intrusion Datasets', text: 'UNSW-NB15 (Parquet) and NSL-KDD (CSV-like TXT) with predefined train / test files.', color: 'cyan' },
  { icon: Workflow, title: 'Databricks Data Processing', text: 'Files loaded into Spark DataFrames on Databricks Free Edition; schemas applied and binary labels derived.', color: 'blue' },
  { icon: Sparkles, title: 'PySpark Feature Engineering', text: 'StringIndexer → OneHotEncoder → VectorAssembler → MinMaxScaler, fitted on training data only.', color: 'violet' },
  { icon: Cpu, title: 'Spark MLlib Model Training', text: 'Five independent classifiers trained separately on each dataset.', color: 'cyan' },
  { icon: BarChart3, title: 'Performance Evaluation', text: 'Accuracy, precision, recall, F1, AUC-ROC and confusion matrices on the held-out test sets.', color: 'blue' },
  { icon: LayoutDashboard, title: 'SentinelX Interactive Dashboard', text: 'Exported results (CSV / JSON) are imported and visualised locally in the browser. No training happens here.', color: 'violet' },
] as const;

const COLOR: Record<string, { ring: string; text: string; bg: string; hex: string }> = {
  cyan: { ring: 'ring-cyan/40', text: 'text-cyan', bg: 'bg-cyan/10', hex: '#22D3EE' },
  blue: { ring: 'ring-blue/40', text: 'text-blue', bg: 'bg-blue/10', hex: '#3B82F6' },
  violet: { ring: 'ring-violet/40', text: 'text-violet', bg: 'bg-violet/10', hex: '#8B5CF6' },
};

const DETAILS = [
  { title: 'Data ingestion', items: ['UNSW-NB15 training and testing sets as Parquet', 'NSL-KDD KDDTrain+ / KDDTest+ as CSV-like TXT files', 'Predefined splits kept as supplied'] },
  { title: 'Preprocessing', items: ['Binary label mapping (0 = Normal, 1 = Attack)', 'Categorical indexing (StringIndexer)', 'One-hot encoding', 'Numerical scaling (MinMaxScaler)', 'Feature assembly (VectorAssembler)'] },
  { title: 'Model training', items: ['Five independent algorithms', 'Separate pipelines per dataset', 'Train / test split defined by the source files'] },
  { title: 'Evaluation', items: ['Accuracy', 'Precision, recall and F1 (weighted and attack class)', 'AUC-ROC', 'Confusion matrices'] },
  { title: 'Dashboard', items: ['Interactive visualisation of exported experiment results', 'Local-first: imports stay in your browser', 'Rankings and narratives computed from the data'] },
];

const VIVA: { q: string; a: React.ReactNode }[] = [
  { q: 'Why is this an offline batch benchmark and not a live IDS?', a: 'Models were trained and scored once on stored datasets. There is no packet capture, streaming input or real-time inference in this project, and the dashboard only visualises exported results.' },
  { q: 'Why fit the preprocessing pipeline on training data only?', a: 'Category vocabularies and min/max values are learned from the training set and then applied to the test set. Fitting on test data would leak information and make the evaluation optimistic.' },
  { q: 'Why one-hot encode categorical features?', a: 'Indexing alone imposes an artificial numeric order on categories such as protocol or service. One-hot vectors treat every category as independent, which suits linear models and keeps trees from splitting on meaningless order.' },
  { q: 'Why MinMax scaling — and how does it relate to Naive Bayes?', a: 'Scaling puts features on comparable ranges, which matters for the linear models. It also guarantees nonnegative values, which Spark’s multinomial Naive Bayes requires.' },
  { q: 'Why can accuracy be misleading here?', a: 'Accuracy averages over all records. Two models can have similar accuracy but very different attack recall or precision, so attack-class metrics are reported alongside it.' },
  { q: 'What does AUC-ROC measure, and why can it disagree with recall?', a: 'AUC-ROC measures how well scores rank attacks above normal records across all thresholds. Recall is measured at one fixed decision threshold, so a model can rank well yet detect fewer attacks at the default threshold.' },
  { q: 'Why is the positive class “Attack”?', a: 'Attack precision, recall and F1 are computed with Attack = 1 as the positive class, so recall answers “what fraction of attacks were caught?”.' },
  { q: 'What are the limitations of these results?', a: 'Single predefined split, no repeated runs or confidence intervals, and the two datasets are not directly comparable. Results do not guarantee real-world deployment performance.' },
  { q: 'Why are weighted metrics shown in the leaderboard options?', a: 'Weighted precision, recall and F1 average per-class scores by class support, matching Spark MLlib’s MulticlassMetrics. For binary classification weighted recall equals accuracy.' },
];

export default function Methodology() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pipeline" title="Methodology" description="How the results were produced on Databricks with Spark MLlib, and how they reach this dashboard." />

      <Card className="overflow-hidden">
        <CardHeader as="h2" icon={<Workflow className="h-4 w-4" />} title="Architecture" subtitle="Offline batch pipeline — data flows top to bottom." />
        <CardBody>
          <ol className="relative mx-auto max-w-3xl space-y-0">
            {STAGES.map((s, i) => {
              const c = COLOR[s.color];
              return (
                <li key={s.title} className="relative">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-4 rounded-2xl border border-line/10 bg-surface-2/50 p-4 transition-colors hover:border-line/25"
                  >
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ${c.ring} ${c.bg} ${c.text}`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="num text-[11px] text-subtle">STAGE {i + 1}</p>
                      <h3 className="text-[15px] font-semibold">{s.title}</h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.text}</p>
                    </div>
                  </motion.div>
                  {i < STAGES.length - 1 && (
                    <div className="relative mx-auto h-9 w-px overflow-hidden bg-line/15" aria-hidden>
                      <span className="absolute left-0 top-0 h-3 w-px animate-flow-y" style={{ background: `linear-gradient(transparent, ${c.hex}, transparent)` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DETAILS.map((d) => (
          <Card key={d.title} interactive className="p-5">
            <h3 className="text-sm font-semibold">{d.title}</h3>
            <ul className="mt-3 space-y-1.5 text-[13px] text-muted">
              {d.items.map((it) => <li key={it} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan" />{it}</li>)}
            </ul>
          </Card>
        ))}
        <Card interactive className="p-5">
          <h3 className="text-sm font-semibold">Algorithms (Spark MLlib)</h3>
          <ul className="mt-3 space-y-1.5 text-[12px] text-muted">
            {MODELS.map((m) => <li key={m.name}><span className="font-medium text-fg">{m.name}</span><br /><span className="num text-[11px] text-subtle">{m.sparkClass}</span></li>)}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader as="h2" icon={<GraduationCap className="h-4 w-4" />} title="Technical methodology · viva preparation" subtitle="Expand a question for a concise, defensible answer." />
        <CardBody className="space-y-2.5">
          {VIVA.map((v) => <AccordionItem key={v.q} title={v.q}>{v.a}</AccordionItem>)}
          <AccordionItem title="Metric definitions used in this dashboard">
            <ul className="space-y-2">
              {METRIC_KEYS.map((k) => (
                <li key={k}><span className="font-medium text-fg">{METRICS[k].label}</span> <span className="num text-[11px] text-cyan">{METRICS[k].formula}</span><br />{METRICS[k].description}</li>
              ))}
            </ul>
          </AccordionItem>
        </CardBody>
      </Card>

      <Callout tone="info">Training duration, resource usage, inference latency, ROC curve points and feature importances are not shown because they are not part of the imported data.</Callout>
    </div>
  );
}
