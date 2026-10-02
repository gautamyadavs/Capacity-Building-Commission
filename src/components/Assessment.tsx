import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { assessmentAvailable, assessmentComplete, batteryComplete, currentStage, emptyDraft, fieldsFor, intermissionDue, resumePath, stageStatus, validate, wordCount, type Assessment, type Draft, type Snapshot, type Stage } from '../model';
import { useSession } from '../context';
import { Modal, ResponseField } from './Forms';
import { AppLink, ErrorBox, Paragraphs, StageProgress } from './Shared';
import { SelectedResponseFeedback } from './Feedback';
import styles from '../app.module.css';

export function CaseFacts({ stage }: { stage: Stage }) {
  if (!stage.information.length && !stage.groups.length && !stage.note.length && !stage.timeline?.length) return null;
  return <section className={stage.kind === 'review' ? styles.reviewCommentary : styles.briefing} aria-label={stage.kind === 'review' ? 'Case commentary' : 'Case information'}>
    {stage.kind === 'review' ? <h2>Case commentary for self-review</h2> : <div className={styles.sectionEyebrow}>{stage.kind === 'update' ? 'New information' : stage.kind === 'compare' ? 'Simulated outcomes' : stage.kind === 'challenge' ? 'The decision challenge' : 'The case briefing'}</div>}
    {!!stage.timeline?.length && <dl className={styles.timeline} aria-label="Case timeline">{stage.timeline.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}</dl>}
    <Paragraphs lines={stage.information}/>
    {stage.groups.map(group => group.rowLabels ? <table key={group.title} className={styles.factTable}><caption>{group.title}</caption><thead><tr><th scope="col">Item</th><th scope="col">Case facts</th></tr></thead><tbody>{group.paragraphs.map((p, i) => <tr key={p}><th scope="row">{group.rowLabels![i]}</th><td>{p}</td></tr>)}</tbody></table> : <section key={group.title} className={styles.factGroup}><h3>{group.title}</h3>{stage.kind === 'review' ? <Paragraphs lines={group.paragraphs}/> : <ul>{group.paragraphs.map(p => <li key={p}>{p}</li>)}</ul>}</section>)}
    {stage.note.length > 0 && <div className={styles.note}><Paragraphs lines={stage.note}/></div>}
  </section>;
}
export function SubmittedResponsePanel({ assessment, stage, snapshot, expanded = true }: { assessment: Assessment; stage: Stage; snapshot: Snapshot; expanded?: boolean }) {
  let fields = fieldsFor(assessment, stage);
  if (['predict', 'compare'].includes(stage.kind)) fields = [...snapshot.cardOrder.flatMap(id => fields.filter(f => f.id.startsWith(`${id}.`))), ...fields.filter(f => !f.id.includes('.'))];
  return <details className={styles.submitted} open={expanded}>
    <summary><span>{stage.title}</span><span className={styles.locked}>▣ Submitted and locked</span></summary>
    <div className={styles.submittedBody}><p className={styles.timestamp}>Submitted <time dateTime={snapshot.submittedAt}>{new Date(snapshot.submittedAt).toLocaleString()}</time></p>
      {fields.map(f => {
        const card = assessment.predictions?.cards.find(c => f.id.startsWith(`${c.id}.`));
        const answer = snapshot.answers[f.id] || '';
        const display = f.type === 'choice' ? f.options?.find(o => o.id === answer)?.label : answer;
        return <div key={f.id} className={styles.answer}><h4>{card && `${card.label} · `}{f.label}{f.unscored && ' (unscored)'}</h4><p>{display || 'Not provided'}</p>{f.maxWords && <small className={styles.wordCount}>{wordCount(answer)} / {f.maxWords} words · maximum</small>}</div>;
      })}
    </div>
  </details>;
}
function CaseGate() {
  const { config, run } = useSession();
  return <div className={styles.gate}><h1>This case is not available yet</h1><p>Complete the preceding cases before continuing.</p><AppLink to={resumePath(config, run)} className={styles.primary}>Continue assessment →</AppLink></div>;
}
export function AssessmentIntro() {
  const { aid } = useParams(); const { config, run, store } = useSession(); const navigate = useNavigate(); const [busy, setBusy] = useState(false);
  const a = config.assessments.find(a => a.id === aid); if (!a) return <ErrorBox message="Assessment not found."/>;
  if (!assessmentAvailable(config, run, a.id)) return <CaseGate/>;
  const session = run.sessions[a.id]; const current = currentStage(a, session); const number = config.assessments.indexOf(a) + 1;
  const begin = async () => {
    setBusy(true);
    try { await store.begin(a.id); const stage = currentStage(a, store.getSnapshot().run.sessions[a.id]); navigate(`/learner/assessment/${a.id}/${stage ? `stage/${stage.id}` : 'complete'}`); }
    catch { /* The save error is shown by the application shell. */ } finally { setBusy(false); }
  };
  return <div data-format={a.format} className={styles.intro}>
    <AppLink to="/learner" className={styles.back}>← Assessment home</AppLink>
    <div className={styles.introGrid}><section><p className={styles.eyebrow}>EPISODE {number} OF {config.assessments.length} · {a.suggestedTime} provisional</p><h1>{a.title}</h1><div className={styles.introText}><Paragraphs lines={a.instructions}/></div>
      <button onClick={begin} disabled={busy} className={styles.primary}>{busy ? 'Opening…' : current ? 'Resume case' : assessmentComplete(a, session) ? 'View saved responses' : 'Begin case'} →</button>
    </section><aside className={styles.introAside}><p className={styles.sectionEyebrow}>What you will practise</p><ol className={styles.journey}>{a.stages.map((s, i) => <li key={s.id}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{s.title}</strong><small>{s.rationale}</small></div></li>)}</ol><p className={styles.asideFooter}>Timings are provisional planning guides. Pause and resume your saved draft at any stage.</p><div className={styles.lockNote}>▣ Original responses lock before later information or commentary appears. Your review amendment is saved separately.</div></aside></div>
  </div>;
}
function PredictionFields({ a, draft, change, errors, disabled }: { a: Assessment; draft: Draft; change: (id: string, value: string) => void; errors: Record<string, string>; disabled: boolean }) {
  return <div className={styles.predictionCards}>{a.predictions!.cards.map(card => <section key={card.id} className={styles.predictionCard} aria-label={card.label}>
    <div className={styles.cardTitle}><h3>{card.label}</h3></div>
    {a.predictions!.fields.map(f => <ResponseField key={f.id} field={{ ...f, id: `${card.id}.${f.id}` }} value={draft.answers[`${card.id}.${f.id}`] || ''} onChange={value => change(`${card.id}.${f.id}`, value)} error={errors[`${card.id}.${f.id}`]} disabled={disabled}/>)}
  </section>)}</div>;
}
function ComparisonFields({ a, stage, draft, change, errors }: { a: Assessment; stage: Stage; draft: Draft; change: (id: string, value: string) => void; errors: Record<string, string> }) {
  const { run } = useSession(); const predictionStage = a.stages.find(s => s.kind === 'predict')!; const prediction = run.sessions[a.id].submitted[predictionStage.id];
  return <div className={styles.comparisons}>
    {predictionStage.fields.map(f => <div className={styles.predictionMemory} key={f.id}><h3>Your submitted {f.label.toLowerCase()}</h3><p>{prediction.answers[f.id]}</p><span className={styles.locked}>▣ Submitted and locked</span></div>)}
    {prediction.cardOrder.map(id => {
    const card = a.predictions!.cards.find(c => c.id === id)!;
    return <section className={styles.comparison} key={id} aria-label={card.label}><h3>{card.label}</h3><div className={styles.comparisonGrid}><div className={styles.predictionMemory}>
      <p className={styles.sectionEyebrow}>Your submitted prediction</p>{a.predictions!.fields.map(f => <div className={styles.answer} key={f.id}><h4>{f.label}{f.unscored ? ' (unscored)' : ''}</h4><p>{prediction.answers[`${id}.${f.id}`]}</p></div>)}
      <span className={styles.locked}>▣ Submitted and locked</span>
    </div><div>{fieldsFor(a, stage).filter(f => f.id.startsWith(`${id}.`)).map(f => <ResponseField key={f.id} field={f} value={draft.answers[f.id] || ''} onChange={value => change(f.id, value)} error={errors[f.id]}/>)}</div></div></section>;
  })}</div>;
}
function PriorResponses({ a, stage }: { a: Assessment; stage: Stage }) {
  const { run } = useSession();
  if (!stage.priorResponses.length) return null;
  return <section className={styles.priors} aria-label="Previously submitted responses"><h2>{stage.kind === 'review' ? 'Compare with your original reasoning' : 'Your earlier responses'}</h2>
    <p className={styles.help}>Open a response to read exactly what you submitted. It remains locked.</p>
    {stage.priorResponses.map(id => <SubmittedResponsePanel key={id} assessment={a} stage={a.stages.find(s => s.id === id)!} snapshot={run.sessions[a.id].submitted[id]} expanded={false}/>)}
  </section>;
}
function FocusedContext({ a, stage }: { a: Assessment; stage: Stage }) {
  return <>{stage.focusContext?.map(ref => {
    const prior = a.stages.find(s => s.id === ref.stageId)!;
    return <CaseFacts key={ref.stageId} stage={{ ...prior, information: [], note: [], timeline: [], groups: prior.groups.filter(g => ref.groupTitles.includes(g.title)) }}/>;
  })}</>;
}
function EarlierReferences({ a, stage }: { a: Assessment; stage: Stage }) {
  if (!stage.contextStageIds.length && !stage.priorResponses.length) return null;
  return <details className={styles.references}><summary>Earlier briefings{stage.kind !== 'review' && ' and locked responses'}</summary><div>
    {stage.contextStageIds.map(id => {
      const prior = a.stages.find(s => s.id === id)!;
      return <details key={id} className={styles.contextDetails}><summary>{prior.kind === 'compare' ? 'Simulated outcomes at 48 hours' : `Full briefing: ${prior.title}`}</summary><CaseFacts stage={prior}/></details>;
    })}
    {stage.kind !== 'review' && <PriorResponses a={a} stage={stage}/>}
  </div></details>;
}
export function AssessmentStage() {
  const { aid, sid } = useParams(); const { config, run, store, error } = useSession(); const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const a = config.assessments.find(a => a.id === aid); const stage = a?.stages.find(s => s.id === sid);
  if (!a || !stage) return <ErrorBox message="Assessment stage not found."/>;
  if (!assessmentAvailable(config, run, a.id)) return <CaseGate/>;
  const session = run.sessions[a.id]; const status = stageStatus(a, session, stage);
  if (status === 'notYetAvailable') return <div className={styles.gate}><h1>This stage is not available yet</h1><p>Submit the preceding stage before continuing.</p><AppLink className={styles.primary} to={`/learner/assessment/${a.id}`}>Return to your case →</AppLink></div>;
  const draft = session.draft?.stageId === stage.id ? session.draft : emptyDraft(a, stage.id);
  const change = (id: string, value: string) => store.edit(a.id, { ...draft, answers: { ...draft.answers, [id]: value } });
  const onSubmit = () => {
    const nextErrors = validate(a, stage, draft); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setTimeout(() => { const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]'); (invalid?.querySelector<HTMLInputElement>('input') || invalid)?.focus(); }, 0); return;
    }
    setConfirm(true);
  };
  const commit = async () => {
    setBusy(true);
    try {
      await store.submit(a.id, stage.id, draft); setConfirm(false);
      const saved = store.getSnapshot().run; const next = currentStage(a, saved.sessions[a.id]);
      navigate(next ? `/learner/assessment/${a.id}/stage/${next.id}` : batteryComplete(config, saved) ? '/learner/review' : intermissionDue(config, saved) ? '/learner/intermission' : `/learner/assessment/${a.id}/complete`);
    } catch { /* Keep the response open when persistence fails. */ } finally { setBusy(false); }
  };
  return <div data-format={a.format} className={styles.workspace}>
    <AppLink to="/learner" className={styles.back}>← Assessment home</AppLink>
    <div className={styles.stageHeading}><div><p className={styles.eyebrow}>EPISODE {config.assessments.indexOf(a) + 1} OF {config.assessments.length}</p><h1>{a.title}</h1></div></div>
    <StageProgress a={a} current={stage.id}/>
    <div className={styles.taskHeader} role="region" aria-label="Current task"><div><h2>{stage.title}</h2><p>{stage.task}</p></div><span>{stage.suggestedTime} · provisional</span></div>
    <div className={styles.stageWork}>
      {stage.kind === 'review' && <PriorResponses a={a} stage={stage}/>}
      <CaseFacts stage={stage}/><FocusedContext a={a} stage={stage}/>
      {stage.kind === 'review' && <SelectedResponseFeedback assessment={a}/>}
      {status === 'submitted' ? <><SubmittedResponsePanel assessment={a} stage={stage} snapshot={session.submitted[stage.id]}/><AppLink className={styles.primary} to={resumePath(config, run)}>Continue assessment →</AppLink></> : <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className={styles.responseForm} aria-label="Stage response" noValidate>
        <div className={styles.formHeader}><h2>{stage.kind === 'review' ? 'Your separate amendment' : 'Your response'}</h2></div>
        {stage.responseInstruction && <p className={styles.help}>{stage.responseInstruction}</p>}
        {Object.keys(errors).length > 0 && <div role="alert" className={styles.errorBox}>Please complete the required fields within their word limits. Your draft has been kept.</div>}
        {stage.kind === 'predict' && <PredictionFields a={a} draft={draft} change={change} errors={errors} disabled={busy}/>}
        {stage.kind === 'compare' && <ComparisonFields a={a} stage={stage} draft={draft} change={change} errors={errors}/>}
        {fieldsFor(a, stage).filter(f => !f.id.includes('.')).map(f => <ResponseField key={f.id} field={f} value={draft.answers[f.id] || ''} onChange={value => change(f.id, value)} error={errors[f.id]} disabled={busy}/>)}
        {stage.selectedResponses.length > 0 && <p className={styles.help}>Your choices will be saved and locked. Explanatory feedback becomes available in the guided review after {stage.selectedResponses.every(q => !q.deferFeedbackUntilBatteryComplete) ? 'this episode’s reasoning and checks are submitted' : 'every episode is complete'}.</p>}
        <div className={styles.submitBar}><p>▣ Your response will be locked on submission.</p><button className={styles.primary} type="submit" disabled={busy}>Submit and continue →</button></div>
      </form>}
      <EarlierReferences a={a} stage={stage}/>
    </div>
    {confirm && <Modal title="Submit and lock this response?" cancel={() => setConfirm(false)} confirm={commit} confirmLabel="Submit and lock" busy={busy} error={error}><p>{config.confirmation}</p></Modal>}
  </div>;
}
export function AssessmentCompletion() {
  const { aid } = useParams(); const { config, run } = useSession(); const a = config.assessments.find(a => a.id === aid);
  if (!a) return <ErrorBox message="Assessment not found."/>;
  if (!assessmentAvailable(config, run, a.id)) return <CaseGate/>;
  if (!assessmentComplete(a, run.sessions[a.id])) return <ErrorBox message="Complete all stages before opening this case's completion page."/>;
  return <div data-format={a.format} className={styles.completion}><p className={styles.eyebrow}>EPISODE {config.assessments.indexOf(a) + 1} OF {config.assessments.length} · COMPLETE</p><span className={styles.completionSymbol} aria-hidden="true">✓</span><h1>Your responses have been saved and locked.</h1><p>{config.completionAcknowledgement}</p>
    <p className={styles.lead}>{a.title}</p><ol className={styles.completionList}>{a.stages.map(s => <li key={s.id}><strong>{s.title}</strong><AppLink to={`/learner/assessment/${a.id}/stage/${s.id}`}>View locked response →</AppLink></li>)}</ol>
    <div className={styles.actions}><AppLink className={styles.primary} to={resumePath(config, run)}>{batteryComplete(config, run) ? 'Open final review' : intermissionDue(config, run) ? 'Continue to your break' : `Continue to Episode ${config.assessments.findIndex(b => !assessmentComplete(b, run.sessions[b.id])) + 1}`} →</AppLink><AppLink className={styles.secondary} to="/learner">Assessment home</AppLink></div>
  </div>;
}
export function Intermission() {
  const { config, run, store } = useSession(); const navigate = useNavigate(); const [busy, setBusy] = useState(false);
  const boundary = config.assessments.find(a => a.id === config.intermission.afterAssessmentId)!;
  const following = config.assessments[config.assessments.indexOf(boundary) + 1];
  if (!assessmentComplete(boundary, run.sessions[boundary.id])) return <CaseGate/>;
  if (run.intermission.continuedAt) return <Navigate to={resumePath(config, run)} replace/>;
  const proceed = async () => { setBusy(true); try { await store.continueAfterBreak(); navigate(resumePath(config, store.getSnapshot().run)); } catch {} finally { setBusy(false); } };
  return <section className={styles.completion}><p className={styles.eyebrow}>PAUSE OR CONTINUE</p><h1>{config.intermission.heading}</h1><p className={styles.lead}>{config.intermission.body}</p><p>{config.completionAcknowledgement}</p><div className={styles.actions}><button className={styles.primary} disabled={busy} onClick={proceed}>{busy ? 'Opening…' : `Continue to Episode ${config.assessments.indexOf(following) + 1}`} →</button><AppLink className={styles.secondary} to="/learner">Return to assessment home</AppLink></div></section>;
}
