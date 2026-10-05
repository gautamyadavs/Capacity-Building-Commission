import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../context";
import { casePath, retryCaseIds, type ReviewBundle } from "../model";
import { Modal } from "./Forms";
import { AppLink, ErrorBox, SubmittedResponsePanel } from "./Shared";
import { LearnerFeedback } from "./Feedback";
import styles from "../app.module.css";

export function RetryButton({
  ids,
  label,
  openCase,
}: {
  ids: string[];
  label: string;
  openCase?: string;
}) {
  const { run, store, error } = useSession(),
    navigate = useNavigate();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const selected = retryCaseIds(run, ids);
  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await store.retry(ids, openCase);
      setConfirm(false);
      navigate(
        openCase ? casePath(store.getSnapshot().run, openCase) : "/learner",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => setConfirm(true)}
      >
        {label}
      </button>
      {confirm && (
        <Modal
          title={`${label}?`}
          cancel={() => setConfirm(false)}
          confirm={retry}
          confirmLabel="Save previous attempt and retry"
          busy={busy}
          error={error}
        >
          <p>
            Your current responses, drafts and any feedback stay available under
            Previous attempts. The selected cases start again with blank responses
            and the update hidden.
          </p>
          {selected.length < run.config.cases.length && (
            <p>
              Your work in the other cases stays in this attempt. Feedback for
              this attempt follows human review after you finish or end early.
            </p>
          )}
          {selected.length > ids.length && (
            <p>
              This saved session uses a fixed order, so the following cases also
              restart:{" "}
              {run.config.cases
                .filter((a) => selected.includes(a.id) && !ids.includes(a.id))
                .map((a) => a.title)
                .join("; ")}.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

export function PreviousAttempts() {
  const { store, run } = useSession();
  const attempts = store.previousAttempts();
  if (!attempts.length) return null;
  return (
    <details className={styles.references} key={run.runId}>
      <summary>Previous attempts ({attempts.length})</summary>
      <p>Saved in this browser. Open an attempt to read its responses and any feedback.</p>
      <ul>
        {attempts.map((attempt, i) => (
          <li key={attempt.runId}>
            <AppLink to={`/learner/attempt/${attempt.runId}`}>
              View previous attempt {attempts.length - i}
            </AppLink>
            {" · "}
            {attempt.config.cases.filter((a) =>
              a.phases.every((p) => attempt.sessions[a.id].submitted[p.id]),
            ).length} of 4 cases submitted
          </li>
        ))}
      </ul>
    </details>
  );
}

export function PreviousAttempt() {
  const { rid } = useParams(),
    { store } = useSession();
  const run = store.previousAttempts().find((r) => r.runId === rid);
  const [reviews, setReviews] = useState<ReviewBundle | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setReviews(null);
    setError(false);
    if (run)
      void store.reviewsFor(run)
        .then((value) => { if (active) setReviews(value); })
        .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [rid, store]);
  if (!run)
    return <ErrorBox message="This previous attempt is not available in this browser." />;
  const records = reviews?.records.filter(
    (r) => !reviews.records.some((later) => later.supersedes === r.id),
  ) || [];
  return (
    <div className={styles.workspace}>
      <AppLink className={styles.back} to="/learner">← All cases</AppLink>
      <h1 className={styles.debriefTitle}>Previous attempt</h1>
      <p>Your saved responses and drafts are read-only. Return to all cases to continue your current attempt.</p>
      {error && (
        <p role="alert">Feedback for this attempt could not be opened. Your saved responses are still available.</p>
      )}
      {run.config.cases.filter((a) => run.sessions[a.id].startedAt).map((a) => {
        const draft = run.sessions[a.id].draft;
        return (
          <section key={a.id} className={styles.caseRecord} data-format={a.set}>
            <h2>{a.title}</h2>
            {records.filter((r) => r.caseId === a.id).map((r) => (
              <LearnerFeedback key={r.id} record={r} config={run.config} />
            ))}
            {a.phases.filter((p) => run.sessions[a.id].submitted[p.id]).map((p) => (
              <SubmittedResponsePanel key={p.id} phase={p} snapshot={run.sessions[a.id].submitted[p.id]} />
            ))}
            {draft && (
              <details className={styles.submitted}>
                <summary>Unsubmitted draft</summary>
                <div className={styles.submittedBody}>
                  {a.phases.find((p) => p.id === draft.phaseId)!.prompts.map((f) => (
                    <section key={f.id} className={styles.answer}>
                      <h3>{f.label}</h3>
                      <p>{draft.answers[f.id] || "No draft response."}</p>
                    </section>
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
