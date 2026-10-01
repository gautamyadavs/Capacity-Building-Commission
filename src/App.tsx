import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import type { Config, Mode } from './model';
import { RunStore, downloadJson } from './persistence';
import { AppContext, ModeContext, useApp, useSession } from './context';
import { Home } from './components/Home';
import { AssessmentCompletion, AssessmentIntro, AssessmentStage } from './components/Assessment';
import { Debrief } from './components/Debrief';
import { AppLink, ErrorBox } from './components/Shared';
import { Modal } from './components/Forms';
import styles from './app.module.css';

function Shell() {
  const {mode:rawMode}=useParams();const mode:Mode=rawMode==='reviewer'?'reviewer':'learner';
  if(rawMode!=='learner'&&rawMode!=='reviewer')return <Navigate to="/learner" replace/>;
  return <ModeContext.Provider value={mode}><Layout/></ModeContext.Provider>;
}
function Layout() {
  const {mode,store,saveStatus,error,fatal}=useSession();const location=useLocation();const [reset,setReset]=useState(false);
  useEffect(()=>{document.title=`Bharat KALP · ${mode==='reviewer'?'Reviewer':'Learner'} mode`;requestAnimationFrame(()=>{const heading=document.querySelector<HTMLElement>('main h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}window.scrollTo(0,0);});},[location.pathname,mode]);
  return <div className={styles.app}><a href="#main-content" className={styles.skip} onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>Skip to content</a>
    <header className={styles.header}><AppLink to={`/${mode}`} className={styles.brand}><span className={styles.brandMark} aria-hidden="true">क</span><span><strong>BHARAT KALP</strong><small>Capacity Building Commission</small></span></AppLink><div className={styles.headerRight}><span className={styles.prototypePill}>DESIGN REVIEW PROTOTYPE</span><nav className={styles.modeSwitch} aria-label="Experience mode"><AppLink to="/learner" aria-current={mode==='learner'?'page':undefined}>Learner</AppLink><AppLink to="/reviewer" aria-current={mode==='reviewer'?'page':undefined}>Reviewer</AppLink></nav></div></header>
    {mode==='reviewer'&&<div className={styles.reviewerBanner}><strong>REVIEWER MODE</strong><span>Separate sandbox · Future stages and evidence notes available</span><AppLink to="/reviewer">Review workspace ↗</AppLink></div>}
    <div className={styles.saveStrip}><span>{mode==='reviewer'?'Reviewer sandbox':'Learner demo'}</span><span role="status" aria-live="polite" className={saveStatus==='Not saved'?styles.overLimit:styles.saveStatus}>{saveStatus==='Saved'?'● ':''}{saveStatus}</span></div>
    <main id="main-content" tabIndex={-1} className={styles.main} onBlurCapture={()=>void store.flush().catch(()=>{})}>
      {error&&!fatal&&<div role="alert" className={styles.errorBox}><strong>Progress needs attention</strong><p>{error}</p><button onClick={()=>void store.flush().catch(()=>{})}>Retry save</button></div>}
      {fatal?<section className={styles.gate}><h1>Saved progress needs recovery</h1><p>{error}</p><p>The original data is preserved. Download it before starting again.</p><div className={styles.actions}><button className={styles.secondary} onClick={()=>downloadJson({raw:store.recoveryData()},`${mode}-recovery.json`)}>Download recovery data</button>{mode==='reviewer'?<button className={styles.secondary} onClick={()=>setReset(true)}>Reset reviewer demo</button>:<a className={styles.primary} href="#/reviewer">Open reviewer recovery →</a>}</div></section>:<Outlet key={location.pathname}/>}
    </main>
    <footer className={styles.footer}><span>BHARAT KALP <span className={styles.footerDivider}>/</span> Capacity Building Commission</span><span>Working draft · Simulated cases · For design review</span></footer>
    {reset&&<Modal title="Reset reviewer progress?" cancel={()=>setReset(false)} confirmLabel="Reset reviewer demo" confirm={async()=>{try{await store.reset();setReset(false);}catch{}}}><p>This clears the unreadable reviewer sandbox. Learner progress is unchanged.</p></Modal>}
  </div>;
}
function PersistenceEvents() {
  const {stores}=useApp();
  useEffect(()=>{
    const sync=(event:StorageEvent)=>Object.values(stores).forEach(s=>{if(event.key===s.key||event.key===null)s.sync();});
    const flush=()=>Object.values(stores).forEach(s=>void s.flush().catch(()=>{}));
    const visibility=()=>{if(document.visibilityState==='hidden')flush();else Object.values(stores).forEach(s=>s.sync());};
    window.addEventListener('storage',sync);window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);};
  },[stores]);return null;
}
export default function App({config}:{config:Config}) {
  const value=useMemo(()=>({config,stores:{learner:new RunStore(config,'learner'),reviewer:new RunStore(config,'reviewer')}}),[config]);
  return <AppContext.Provider value={value}><PersistenceEvents/><HashRouter><Routes>
    <Route path="/" element={<Navigate to="/learner" replace/>}/><Route path="/:mode" element={<Shell/>}>
      <Route index element={<Home/>}/><Route path="assessment/:aid" element={<AssessmentIntro/>}/><Route path="assessment/:aid/stage/:sid" element={<AssessmentStage/>}/><Route path="assessment/:aid/complete" element={<AssessmentCompletion/>}/><Route path="format/:fid/debrief" element={<Debrief/>}/><Route path="preview/:aid/:sid" element={<AssessmentStage preview/>}/><Route path="format/:fid/preview" element={<Debrief preview/>}/><Route path="*" element={<ErrorBox message="This page does not exist."/>}/>
    </Route><Route path="*" element={<Navigate to="/learner" replace/>}/>
  </Routes></HashRouter></AppContext.Provider>;
}
