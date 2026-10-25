import { AlertTriangle, BookOpen, Brain, Crosshair, Scale, Target, Trophy, TrendingUp, Gauge } from 'lucide-react';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useAppStore } from '@/store/useAppStore';
import { METRICS } from '@/data/metrics';
import { datasetColor } from '@/data/datasets';
import { MODELS, modelColor } from '@/data/models';
import type { MetricKey } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AccordionItem } from '@/components/ui/Accordion';
import { Callout } from '@/components/ui/Feedback';
import { ActiveSource, DatasetSwitcher, PageHeader } from '@/components/common/Controls';
import { NoDataState } from '@/components/common/Misc';
import { aucRecallDisagreements, divergentWinners, tradeoffNarrative, winnersFor } from '@/utils/insights';
import { rankOf } from '@/utils/ranking';
import { cn, fmtPct, fmtPP, joinList } from '@/utils/format';

const TONE_TEXT: Record<string, string> = { amber: 'text-amber', coral: 'text-coral', cyan: 'text-cyan', violet: 'text-violet' };

const AWARDS: { metric: MetricKey; title: string; icon: React.ReactNode; blurb: string }[] = [
  { metric: 'accuracy', title: 'Best overall by accuracy', icon: <Trophy className="h-4 w-4" />, blurb: 'Most records classified correctly.' },
  { metric: 'attackRecall', title: 'Best attack detection', icon: <Crosshair className="h-4 w-4" />, blurb: 'Fewest missed attacks (highest recall).' },
  { metric: 'attackPrecision', title: 'Best precision', icon: <Target className="h-4 w-4" />, blurb: 'Fewest false alarms among flagged records.' },
  { metric: 'attackF1', title: 'Best balanced attack detection', icon: <Scale className="h-4 w-4" />, blurb: 'Best precision–recall balance (F1).' },
  { metric: 'aucRoc', title: 'Best ranking performance', icon: <TrendingUp className="h-4 w-4" />, blurb: 'Best threshold-independent separation (AUC-ROC).' },
];

export default function Insights() {
  const { rows, activeDatasets, hasData } = useBenchmarkData();
  const rankingMetric = useAppStore((s) => s.rankingMetric);
  if (!hasData) return <NoDataState />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title="Evaluation Insights"
        description="Winners and trade-offs are computed from the loaded results. Textbook algorithm notes are kept separate from experimental findings."
        actions={<><ActiveSource /><DatasetSwitcher /></>}
      />

      {/* Winners */}
      <section aria-labelledby="winners-h" className="space-y-4">
        <h2 id="winners-h" className="text-lg font-semibold tracking-tight">Who wins — and on what?</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AWARDS.map((a) => (
            <Card key={a.metric} interactive className="p-5">
              <div className="flex items-center gap-2 text-cyan">{a.icon}<h3 className="text-sm font-semibold text-fg">{a.title}</h3></div>
              <p className="mt-1 text-xs text-muted">{a.blurb}</p>
              <div className="mt-4 space-y-3">
                {activeDatasets.map((d) => {
                  const w = winnersFor(rows, d, a.metric);
                  return (
                    <div key={d} className="rounded-xl border border-line/10 bg-surface-2/40 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] text-subtle"><span className="h-1.5 w-1.5 rounded-full" style={{ background: datasetColor(d) }} />{d}</p>
                      {w.winners.length ? (
                        <>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] font-semibold">
                            {joinList(w.winners.map((x) => x.row.model))}
                            {w.winners.length > 1 && <Badge tone="amber">tie</Badge>}
                          </p>
                          <p className="num text-sm text-emerald">{fmtPct(w.winners[0].value)}{w.runnerUp && <span className="ml-2 text-xs text-subtle">{fmtPP(w.winners[0].value - w.runnerUp.value)} vs {w.runnerUp.row.model}</span>}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-neutral">No valid {METRICS[a.metric].label} data</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Divergence */}
      <Card>
        <CardHeader as="h2" icon={<Gauge className="h-4 w-4" />} title="Why different metrics give different winners" subtitle="Each metric rewards a different behaviour, so the leader can change." />
        <CardBody className="grid gap-4 lg:grid-cols-2">
          {activeDatasets.map((d) => {
            const dw = divergentWinners(rows, d);
            const distinct = new Set(dw.map((x) => x.models.join('|'))).size;
            const dis = aucRecallDisagreements(rows, d)[0];
            const trade = tradeoffNarrative(rows, d);
            return (
              <div key={d} className="rounded-xl border border-line/10 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: datasetColor(d) }} />{d}</p>
                <ul className="space-y-1.5 text-[13px]">
                  {dw.map((x) => (
                    <li key={x.metric} className="flex justify-between gap-3"><span className="text-muted">{METRICS[x.metric].label}</span><span className="text-right font-medium">{joinList(x.models)}</span></li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  {distinct === 1 ? 'One model leads every headline metric on this dataset.' : `${distinct} different models lead at least one headline metric on this dataset.`}
                </p>
                {trade && <p className="mt-2 text-[13px] leading-relaxed text-muted">{trade}</p>}
                {dis && (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    <span className="text-amber">AUC ≠ recall:</span> {dis.higherAuc.model} has higher AUC-ROC ({fmtPct(dis.higherAuc.metrics.aucRoc)} vs {fmtPct(dis.higherRecall.metrics.aucRoc)}) than {dis.higherRecall.model}, yet lower attack recall ({fmtPct(dis.higherAuc.metrics.attackRecall)} vs {fmtPct(dis.higherRecall.metrics.attackRecall)}).
                  </p>
                )}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Trade-offs */}
      <Card>
        <CardHeader as="h2" icon={<Scale className="h-4 w-4" />} title="Trade-off analysis" subtitle="General evaluation concepts (not experiment-specific)." />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {[
            ['False positives', 'Normal traffic flagged as an attack. Each one costs analyst time and, if frequent, causes alert fatigue so genuine alerts get ignored.', 'amber'],
            ['False negatives', 'Attacks classified as normal. These are undetected intrusions and usually the costlier error in security.', 'coral'],
            ['Precision vs recall', 'Raising sensitivity usually catches more attacks (higher recall) but flags more normal traffic (lower precision). F1 summarises the balance; the right balance depends on the operating context.', 'cyan'],
            ['Accuracy vs attack detection', 'Accuracy averages over all records, so a model can look decent while missing a large share of attacks. Attack recall, precision and F1 describe the class that matters.', 'violet'],
            ['Why attack recall matters', 'Every missed attack is an intrusion that proceeds unnoticed. Security teams therefore watch recall closely, while also keeping false alarms manageable.', 'coral'],
            ['Why a low false-positive rate matters', 'Even a small FPR becomes thousands of false alerts on large traffic volumes, which overwhelms analysts and erodes trust in the detector.', 'amber'],
          ].map(([t, body, tone]) => (
            <div key={t} className="rounded-xl border border-line/10 bg-surface-2/40 p-4">
              <p className={cn('text-[13px] font-semibold', TONE_TEXT[tone as string])}>{t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Explainability */}
      <Card>
        <CardHeader as="h2" icon={<Brain className="h-4 w-4" />} title="Model explainers" subtitle="Algorithm characteristics are general knowledge; the “In this experiment” line is computed from your loaded data." />
        <CardBody className="space-y-2.5">
          {MODELS.map((m) => (
            <AccordionItem key={m.name} icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: modelColor(m.name) }} />} title={m.name} subtitle={`${m.family} · ${m.summary}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="label-xs mb-2 flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> General characteristics</p>
                  <ul className="space-y-2">
                    {m.traits.map((t) => <li key={t.title}><span className="font-medium text-fg">{t.title}.</span> {t.text}</li>)}
                    {m.limitations.map((l) => <li key={l} className="text-amber">Caveat: {l}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="label-xs mb-2">In this experiment (measured)</p>
                  <ul className="space-y-1.5">
                    {activeDatasets.map((d) => {
                      const r = rows.find((x) => x.dataset === d && x.model === m.name);
                      if (!r) return <li key={d} className="text-neutral">{d}: no results loaded.</li>;
                      const rk = rankOf(rows, r, rankingMetric);
                      return (
                        <li key={d}>
                          <span style={{ color: datasetColor(d) }}>{d}</span>: ranks {rk ? `${rk.tied ? 'T-' : '#'}${rk.rank} of ${rk.of}` : 'n/a'} on {METRICS[rankingMetric].label}; accuracy <span className="num text-fg">{fmtPct(r.metrics.accuracy)}</span>, attack recall <span className="num text-fg">{fmtPct(r.metrics.attackRecall)}</span>, attack precision <span className="num text-fg">{fmtPct(r.metrics.attackPrecision)}</span>.
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[11px] text-subtle">Measured results describe this setup only; they are not a statement about the algorithm in general.</p>
                </div>
              </div>
            </AccordionItem>
          ))}
        </CardBody>
      </Card>

      {/* Caution */}
      <Callout tone="warning" title="Methodological caution">
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Results are measured on held-out test sets from a single predefined train/test split.</li>
          <li>Accuracy alone is not sufficient — read it alongside attack precision, recall and F1.</li>
          <li>The datasets have different distributions and feature sets; scores are not directly comparable across them.</li>
          <li>A higher AUC-ROC does not necessarily mean higher thresholded attack recall.</li>
          <li>These are offline benchmark results, not guarantees of real-world deployment performance.</li>
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle"><AlertTriangle className="h-3 w-3" /> No hyperparameter tuning, confidence intervals or repeated runs are represented here.</p>
      </Callout>
    </div>
  );
}
