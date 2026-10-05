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
import { RunStore } from "./persistence";
import { AppContext, useApp, useSession } from "./context";
import { Home } from "./components/Home";
import {
  AssessmentCompletion,
  AssessmentIntro,
  AssessmentStage,
} from "./components/Assessment";
import { Debrief } from "./components/Debrief";
import { ErrorBox } from "./components/Shared";
import { Files } from "./components/Files";
import { Reviewer } from "./components/Reviewer";
import { Coverage } from "./components/Coverage";
import { learnerReviewText } from "./presentation";
import styles from "./app.module.css";
function Layout() {
  const { run, store, saveStatus, error, notice, fatal } = useSession(),
    location = useLocation(),
    isReviewer = location.pathname === "/reviewer",
    isFacilitator = isReviewer || location.pathname === "/learner/files" || location.pathname === "/coverage";
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
        <div className={styles.brand}>
          <strong>BHARAT KALP</strong>
        </div>
      </header>
      {!isFacilitator && !run.end && (
        <section aria-label="Local saving status" className={styles.saveStrip}>
          <span
            role="status"
            className={
              saveStatus === "Not saved" ? styles.overLimit : styles.saveStatus
            }
          >
            Progress: {saveStatus}
          </span>
        </section>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className={styles.main}
        onBlurCapture={() => void store.flush().catch(() => {})}
      >
        {notice &&
          (isFacilitator ||
            notice.startsWith("The draft changed in another tab.")) && (
            <p role="status" className={styles.note}>
              {notice}
            </p>
          )}
        {error && !fatal && !isReviewer && (
          <div role="alert" className={styles.errorBox}>
            <h2>Progress needs attention</h2>
            <p>
              {isFacilitator
                ? error
                : saveStatus === "Not saved"
                  ? "Your progress could not be saved. Keep this page open and retry, or ask the facilitator for help."
                  : learnerReviewText(error, run.config)}
            </p>
            <button onClick={() => void store.flush().catch(() => {})}>
              Retry save
            </button>
          </div>
        )}
        {fatal && !isFacilitator ? (
          <section className={styles.gate}>
            <h1>Your saved progress could not be opened</h1>
            <p>
              Your stored work has been preserved. Keep this page open and ask
              the facilitator for help.
            </p>
          </section>
        ) : (
          <Outlet key={location.pathname} />
        )}
      </main>
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
            <Route path="/coverage" element={<Coverage />} />
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
