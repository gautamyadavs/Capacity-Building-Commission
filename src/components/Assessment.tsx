import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentComplete, currentStage, debriefEligible, emptyDraft, fieldsFor, stageStatus, validate, type Assessment, type Config, type Draft, type Snapshot, type Stage } from '../model';
import { useSession } from '../context';
import { downloadJson } from '../persistence';
import { Modal, ResponseField } from './Forms';
import { AppLink, ErrorBox, Paragraphs, StageProgress } from './Shared';
import styles from '../app.module.css';

export function CaseFacts({stage}: {stage:Stage}) {
  if (!stage.information.length && !stage.groups.length && !stage.note.length) return null;
  return <section className={styles.briefing} aria-label="Case information">
    <div className={styles.sectionEyebrow}>{stage.kind === 'update' ? 'New information' : stage.kind === 'compare' ? 'Simulated outcome' : stage.kind === 'challenge' ? 'The decision challenge' : 'The case briefing'}</div>
    {stage.note.length > 0 && <div className={styles.note}><Paragraphs lines={stage.note} /></div>}
    <Paragraphs lines={stage.information} />
    {stage.groups.map(group => <section key={group.title} className={styles.factGroup}><h3>{group.title}</h3><ul>{group.paragraphs.map(p => <li key={p}>{p}</li>)}</ul></section>)}
  </section>;
}

export function SubmittedResponsePanel({ config, stage, snapshot, expanded = true }: {config:Config;stage:Stage;snapshot:Snapshot;expanded?:boolean}) {
  let fields=fieldsFor(config,stage);
  if (stage.kind === 'predict' || stage.kind === 'compare') fields = [...snapshot.cardOrder.flatMap(id => fields.filter(f => f.id.startsWith(`${id}.`))), ...fields.filter(f => !f.id.includes('.'))];
  return <details className={styles.submitted} open={expanded}>
    <summary><span>{stage.title}</span><span className={styles.locked}>▣ Submitted and locked</span></summary>
    <div className={styles.submittedBody}><p className={styles.timestamp}>Submitted <time dateTime={snapshot.submittedAt}>{new Date(snapshot.submittedAt).toLocaleString()}</time></p>
      {fields.map(f => {
        const card = config.cards.find(c => f.id.startsWith(`${c.id}.`));
        return <div key={f.id} className={styles.answer}><h4>{card && `${card.label.split(' - ')[1]} · `}{f.label}{f.unscored && ' (unscored)'}</h4><p>{snapshot.answers[f.id] || 'Not provided'}</p></div>;
      })}
    </div>
  </details>;
}

function PriorResponses({a,stage}:{a:Assessment;stage:Stage}) {
  const {run,config} = useSession();
  return <section className={styles.priors} aria-label="Previously submitted responses"><h2>Your earlier responses</h2><p className={styles.help}>These are the responses you submitted, preserved exactly as written.</p>
    {stage.priorResponses.map(id => run.sessions[a.id].submitted[id] && <SubmittedResponsePanel key={id} config={config} stage={a.stages.find(s=>s.id===id)!} snapshot={run.sessions[a.id].submitted[id]} expanded={stage.kind!=='compare'} />)}
  </section>;
}

export function AssessmentIntro() {
  const {aid} = useParams(); const {config,run,mode,store} = useSession(); const navigate=useNavigate(); const [busy,setBusy]=useState(false);
  const a=config.assessments.find(a=>a.id===aid); if(!a) return <ErrorBox message="Assessment not found." />;
  const session=run.sessions[a.id]; const current=currentStage(a,session);
  const begin=async()=> { setBusy(true); try {await store.begin(a.id); const s=currentStage(a,store.getSnapshot().run.sessions[a.id]); navigate(`/${mode}/assessment/${a.id}/${s ? `stage/${s.id}` : 'complete'}`);} catch {} finally {setBusy(false);} };
  return <div data-format={a.format} className={styles.intro}>
    <AppLink to={`/${mode}`} className={styles.back}>← All assessments</AppLink>
    <div className={styles.introGrid}><section><p className={styles.eyebrow}>FORMAT {a.format} · ASSESSMENT {a.shortId}</p><h1>{a.title}</h1><div className={styles.introText}><Paragraphs lines={a.instructions} /></div>
      <button onClick={begin} disabled={busy} className={styles.primary}>{busy?'Opening…':current?'Resume assessment':assessmentComplete(a,session)?'Review completed assessment':'Begin assessment'} <span aria-hidden="true">→</span></button>
    </section><aside className={styles.introAside}><p className={styles.sectionEyebrow}>Your assessment journey</p><ol className={styles.journey}>{a.stages.map((s,i)=><li key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{s.title}</strong><small>{s.suggestedTime}</small></div></li>)}</ol><p className={styles.asideFooter}>Suggested times only. Work at your own pace.</p><div className={styles.lockNote}>▣ Your response locks at each submission. You can return to read it at any time.</div></aside></div>
    <section className={styles.openBook}><h2>Before you begin</h2><Paragraphs lines={config.openBook} /><details><summary>What is not being assessed</summary><ul>{config.notAssessed.map(p=><li key={p}>{p}</li>)}</ul></details></section>
  </div>;
}

function PredictionFields({draft,change,reorder,errors,disabled}:{draft:Draft;change:(id:string,value:string)=>void;reorder:(order:string[])=>void;errors:Record<string,string>;disabled:boolean}) {
  const {config}=useSession();
  return <div className={styles.predictionCards}>{draft.cardOrder.map((id,index)=>{
    const card=config.cards.find(c=>c.id===id)!;
    const move=(delta:number)=>{const order=[...draft.cardOrder]; [order[index],order[index+delta]]=[order[index+delta],order[index]]; reorder(order);};
    return <section key={id} className={styles.predictionCard}><div className={styles.cardTitle}><span className={styles.cardNumber}>{String(index+1).padStart(2,'0')}</span><div><h3>{card.label}</h3><p>{card.prompt}</p></div></div>
      <div className={styles.reorder}><button type="button" onClick={()=>move(-1)} disabled={disabled||index===0} aria-label={`Move ${card.label} up`}>↑ Move up</button><button type="button" onClick={()=>move(1)} disabled={disabled||index===2} aria-label={`Move ${card.label} down`}>↓ Move down</button></div>
      {config.cardFields.map(f=><ResponseField key={f.id} field={{...f,id:`${id}.${f.id}`}} value={draft.answers[`${id}.${f.id}`]||''} onChange={value=>change(`${id}.${f.id}`,value)} error={errors[`${id}.${f.id}`]} disabled={disabled}/>)}</section>;
  })}</div>;
}

function ComparisonFields({a,stage,draft,change,errors,disabled}:{a:Assessment;stage:Stage;draft:Draft;change:(id:string,value:string)=>void;errors:Record<string,string>;disabled:boolean}) {
  const {config,run}=useSession(); const prediction=run.sessions[a.id].submitted[a.stages[0].id];
  const order=prediction?.cardOrder || config.cards.map(c=>c.id);
  return <div className={styles.comparisons}>{order.map(id=>{
    const card=config.cards.find(c=>c.id===id)!;
    return <section className={styles.comparison} key={id}><h3>{card.label}</h3><div className={styles.comparisonGrid}><div className={styles.predictionMemory}><p className={styles.sectionEyebrow}>Your submitted prediction</p>{prediction?<>{config.cardFields.map(f=><div className={styles.answer} key={f.id}><h4>{f.label}{f.unscored?' (unscored)':''}</h4><p>{prediction.answers[`${id}.${f.id}`]}</p></div>)}<span className={styles.locked}>▣ Submitted and locked</span></>:<p>No prediction submitted in this reviewer sandbox.</p>}</div><div>
      {fieldsFor(config,stage).filter(f=>f.id.startsWith(`${id}.`)).map(f=><ResponseField key={f.id} field={f} value={draft.answers[f.id]||''} onChange={value=>change(f.id,value)} error={errors[f.id]} disabled={disabled}/>)}</div></div></section>;
  })}</div>;
}

function ReviewerNotes({a,stage}:{a:Assessment;stage:Stage}) {
  return <aside className={styles.reviewerNotes}><p className={styles.sectionEyebrow}>Reviewer only · Intended evidence</p><ul>{stage.reviewerNotes.map(p=><li key={p}>{p}</li>)}</ul><details><summary>Case rationale and source</summary><Paragraphs lines={a.reviewerNotes}/><p>{stage.sourceSection}</p></details></aside>;
}

export function AssessmentStage({preview=false}:{preview?:boolean}) {
  const {aid,sid}=useParams(); const {config,run,store,mode,error}=useSession(); const navigate=useNavigate();
  const [errors,setErrors]=useState<Record<string,string>>({}); const [confirm,setConfirm]=useState(false); const [busy,setBusy]=useState(false);
  const a=config.assessments.find(a=>a.id===aid); const stage=a?.stages.find(s=>s.id===sid);
  if(!a||!stage) return <ErrorBox message="Assessment stage not found."/>;
  const session=run.sessions[a.id]; const status=stageStatus(a,session,stage); const isPreview=preview&&mode==='reviewer';
  if(status==='notYetAvailable'&&!isPreview) return <div className={styles.gate}><span className={styles.gateSymbol}>▣</span><h1>This stage is not available yet</h1><p>Submit the preceding stage before continuing.</p><AppLink className={styles.primary} to={`/${mode}/assessment/${a.id}`}>Return to your assessment →</AppLink></div>;
  const draft=session.draft?.stageId===stage.id?session.draft:emptyDraft(config,stage.id);
  const editable=status==='current'&&!isPreview;
  const change=(id:string,value:string)=>store.edit(a.id,{...draft,answers:{...draft.answers,[id]:value}});
  const onSubmit=()=>{
    const nextErrors=validate(config,stage,draft); setErrors(nextErrors);
    if(Object.keys(nextErrors).length) {setTimeout(()=>{
      const invalid=document.querySelector<HTMLElement>('[aria-invalid="true"]');
      (invalid?.querySelector<HTMLInputElement>('input') || invalid)?.focus();
    },0);return;}
    setConfirm(true);
  };
  const commit=async()=>{setBusy(true);try{await store.submit(a.id,stage.id,draft);setConfirm(false);setErrors({});const next=currentStage(a,store.getSnapshot().run.sessions[a.id]);navigate(`/${mode}/assessment/${a.id}/${next?`stage/${next.id}`:'complete'}`);}catch{}finally{setBusy(false);}};
  const observed = a.format==='B' && ['explain','revise'].includes(stage.kind) ? a.stages[1] : undefined;
  const form=(children:ReactNode)=><form onSubmit={e=>{e.preventDefault();onSubmit();}} className={styles.responseForm} aria-label="Stage response" noValidate>
    <div className={styles.formHeader}><p className={styles.sectionEyebrow}>{isPreview?'Response preview':'Your response'}</p><h2>{stage.kind==='predict'?'Make your predictions':stage.kind==='compare'?'Compare prediction with evidence':stage.title}</h2></div>
    {Object.keys(errors).length>0&&<div role="alert" className={styles.errorBox}>Please complete the required fields within their word limits. Your draft has been kept.</div>}
    {children}
    {stage.fields.map(f=><ResponseField key={f.id} field={f} value={isPreview?'':draft.answers[f.id]||''} onChange={value=>change(f.id,value)} error={errors[f.id]} disabled={!editable}/>)}
    <details className={styles.sources} open={!!draft.answers.sources}><summary>External sources used <span className={styles.optional}>Optional</span></summary><ResponseField field={fieldsFor(config,stage).find(f=>f.id==='sources')!} value={isPreview?'':draft.answers.sources||''} onChange={value=>change('sources',value)} disabled={!editable}/></details>
    {editable&&<div className={styles.submitBar}><p>▣ Your response will be locked on submission.</p><button className={styles.primary} type="submit">Submit and continue <span aria-hidden="true">→</span></button></div>}
    {isPreview&&<p className={styles.help}>Preview only. Use the reviewer sandbox to enter and submit responses.</p>}
  </form>;
  return <div data-format={a.format}>
    <AppLink to={`/${mode}`} className={styles.back}>← All assessments</AppLink>
    <div className={styles.stageHeading}><div><p className={styles.eyebrow}>{a.shortId} · FORMAT {a.format}</p><h1>{a.title}</h1></div><div className={styles.time}><span>Suggested time</span><strong>{stage.suggestedTime}</strong></div></div>
    <StageProgress a={a} current={stage.id} preview={isPreview}/>
    {isPreview&&<div className={styles.previewNotice}><strong>Reviewer preview</strong><span>Future information is visible here. Learner progress is unchanged.</span><AppLink to={`/reviewer/assessment/${a.id}`}>Open sandbox →</AppLink></div>}
    <div className={stage.kind==='compare'?styles.compareLayout:styles.stageGrid}>
      <div className={styles.contextColumn}><CaseFacts stage={observed||stage}/>
        {stage.kind!=='decision'&&stage.kind!=='predict'&&<details className={styles.contextDetails}><summary>Read the initial case</summary><CaseFacts stage={a.stages[0]}/></details>}
        {stage.priorResponses.length>0&&<PriorResponses a={a} stage={stage}/>}</div>
      <div>{status==='submitted'&&!isPreview?<><SubmittedResponsePanel config={config} stage={stage} snapshot={session.submitted[stage.id]}/><AppLink className={styles.primary} to={`/${mode}/assessment/${a.id}`}>Continue assessment →</AppLink></>:form(<>
        {stage.kind==='predict'&&<PredictionFields draft={isPreview?emptyDraft(config,stage.id):draft} change={change} reorder={cardOrder=>store.edit(a.id,{...draft,cardOrder})} errors={errors} disabled={!editable}/>}
        {stage.kind==='compare'&&<ComparisonFields a={a} stage={stage} draft={draft} change={change} errors={errors} disabled={!editable}/>}
      </>)}</div>
    </div>
    {mode==='reviewer'&&<ReviewerNotes a={a} stage={stage}/>}
    {confirm&&<Modal title="Submit and lock this response?" cancel={()=>setConfirm(false)} confirm={commit} confirmLabel="Submit and lock" busy={busy} error={error}><p>{config.confirmation}</p></Modal>}
  </div>;
}

export function AssessmentCompletion() {
  const {aid}=useParams();const {config,run,mode,store}=useSession();const [reset,setReset]=useState(false);const navigate=useNavigate();
  const a=config.assessments.find(a=>a.id===aid);if(!a)return <ErrorBox message="Assessment not found."/>;
  if(!assessmentComplete(a,run.sessions[a.id]))return <ErrorBox message="Complete all stages before opening this assessment's completion page."/>;
  const eligible=debriefEligible(config,run,a.format);const other=config.assessments.find(b=>b.format===a.format&&b.id!==a.id)!;
  return <div data-format={a.format} className={styles.completion}><p className={styles.eyebrow}>ASSESSMENT {a.shortId} · COMPLETE</p><span className={styles.completionSymbol} aria-hidden="true">✓</span><h1>Your responses are submitted.</h1><p className={styles.lead}>{a.title}</p>
    <ol className={styles.completionList}>{a.stages.map(s=><li key={s.id}><div><strong>{s.title}</strong><small>{new Date(run.sessions[a.id].submitted[s.id].submittedAt).toLocaleString()}</small></div><AppLink to={`/${mode}/assessment/${a.id}/stage/${s.id}`}>View locked response →</AppLink></li>)}</ol>
    <div className={styles.nextStep}>{eligible?<><h2>Both Format {a.format} assessments are complete</h2><AppLink className={styles.primary} to={`/${mode}/format/${a.format}/debrief`}>Open developmental debrief →</AppLink></>:<><h2>Continue your Format {a.format} journey</h2><p>The developmental debrief unlocks after both assessments are complete.</p><AppLink className={styles.primary} to={`/${mode}/assessment/${other.id}`}>Continue to {other.shortId} →</AppLink></>}</div>
    <div className={styles.actions}><button className={styles.secondary} onClick={()=>downloadJson(store.exportSession(a.id),`${a.id}-${mode}-session.json`)}>↓ Download session JSON</button><AppLink className={styles.secondary} to={`/${mode}`}>All assessments</AppLink><button className={styles.textButton} onClick={()=>setReset(true)}>Reset demo</button></div>
    {reset&&<Modal title={`Reset the ${mode} demo?`} cancel={()=>setReset(false)} confirmLabel={`Reset ${mode} demo`} confirm={async()=>{try{await store.reset();navigate(`/${mode}`);}catch{}}}><p>This clears all four assessments and developmental reflections in the {mode} demo on this browser. The other mode is unchanged. Download your session first if you want to keep it.</p></Modal>}
  </div>;
}
