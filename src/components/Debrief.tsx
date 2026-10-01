import { useState } from 'react';
import { useSession } from '../context';
import { batteryComplete, resumePath, wordCount, type Assessment } from '../model';
import { AppLink } from './Shared';
import { CaseFacts, SubmittedResponsePanel } from './Assessment';
import { Modal, ResponseField } from './Forms';
import { downloadJson } from '../persistence';
import styles from '../app.module.css';

function PredictionTrail({ a }: { a: Assessment }) {
  const { run } = useSession(); const session = run.sessions[a.id];
  const predict = a.stages.find(s => s.kind === 'predict')!; const compare = a.stages.find(s => s.kind === 'compare')!;
  const original = session.submitted[predict.id]; const comparison = session.submitted[compare.id];
  return <>
    {original.cardOrder.map(id => {
      const card = a.predictions!.cards.find(c => c.id === id)!;
      return <details key={id} className={styles.submitted}><summary>{card.label} · prediction and evidence</summary><div className={styles.submittedBody}>
        {a.predictions!.fields.map(f => <div key={f.id} className={styles.answer}><h4>{f.label}{f.unscored && ' (unscored)'}</h4><p>{original.answers[`${id}.${f.id}`]}</p>{f.maxWords && <small className={styles.wordCount}>{wordCount(original.answers[`${id}.${f.id}`])} / {f.maxWords} words · maximum</small>}</div>)}
        {predict.fields.map(f => <div className={styles.answer} key={f.id}><h4>{f.label}</h4><p>{original.answers[f.id]}</p></div>)}
        <CaseFacts stage={compare}/>
        <div className={styles.answer}><h4>Your classification (unscored)</h4><p>{comparison.answers[`${id}.classification`]}</p></div>
        <div className={styles.answer}><h4>Evidence note</h4><p>{comparison.answers[`${id}.evidence`]}</p></div><span className={styles.locked}>▣ Submitted and locked</span>
      </div></details>;
    })}
    {a.stages.filter(s => !['predict', 'compare'].includes(s.kind)).map(s => <SubmittedResponsePanel key={s.id} assessment={a} stage={s} snapshot={session.submitted[s.id]}/>)}
  </>;
}
export function Debrief() {
  const { config, run, store, error } = useSession(); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  if (!batteryComplete(config, run)) return <div className={styles.gate}><h1>Your final review is still locked</h1><p>Complete all four cases and their evidence checks to open your feedback and full reasoning trail.</p><AppLink to={resumePath(config, run)} className={styles.primary}>Continue assessment →</AppLink></div>;
  const commit = async () => { setBusy(true); try { await store.submitReflection(); setConfirm(false); } catch {} finally { setBusy(false); } };
  return <>
    <AppLink to="/learner" className={styles.back}>← Assessment home</AppLink><p className={styles.eyebrow}>ALL FOUR CASES COMPLETE</p><h1 className={styles.debriefTitle}>{config.finalReview.heading}</h1>
    <div className={styles.debriefIntro}><p>{config.finalReview.intro}</p><p>{config.finalReview.explanation}</p></div>
    <section aria-labelledby="feedback-heading"><h2 id="feedback-heading">Evidence-check feedback</h2>
      {config.assessments.map(a => a.stages.flatMap(s => s.selectedResponses.map(q => {
        const answer = run.sessions[a.id].submitted[s.id].answers[q.id]; const option = q.options.find(o => o.id === answer)!;
        const best = q.options.find(o => o.id === q.correctOptionId)!;
        return <article key={q.id} className={styles.feedbackResult} data-feedback-id={q.id}><p className={styles.sectionEyebrow}>{a.title} · {q.label}</p><h3>{q.prompt}</h3><p><strong>Your choice:</strong> {option.id}. {option.label}</p><p><strong>Best-supported answer:</strong> {best.id}. {best.label}</p><p>{q.feedbackByOption[answer]}</p></article>;
      })))}
    </section>
    <section className={styles.processNote}><h2>Reasoning across the cases</h2><p>{config.finalReview.guidance}</p></section>
    <section aria-labelledby="trail-heading"><h2 id="trail-heading">Your response trails</h2>
      {config.assessments.map(a => <details key={a.id} className={styles.responseTrail} data-trail-id={a.shortId}>
        <summary>{a.shortId} {a.predictions ? 'Prediction' : 'Decision'} trail <span>{a.title}</span></summary>
        <div className={styles.trailBody}>{a.predictions ? <PredictionTrail a={a}/> : a.stages.map(s => <SubmittedResponsePanel key={s.id} assessment={a} stage={s} snapshot={run.sessions[a.id].submitted[s.id]}/>)}</div>
      </details>)}
    </section>
    <section className={styles.reflections}><h2>Looking back</h2><p className={styles.help}>Optional and unscored. You may leave this reflection blank.</p>
      {run.reflection.submittedAt ? <div className={styles.answer}><h3>{config.finalReview.reflection.prompt}</h3><p>{run.reflection.submitted || 'No reflection provided.'}</p><small className={styles.wordCount}>{wordCount(run.reflection.submitted || '')} / {config.finalReview.reflection.maxWords} words · maximum</small><p role="status" className={styles.locked}>▣ Reflection saved and locked</p></div> : <form onSubmit={e => { e.preventDefault(); if (wordCount(run.reflection.draft) <= config.finalReview.reflection.maxWords!) setConfirm(true); }}>
        <ResponseField field={config.finalReview.reflection} value={run.reflection.draft} onChange={value => store.reflect(value)} disabled={busy}/>
        <button className={styles.primary} type="submit" disabled={busy}>Submit optional reflection</button>
      </form>}
      <div className={styles.actions}><button className={styles.secondary} onClick={() => downloadJson(store.exportSession(), 'bharat-kalp-assessment.json')}>Download your responses</button><AppLink className={styles.secondary} to="/learner">Assessment home</AppLink></div>
    </section>
    {confirm && <Modal title="Save and lock your reflection?" cancel={() => setConfirm(false)} confirm={commit} confirmLabel="Save and lock reflection" busy={busy} error={error}><p>Your optional reflection will be preserved exactly as submitted.</p></Modal>}
  </>;
}
