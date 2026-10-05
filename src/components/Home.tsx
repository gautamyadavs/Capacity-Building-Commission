import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context";
import { caseAvailable, caseComplete, resumePath, casePath } from "../model";
import { AppLink, Paragraphs } from "./Shared";
import { Modal } from "./Forms";
import styles from "../app.module.css";
export function Home() {
  const { config, run, reviews, store, error } = useSession(),
    navigate = useNavigate();
  const [end, setEnd] = useState(false),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [notes, setNotes] = useState(run.supportNotes),
    [support, setSupport] = useState(false);
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
      await store.end(
        reason || "Officer explicitly ended the diagnostic early",
      );
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
        <p className={styles.eyebrow}>DEVELOPMENTAL DIAGNOSTIC</p>
        <h1>Reasoning through governance decisions</h1>
        <p>
          Explore four fictional cases. Explain your choices and causes, then
          review them when new information arrives.
        </p>
        <div className={styles.workspaceActions}>
          {run.end ||
          (run.actualSequence.length && resumePath(run) !== "/learner") ? (
            <AppLink className={styles.primary} to={resumePath(run)}>
              {run.end ? "View submissions and feedback" : "Resume diagnostic"}{" "}
              →
            </AppLink>
          ) : (
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() =>
                void openCase(
                  run.config.cases.find(
                    (a) => !caseComplete(a, run.sessions[a.id]),
                  )!.id,
                )
              }
            >
              Start suggested case →
            </button>
          )}
          <span>
            {run.submissionSequence.length} of 8 phases submitted
            {run.end?.kind === "early" ? " · Ended early" : ""}
          </span>
        </div>
      </section>
      <section
        aria-label="Diagnostic instructions"
        className={`${styles.writingGuidance} ${styles.orientation}`}
      >
        <h2>Before you begin</h2>
        <p>
          Use the supplied fictional facts; label assumptions. Notes, online
          resources and generative AI are allowed without penalty. Research is
          optional and must not replace case facts.
        </p>
        <p>
          Bullets or short paragraphs are welcome. Explain your reasoning;
          polish, length, framework names and source counts are not scored.
          There is no timer or word limit.
        </p>
        <p>
          Pause and resume in this browser. Submitting makes that version
          read-only and reveals the update. You can keep a sound answer.
        </p>
        <p>
          Human feedback follows actual review after all four cases or an
          explicit early end. No overall score or pass/fail result.
        </p>
        <details>
          <summary>Full response instructions</summary>
          <Paragraphs lines={config.instructions} />
        </details>
      </section>
      <h2 className={styles.sectionHeader}>Your cases</h2>
      <p className={styles.sequenceNote}>
        {config.caseOrderPolicy === "free"
          ? "Choose any case. Suggested order: A1, A2, B1, B2. You can switch between unfinished cases; each draft is saved."
          : "This saved session follows A1, A2, B1, B2. Complete each case before starting the next."}
      </p>
      <div className={styles.batteryCases}>
        {config.cases.map((a) => {
          const s = run.sessions[a.id],
            done = caseComplete(a, s),
            available = caseAvailable(run, a.id);
          return (
            <article key={a.id} data-format={a.set} className={styles.caseCard}>
              <span className={styles.caseIndex}>{a.id}</span>
              <div className={styles.caseMain}>
                <h3>{a.title}</h3>
                <p>
                  {done
                    ? reviews?.records.some((r) => r.caseId === a.id)
                      ? "Submitted · Human review records available"
                      : "Submitted"
                    : run.end
                      ? "Diagnostic ended · Incomplete opportunities recorded"
                      : s.startedAt
                        ? "In progress"
                        : available
                          ? "Ready to start"
                          : "Not yet available"}
                </p>
                <p>{Object.keys(s.submitted).length} of 2 phases submitted</p>
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
                  <AppLink to="/learner/review">View record</AppLink>
                ) : (
                  <p>Complete the preceding case to continue.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <details className={styles.references}>
        <summary>General objectives and criteria</summary>
        {config.objectives.map((o) => (
          <section key={o.id}>
            <h3>
              {o.id} · {o.title}
            </h3>
            <p>{o.text}</p>
            <p>{o.mapping}</p>
          </section>
        ))}
        <p>
          Different defensible choices and justified retention can meet the
          criteria. Writing polish, framework names, confidence and source
          quantity are not scored.
        </p>
      </details>
      <details className={styles.references}>
        <summary>Access or support notes (optional)</summary>
        <p>
          Record an accessibility adaptation or support condition that changes
          what the task elicits. Open-book or AI use needs no disclosure or
          justification.
        </p>
        <label htmlFor="support-notes">Access or support condition</label>
        <textarea
          id="support-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!!run.end}
        />
        {!run.end && (
          <button
            className={styles.secondary}
            onClick={async () => {
              try {
                await store.support(notes);
                setSupport(true);
              } catch {}
            }}
          >
            Save support notes
          </button>
        )}
        {support && <p role="status">Support notes saved.</p>}
      </details>
      <details className={styles.references}>
        <summary>Design and source information</summary>
        <p>
          {config.packageVersion} · {config.frameworkVersion}. Practice is
          optional and pending. Subject-matter review, representative-officer
          responses and rater calibration remain pending.
        </p>
        <p>
          This records reasoning with assistance allowed. It does not establish
          unaided mastery or learning gains.
        </p>
        <ul>
          {config.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url}>{source.title}</a>
            </li>
          ))}
        </ul>
      </details>

      {!run.end && (
        <section className={styles.writingGuidance}>
          <h2>Finish later or end early</h2>
          <p>
            You can leave and resume here. Ending early closes further
            submissions and keeps your existing responses and drafts.
          </p>
          <button className={styles.secondary} onClick={() => setEnd(true)}>
            End diagnostic early
          </button>
        </section>
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
            This closes further submissions and releases the record for human
            review. Missing evidence does not become Developing. Download and
            start a new session for a new diagnostic occasion.
          </p>
          <label htmlFor="end-reason">
            Reason or technical limitation (optional)
          </label>
          <textarea
            id="end-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
