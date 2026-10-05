import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context";
import { caseAvailable, caseComplete, resumePath, casePath } from "../model";
import { AppLink } from "./Shared";
import { Modal } from "./Forms";
import { PreviousAttempts, RetryButton } from "./Trial";
import styles from "../app.module.css";
export function Home() {
  const { config, run, store, error } = useSession(),
    navigate = useNavigate();
  const [end, setEnd] = useState(false),
    [busy, setBusy] = useState(false);
  const openCase = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await store.begin(id);
      navigate(casePath(store.getSnapshot().run, id));
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await store.end("Officer explicitly ended the diagnostic early");
      setEnd(false);
      navigate("/learner/review");
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.workspace}>
      <section className={styles.workspaceIntro}>
        <h1>Reasoning through governance decisions</h1>
        <p>
          Choose a fictional case and start with the first question. Then revisit
          your reasoning when new information arrives.
        </p>
        <p>
          {
            config.cases.filter((a) => caseComplete(a, run.sessions[a.id]))
              .length
          }{" "}
          of 4 cases submitted
        </p>
        {(run.end ||
          (run.actualSequence.length > 0 &&
            resumePath(run) !== "/learner")) && (
          <AppLink className={styles.primary} to={resumePath(run)}>
            {run.end ? "View submissions and feedback" : "Resume diagnostic"} →
          </AppLink>
        )}
      </section>
      <div className={styles.batteryCases}>
        {config.cases.map((a) => {
          const s = run.sessions[a.id],
            done = caseComplete(a, s),
            available = caseAvailable(run, a.id);
          return (
            <article key={a.id} data-format={a.set} className={styles.caseCard}>
              <div className={styles.caseMain}>
                <h2>{a.title}</h2>
                <p>
                  Set {a.set} ·{" "}
                  {done
                    ? "Submitted"
                    : run.end
                      ? "Not completed"
                      : s.startedAt
                        ? "In progress"
                        : available
                          ? "Ready to start"
                          : "Not yet available"}
                </p>
                {done ? (
                  <AppLink
                    className={styles.cardLink}
                    to={`/learner/assessment/${a.id}/complete`}
                  >
                    View saved responses →
                  </AppLink>
                ) : available && !run.end ? (
                  <button
                    className={styles.cardLink}
                    disabled={busy}
                    onClick={() => void openCase(a.id)}
                  >
                    {s.startedAt ? "Resume case" : "Start case"} →
                  </button>
                ) : run.end ? (
                  <AppLink to="/learner/review">
                    View submissions and feedback
                  </AppLink>
                ) : (
                  <p>Complete the preceding case to continue.</p>
                )}
                {(s.startedAt || (run.end && available)) && (
                  <div className={styles.caseRetry}>
                    <RetryButton
                      ids={[a.id]}
                      openCase={a.id}
                      label={s.startedAt ? "Retry case" : "Start case"}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {run.actualSequence.length > 0 && (
        <section aria-label="Trial retries" className={styles.trialRetries}>
          <p>Try a case or a whole set again. Previous attempts stay saved in this browser.</p>
          <div className={styles.actions}>
            {(["A", "B"] as const).map((set) =>
              config.cases.some((a) => a.set === set && run.sessions[a.id].startedAt) && (
                <RetryButton
                  key={set}
                  ids={config.cases.filter((a) => a.set === set).map((a) => a.id)}
                  label={`Retry set ${set}`}
                />
              ),
            )}
            <RetryButton ids={config.cases.map((a) => a.id)} label="Retry all cases" />
          </div>
        </section>
      )}
      <PreviousAttempts />
      {!run.end && (
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={() => setEnd(true)}>
            End diagnostic early
          </button>
        </div>
      )}
      {end && (
        <Modal
          title="End this diagnostic early?"
          cancel={() => setEnd(false)}
          confirm={finish}
          confirmLabel="End diagnostic and preserve record"
          busy={busy}
          error={error}
        >
          <p>
            This closes further submissions and saves your responses and drafts.
            To continue later, cancel and leave this page instead.
          </p>
        </Modal>
      )}
    </div>
  );
}
