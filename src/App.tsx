import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { Config } from './model';
import { RunStore, downloadJson } from './persistence';
import { AppContext, useApp, useSession } from './context';
import { Home } from './components/Home';
import { AssessmentCompletion, AssessmentIntro, AssessmentStage, Intermission } from './components/Assessment';
import { Debrief } from './components/Debrief';
import { AppLink, ErrorBox } from './components/Shared';
import { Modal } from './components/Forms';
import styles from './app.module.css';

function Layout() {
  const { store, saveStatus, error, notice, fatal } = useSession(); const location = useLocation(); const [reset, setReset] = useState(false);
  useEffect(() => {
    document.title = 'Bharat KALP · Leadership assessment';
    requestAnimationFrame(() => { const heading = document.querySelector<HTMLElement>('main h1'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } window.scrollTo(0, 0); });
  }, [location.pathname]);
  return <div className={styles.app}><a href="#main-content" className={styles.skip} onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <header className={styles.header}><AppLink to="/learner" className={styles.brand}><span className={styles.brandMark} aria-hidden="true">क</span><span><strong>BHARAT KALP</strong><small>Capacity Building Commission</small></span></AppLink><nav aria-label="Main navigation"><AppLink to="/learner" className={styles.cardLink}>Assessment home</AppLink></nav></header>
    <div className={styles.saveStrip}><span>Progress saved on this browser</span><span role="status" aria-live="polite" className={saveStatus === 'Not saved' ? styles.overLimit : styles.saveStatus}>{saveStatus}</span></div>
    <main id="main-content" tabIndex={-1} className={styles.main} onBlurCapture={() => void store.flush().catch(() => {})}>
      {notice && <p role="status" className={styles.note}>{notice}</p>}
      {error && !fatal && <div role="alert" className={styles.errorBox}><strong>Progress needs attention</strong><p>{error}</p><button onClick={() => void store.flush().catch(() => {})}>Retry save</button></div>}
      {fatal ? <section className={styles.gate}><h1>Saved progress needs recovery</h1><p>{error}</p><p>Download your saved data before starting again.</p><div className={styles.actions}><button className={styles.secondary} onClick={() => downloadJson({ raw: store.recoveryData() }, 'assessment-recovery.json')}>Download recovery data</button><button className={styles.secondary} onClick={() => setReset(true)}>Start a new assessment</button></div></section> : <Outlet key={location.pathname}/>}
    </main>
    <footer className={styles.footer}><span>BHARAT KALP <span className={styles.footerDivider}>/</span> Capacity Building Commission</span><span>Simulated governance cases</span></footer>
    {reset && <Modal title="Start a new assessment?" cancel={() => setReset(false)} confirmLabel="Start again" confirm={async () => { try { await store.reset(); setReset(false); } catch {} }}><p>This clears the unreadable assessment progress on this browser. Download your recovery data first if you want to keep it.</p></Modal>}
  </div>;
}
function PersistenceEvents() {
  const { store } = useApp();
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === store.key || event.key === null) store.sync(); };
    const flush = () => void store.flush().catch(() => {});
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); else store.sync(); };
    window.addEventListener('storage', sync); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); };
  }, [store]); return null;
}
export default function App({ config, store }: { config: Config; store?: RunStore }) {
  const value = useMemo(() => ({ config, store: store || new RunStore(config, 'learner') }), [config, store]);
  return <AppContext.Provider value={value}><PersistenceEvents/><HashRouter><Routes>
    <Route path="/" element={<Navigate to="/learner" replace/>}/><Route path="/learner" element={<Layout/>}>
      <Route index element={<Home/>}/><Route path="assessment/:aid" element={<AssessmentIntro/>}/><Route path="assessment/:aid/stage/:sid" element={<AssessmentStage/>}/><Route path="assessment/:aid/complete" element={<AssessmentCompletion/>}/>
      <Route path="intermission" element={<Intermission/>}/><Route path="review" element={<Debrief/>}/><Route path="format/:fid/debrief" element={<Navigate to="/learner/review" replace/>}/><Route path="*" element={<ErrorBox message="This page does not exist."/>}/>
    </Route><Route path="*" element={<Navigate to="/learner" replace/>}/>
  </Routes></HashRouter></AppContext.Provider>;
}
