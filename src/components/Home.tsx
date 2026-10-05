import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context";
import {
  caseAvailable,
  caseComplete,
  currentPhase,
  resumePath,
} from "../model";
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
        <p className={styles.eyebrow}>
          DEVELOPMENTAL DIAGNOSTIC · {config.packageVersion}
        </p>
        <h1>Reasoning through governance decisions</h1>
        <p>
          Four fictional cases explore strategic choices, duties and citizen
          impacts, feasible implementation, adaptation, causal explanation,
          prediction, evidence interpretation and justified updating.
        </p>
        <p>
          This is one diagnostic occasion under assisted conditions. Criterion
          feedback follows human review. It has no overall score or pass/fail
          result.
        </p>
        <div className={styles.workspaceActions}>
          <AppLink className={styles.primary} to={resumePath(run)}>
            {run.end
              ? "View submissions and review"
              : run.actualSequence.length
                ? "Resume diagnostic"
                : "Start diagnostic"}{" "}
            →
          </AppLink>
          <span>
            {run.submissionSequence.length} of 8 phases submitted
            {run.end?.kind === "early" ? " · Ended early" : ""}
          </span>
        </div>
      </section>
      <section
        aria-label="Diagnostic instructions"
        className={styles.writingGuidance}
      >
        <h2>Before you begin</h2>
        <Paragraphs lines={config.instructions} />
        <p>
          Pause and resume on this browser. There is no timer or word ceiling.
          Initial responses are preserved before updates appear; update
          responses are saved separately. Substantive feedback is withheld until
          all four cases finish or you explicitly end early.
        </p>
      </section>
      <h2 className={styles.sectionHeader}>Your cases</h2>
      <p className={styles.sequenceNote}>
        Proposed starting order: A1, A2, B1, B2. Your actual sequence is
        recorded.
      </p>
      <div className={styles.batteryCases}>
        {config.cases.map((a) => {
          const s = run.sessions[a.id],
            done = caseComplete(a, s),
            p = currentPhase(a, s),
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
                      : "Submitted · Awaiting review"
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
                  <AppLink
                    className={styles.cardLink}
                    to={
                      done
                        ? `/learner/assessment/${a.id}/complete`
                        : `/learner/assessment/${a.id}${p ? `/stage/${p.id}` : ""}`
                    }
                  >
                    {done
                      ? "View saved responses"
                      : s.startedAt
                        ? "Resume case"
                        : "Open case"}{" "}
                    →
                  </AppLink>
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
      {!run.end && (
        <section className={styles.writingGuidance}>
          <h2>End before completing all four cases</h2>
          <p>
            You can end deliberately. Submitted answers remain preserved, drafts
            remain available for recovery, and unfinished opportunities are
            recorded without assigning performance levels.
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
