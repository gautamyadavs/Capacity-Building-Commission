import { useState } from 'react';
import { useSession } from '../context';
import { assessmentComplete, currentStage, debriefEligible } from '../model';
import { downloadJson } from '../persistence';
import { SubmittedResponsePanel } from './Assessment';
import { Modal } from './Forms';
import { AppLink, Paragraphs } from './Shared';
import styles from '../app.module.css';

function Contours({format}:{format:string}) {
  return <svg className={styles.contours} viewBox="0 0 220 150" fill="none" aria-hidden="true">{Array.from({length:8},(_,i)=><path key={i} d={format==='A'?`M ${-20+i*15},150 Q ${10+i*15},${45-i*4} ${95+i*17},${60-i*6} T 245,${-20+i*10}`:`M ${-30+i*12},160 C ${170-i*8},${130-i*5} ${-40+i*16},${-60+i*8} ${250+i*10},${15+i*16}`} stroke="currentColor" strokeWidth="1.1"/>)}</svg>;
}
export function Home() {
  const {config,run,mode}=useSession();const completed=config.assessments.filter(a=>assessmentComplete(a,run.sessions[a.id])).length;
  return <>
    <section className={styles.hero}><div><p className={styles.eyebrow}>BHARAT KALP · LEADERSHIP PROGRAMME</p><h1>Judgement.<br/><em>Made visible.</em></h1><p className={styles.heroDescription}>Two ways to explore leadership reasoning.<br/>Four simulated governance challenges.</p></div><aside className={styles.heroNote}><span className={styles.overline}>A WORKING DESIGN FOR CBC REVIEW</span><p>Decide with the information you have.<br/>Reconsider when the situation changes.</p><div className={styles.heroStats}><div><strong>02</strong><span>Distinct formats</span></div><div><strong>04</strong><span>Assessment cases</span></div><div><strong>{String(completed).padStart(2,'0')}</strong><span>Completed</span></div></div></aside></section>
    <div className={styles.sectionHeader}><h2>Explore the assessments</h2><span>Asynchronous · Open book · Saved on this browser</span></div>
    <div className={styles.formatGrid}>{config.formats.map(format=><section key={format.id} data-format={format.id} className={styles.formatPanel}><header className={styles.formatHeader}><Contours format={format.id}/><span className={styles.formatTag}>FORMAT {format.id}</span><h2>{format.title}</h2><p>{format.description}</p><div className={styles.flow}>{format.id==='A'?'Initial Decision → New Information → Update → Decision Challenge':'Predict → Observe and Compare → Explain → Revise'}</div></header>
      <div className={styles.caseCards}>{config.assessments.filter(a=>a.format===format.id).map(a=>{
        const session=run.sessions[a.id];const done=assessmentComplete(a,session);const current=currentStage(a,session);const count=Object.keys(session.submitted).length;
        return <article key={a.id} className={styles.caseCard}><div className={styles.caseIndex}>{a.shortId}</div><div className={styles.caseMain}><div className={styles.caseMeta}><span>{format.id==='A'?'58–60':'40–48'} MIN SUGGESTED</span><span>{done?'✓ Complete':current?'In progress':'Not started'}</span></div><h3>{a.title}</h3><p>{count} of {a.stages.length} stages submitted</p><AppLink to={done?`/${mode}/assessment/${a.id}/complete`:current?`/${mode}/assessment/${a.id}/stage/${current.id}`:`/${mode}/assessment/${a.id}`} className={styles.cardLink}>{done?'Review assessment':current?'Resume assessment':'Start assessment'} <span aria-hidden="true">↗</span></AppLink></div></article>;
      })}</div>
      <div className={styles.debriefAccess}>{debriefEligible(config,run,format.id)?<AppLink to={`/${mode}/format/${format.id}/debrief`}>Open Format {format.id} developmental debrief →</AppLink>:<><span aria-hidden="true">▣</span><span>{format.id==='B'?'Prediction Trail and debrief':'Developmental debrief'} unlock after both cases</span></>}</div>
    </section>)}</div>
    <section className={styles.howItWorks}><div><span>01 / COMMIT</span><h3>Make your reasoning visible</h3><p>Use the supplied case facts. Bullets are welcome; writing style is not assessed.</p></div><div><span>02 / CONTINUE</span><h3>A deliberate step forward</h3><p>Your response locks before new information appears. Earlier submissions stay available to read.</p></div><div><span>03 / REFLECT</span><h3>Look back across both cases</h3><p>Complete a format’s two assessments to open its developmental debrief.</p></div></section>
    <div className={styles.prototypeNote}>{config.status.replace(/^Status: /,'')}</div>
    {mode==='reviewer'&&<ReviewerWorkspace/>}
  </>;
}

function ReviewerWorkspace() {
  const {config,store,error}=useSession();const learner=useSession('learner');const [reset,setReset]=useState(false);const [recoverLearner,setRecoverLearner]=useState(false);
  return <section className={styles.reviewerWorkspace}><p className={styles.eyebrow}>CBC DESIGN REVIEW</p><h2>Look behind the experience</h2><p>Preview every stage and its intended evidence, or use the assessment cards above to try the reviewer sandbox. Neither changes learner progress.</p>
    <div className={styles.reviewGrid}>{config.assessments.map(a=><section key={a.id}><h3>{a.shortId} · {a.title}</h3><ol>{a.stages.map(s=><li key={s.id}><AppLink to={`/reviewer/preview/${a.id}/${s.id}`}>{s.title} →</AppLink></li>)}</ol></section>)}</div>
    <div className={styles.actions}>{config.formats.map(f=><AppLink key={f.id} className={styles.secondary} to={`/reviewer/format/${f.id}/preview`}>Preview Format {f.id} debrief</AppLink>)}<button className={styles.secondary} onClick={()=>setReset(true)}>Reset reviewer demo</button></div>
    {config.formats.map(f=><details key={f.id} className={styles.reviewDetails}><summary>Format {f.id} — purpose and evidence architecture</summary><Paragraphs lines={f.reviewerNotes}/></details>)}
    {config.reviewerSections.map(s=><details key={s.title} className={styles.reviewDetails}><summary>{s.title}</summary><Paragraphs lines={s.paragraphs}/></details>)}
    <details className={styles.reviewDetails}><summary>Inspect learner submissions (read-only)</summary><p>Data source: learner demo. This view cannot edit learner responses.</p>
      {learner.fatal?<><p>{learner.error}</p><button className={styles.secondary} onClick={()=>downloadJson({raw:learner.store.recoveryData()},'learner-recovery.json')}>Download recovery data</button><button className={styles.textButton} onClick={()=>setRecoverLearner(true)}>Reset unreadable learner demo</button></>:<>{config.assessments.map(a=><section key={a.id}><h3>{a.shortId} · {a.title}</h3>{Object.keys(learner.run.sessions[a.id].submitted).length===0?<p>No submitted responses.</p>:a.stages.map(s=>learner.run.sessions[a.id].submitted[s.id]&&<SubmittedResponsePanel key={s.id} config={config} stage={s} snapshot={learner.run.sessions[a.id].submitted[s.id]} expanded={false}/>)}</section>)}<button className={styles.secondary} onClick={()=>downloadJson(learner.store.exportSession(),'learner-session.json')}>Download learner session JSON</button></>}
    </details><p className={styles.help}>Content version {config.contentVersion} · <a href={config.source.url} target="_blank" rel="noreferrer">Open source specification ↗</a></p>
    {reset&&<Modal title="Reset the reviewer sandbox?" cancel={()=>setReset(false)} confirmLabel="Reset reviewer demo" error={error} confirm={async()=>{try{await store.reset();setReset(false);}catch{}}}><p>This clears reviewer responses and reflections for all four cases. Learner progress stays unchanged.</p></Modal>}
    {recoverLearner&&<Modal title="Reset unreadable learner progress?" cancel={()=>setRecoverLearner(false)} confirmLabel="Reset learner demo" error={learner.error} confirm={async()=>{try{await learner.store.reset();setRecoverLearner(false);}catch{}}}><p>This intentionally clears the unreadable learner run and starts a fresh one. Download the recovery data before resetting. Reviewer data is unchanged.</p></Modal>}
  </section>;
}
