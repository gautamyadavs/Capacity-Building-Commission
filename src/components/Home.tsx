import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context";
import { caseAvailable, caseComplete, resumePath, casePath } from "../model";
import { AppLink } from "./Shared";
import { Modal } from "./Forms";
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
          Explore four fictional cases. Explain your reasoning, then review it
          when new information arrives.
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
      {!run.end && (
        <section
          aria-label="Assessment instructions"
          className={styles.writingGuidance}
        >
          <h2>Before you begin</h2>
          <p>
            Use the supplied fictional facts and label assumptions. Notes,
            online resources and generative AI are allowed without penalty;
            research is optional.
          </p>
          <p>
            Explain your reasoning in bullets or paragraphs. There is no timer
            or word limit, and writing polish is not assessed.
          </p>
          <p>
            You can pause and resume in this browser. Submit your initial
            response to receive new information; your submitted response stays
            available and cannot be edited.
          </p>
        </section>
      )}
      <h2 className={styles.sectionHeader}>Your cases</h2>
      {!run.end && (
        <p className={styles.sequenceNote}>
          {config.caseOrderPolicy === "free"
            ? "Choose any case. You can switch between unfinished cases; each draft is saved."
            : "Complete each case before starting the next."}
        </p>
      )}
      <div className={styles.batteryCases}>
        {config.cases.map((a) => {
          const s = run.sessions[a.id],
            done = caseComplete(a, s),
            available = caseAvailable(run, a.id);
          return (
            <article key={a.id} data-format={a.set} className={styles.caseCard}>
              <div className={styles.caseMain}>
                <h3>{a.title}</h3>
                <p>
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
                {available && !run.end ? (
                  done ? (
                    <AppLink
                      className={styles.cardLink}
                      to={`/learner/assessment/${a.id}/complete`}
                    >
                      View saved responses →
                    </AppLink>
                  ) : (
                    <button
                      className={styles.cardLink}
                      disabled={busy}
                      onClick={() => void openCase(a.id)}
                    >
                      {s.startedAt ? "Resume case" : "Start case"} →
                    </button>
                  )
                ) : run.end ? (
                  <AppLink to="/learner/review">
                    View submissions and feedback
                  </AppLink>
                ) : (
                  <p>Complete the preceding case to continue.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
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
