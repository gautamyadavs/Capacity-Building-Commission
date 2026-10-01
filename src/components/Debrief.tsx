import { useParams } from 'react-router-dom';
import { useSession } from '../context';
import { debriefEligible, type FormatId } from '../model';
import { AppLink, ErrorBox, Paragraphs } from './Shared';
import { CaseFacts, SubmittedResponsePanel } from './Assessment';
import { ResponseField } from './Forms';
import { downloadJson } from '../persistence';
import styles from '../app.module.css';

export function Debrief({preview=false}:{preview?:boolean}) {
  const {fid}=useParams();const {config,run,mode,store}=useSession();
  const format=config.formats.find(f=>f.id===fid);if(!format)return <ErrorBox message="Format not found."/>;
  const isPreview=preview&&mode==='reviewer';const eligible=debriefEligible(config,run,format.id);
  if(!eligible&&!isPreview)return <div className={styles.gate}><span className={styles.gateSymbol}>▣</span><h1>Your debrief is still locked</h1><p>Complete both Format {fid} assessments to unlock {fid==='B'?'the Prediction Trail and ':''}developmental reflection.</p><AppLink to={`/${mode}`} className={styles.primary}>Return to assessments →</AppLink></div>;
  const reflection=run.reflections[format.id];
  return <div data-format={fid}>
    <AppLink to={`/${mode}`} className={styles.back}>← All assessments</AppLink><p className={styles.eyebrow}>FORMAT {fid} · DEVELOPMENTAL DEBRIEF</p><h1 className={styles.debriefTitle}>{fid==='A'?'Your Decision Trail':'Your Prediction Trail'}</h1>
    {isPreview&&<div className={styles.previewNotice}><strong>Reviewer preview</strong><span>Showing the debrief structure. Missing submissions are not fabricated.</span></div>}
    <div className={styles.debriefIntro}><Paragraphs lines={format.debrief.information}/></div>
    {config.assessments.filter(a=>a.format===fid).map(a=><section key={a.id} className={styles.trail}><p className={styles.eyebrow}>{a.shortId}</p><h2>{a.title}</h2><div className={fid==='A'?styles.decisionTrail:styles.predictionTrail}>
      {a.stages.map((s,i)=><div key={s.id} className={styles.trailStep}><p className={styles.sectionEyebrow}>{fid==='A'?`${i+1}. ${s.title}`:['Prediction','Evidence classification','Explanation','Revised action'][i]}</p>
        {fid==='B'&&i===1&&<div><p className={styles.sectionEyebrow}>Observed evidence</p><CaseFacts stage={s}/></div>}
        {run.sessions[a.id].submitted[s.id]?<SubmittedResponsePanel config={config} stage={s} snapshot={run.sessions[a.id].submitted[s.id]}/>:<p className={styles.empty}>No submitted response in this reviewer sandbox.</p>}
      </div>)}
    </div></section>)}
    <section className={styles.reflections}><p className={styles.eyebrow}>LOOKING AHEAD</p><h2>Reflect on your practice</h2><p className={styles.help}>Optional and unscored. These reflections are stored separately from your assessment responses.</p>
      {format.debrief.fields.map(f=><ResponseField key={f.id} field={f} value={reflection.answers[f.id]||''} disabled={isPreview} onChange={value=>store.reflect(format.id,{...reflection.answers,[f.id]:value})}/>)}
      {!isPreview&&<div className={styles.actions}><button className={styles.primary} onClick={()=>void store.completeFormat(format.id as FormatId).catch(()=>{})}>{format.debrief.button} ✓</button><button className={styles.secondary} onClick={()=>downloadJson(store.exportSession(),`bharat-kalp-${mode}-session.json`)}>↓ Download session JSON</button></div>}
      {reflection.completedAt&&!isPreview&&<p role="status" className={styles.success}>Format {fid} complete. Your reflections have been saved.</p>}
    </section>
  </div>;
}
