import { useEffect, useMemo } from "react";
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import type { Config } from "./model";
import { RunStore, downloadJson } from "./persistence";
import { AppContext, useApp, useSession } from "./context";
import { Home } from "./components/Home";
import {
  AssessmentCompletion,
  AssessmentIntro,
  AssessmentStage,
} from "./components/Assessment";
import { Debrief } from "./components/Debrief";
import { AppLink, ErrorBox } from "./components/Shared";
import { Files } from "./components/Files";
import { Reviewer } from "./components/Reviewer";
import styles from "./app.module.css";
function Layout() {
  const { run, store, saveStatus, error, notice, fatal } = useSession(),
    location = useLocation(),
    isReviewer = location.pathname === "/reviewer";
  useEffect(() => {
    document.title = "Bharat KALP · Developmental diagnostic";
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
  return (
    <div className={styles.app}>
      <a
        href="#main-content"
        className={styles.skip}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className={styles.header}>
        <AppLink to="/learner" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            क
          </span>
          <span>
            <strong>BHARAT KALP</strong>
            <small>Developmental diagnostic prototype</small>
          </span>
        </AppLink>
        <nav aria-label="Main navigation">
          <AppLink to="/learner">Diagnostic home</AppLink>
          <AppLink to="/learner/files">Recovery and files</AppLink>
          {run.end && (
            <AppLink to="/learner/review">Submissions and feedback</AppLink>
          )}
        </nav>
      </header>
      {!isReviewer && (
        <section aria-label="Local saving status" className={styles.saveStrip}>
          <span>Progress in this browser</span>
          <span
            role="status"
            className={
              saveStatus === "Not saved" ? styles.overLimit : styles.saveStatus
            }
          >
            {saveStatus}
          </span>
        </section>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className={styles.main}
        onBlurCapture={() => void store.flush().catch(() => {})}
      >
        {notice && !isReviewer && (
          <p role="status" className={styles.note}>
            {notice}
          </p>
        )}
        {error && !fatal && !isReviewer && (
          <div role="alert" className={styles.errorBox}>
            <h2>Progress needs attention</h2>
            <p>{error}</p>
            <button onClick={() => void store.flush().catch(() => {})}>
              Retry save
            </button>
            <button
              onClick={() =>
                downloadJson(store.exportSession(), "kalp-unsaved-session.json")
              }
            >
              Download current session and drafts
            </button>
          </div>
        )}
        {fatal && !isReviewer && location.pathname !== "/learner/files" ? (
          <section className={styles.gate}>
            <h1>Saved progress needs recovery</h1>
            <p>{error}</p>
            <p>
              The stored data has been preserved. Use Recovery and files to
              download it or preserve it and start a new session.
            </p>
            <AppLink className={styles.primary} to="/learner/files">
              Open recovery and files
            </AppLink>
          </section>
        ) : (
          <Outlet key={location.pathname} />
        )}
      </main>
      <footer className={styles.footer}>
        <span>BHARAT KALP · Diagnostic design review</span>
        <AppLink to="/reviewer">Reviewer workspace</AppLink>
      </footer>
    </div>
  );
}
function PersistenceEvents() {
  const { store } = useApp();
  useEffect(() => {
    void store.loadReviews();
    const sync = (e: StorageEvent) => {
      if (e.key === store.key || e.key === null) store.sync();
      if (e.key?.includes(":reviews:") || e.key === null)
        void store.loadReviews();
    };
    const flush = () => void store.flush().catch(() => {}),
      visibility = () => {
        if (document.visibilityState === "hidden") flush();
        else {
          store.sync();
          void store.loadReviews();
        }
      };
    window.addEventListener("storage", sync);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [store]);
  return null;
}
export default function App({
  config,
  store,
}: {
  config: Config;
  store?: RunStore;
}) {
  const value = useMemo(
    () => ({ config, store: store || new RunStore(config) }),
    [config, store],
  );
  return (
    <AppContext.Provider value={value}>
      <PersistenceEvents />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/learner" replace />} />
          <Route element={<Layout />}>
            <Route path="/learner" element={<Home />} />
            <Route
              path="/learner/assessment/:aid"
              element={<AssessmentIntro />}
            />
            <Route
              path="/learner/assessment/:aid/stage/:sid"
              element={<AssessmentStage />}
            />
            <Route
              path="/learner/assessment/:aid/complete"
              element={<AssessmentCompletion />}
            />
            <Route path="/learner/review" element={<Debrief />} />
            <Route path="/learner/files" element={<Files />} />
            <Route
              path="/learner/intermission"
              element={<Navigate to="/learner" replace />}
            />
            <Route
              path="/learner/format/:fid/debrief"
              element={<Navigate to="/learner/review" replace />}
            />
            <Route path="/reviewer" element={<Reviewer />} />
            <Route
              path="*"
              element={<ErrorBox message="This page does not exist." />}
            />
          </Route>
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}
