import { useState } from 'react';
import { useSession } from '../context';
import { batteryComplete, resumePath, wordCount, type Assessment } from '../model';
import { AppLink } from './Shared';
import { CaseFacts, SubmittedResponsePanel } from './Assessment';
import { Modal, ResponseField } from './Forms';
import { SelectedResponseFeedback } from './Feedback';
import { downloadJson } from '../persistence';
import styles from '../app.module.css';

function PredictionTrail({ a }: { a: Assessment }) {
  const { run } = useSession(); const session = run.sessions[a.id];
  const predict = a.stages.find(s => s.kind === 'predict')!; const compare = a.stages.find(s => s.kind === 'compare')!;
  const original = session.submitted[predict.id]; const comparison = session.submitted[compare.id];
  return <>
    <details className={styles.contextDetails}><summary>Simulated outcomes at 48 hours</summary><CaseFacts stage={compare}/></details>
    {predict.fields.map(f => <div className={styles.answer} key={f.id}><h4>{f.label}</h4><p>{original.answers[f.id]}</p></div>)}
    {original.cardOrder.map(id => {
      const card = a.predictions!.cards.find(c => c.id === id)!;
      return <details key={id} className={styles.submitted}><summary>{card.label} · prediction and simulated outcomes</summary><div className={styles.submittedBody}>
        {a.predictions!.fields.map(f => <div key={f.id} className={styles.answer}><h4>{f.label}{f.unscored && ' (unscored)'}</h4><p>{original.answers[`${id}.${f.id}`]}</p>{f.maxWords && <small className={styles.wordCount}>{wordCount(original.answers[`${id}.${f.id}`])} / {f.maxWords} words · maximum</small>}</div>)}
        <div className={styles.answer}><h4>Your classification (unscored)</h4><p>{comparison.answers[`${id}.classification`]}</p></div>
        <div className={styles.answer}><h4>Outcome note</h4><p>{comparison.answers[`${id}.evidence`]}</p></div><span className={styles.locked}>▣ Submitted and locked</span>
      </div></details>;
    })}
    {a.stages.filter(s => !['predict', 'compare'].includes(s.kind)).map(s => <SubmittedResponsePanel key={s.id} assessment={a} stage={s} snapshot={session.submitted[s.id]}/>)}
  </>;
}
export function Debrief() {
  const { config, run, store, error } = useSession(); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  if (!batteryComplete(config, run)) return <div className={styles.gate}><h1>Your final review is still locked</h1><p>Complete all {config.assessments.length} episodes and their review amendments to open your full reasoning trail.</p><AppLink to={resumePath(config, run)} className={styles.primary}>Continue assessment →</AppLink></div>;
  const commit = async () => { setBusy(true); try { await store.submitReflection(); setConfirm(false); } catch {} finally { setBusy(false); } };
  return <>
    <AppLink to="/learner" className={styles.back}>← Assessment home</AppLink><p className={styles.eyebrow}>ALL {config.assessments.length} EPISODES COMPLETE</p><h1 className={styles.debriefTitle}>{config.finalReview.heading}</h1>
    <div className={styles.debriefIntro}><p>{config.finalReview.intro}</p><p>{config.finalReview.explanation}</p></div>
    {config.assessments.map(a => <SelectedResponseFeedback key={a.id} assessment={a}/>)}
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
