import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../context";
import {
  caseAvailable,
  caseComplete,
  currentPhase,
  resumePath,
} from "../model";
import {
  AppLink,
  CaseFacts,
  ErrorBox,
  StageProgress,
  SubmittedResponsePanel,
} from "./Shared";
import { Modal, ResponseField } from "./Forms";
import styles from "../app.module.css";
export function AssessmentIntro() {
  const { aid } = useParams(),
    { run, store } = useSession(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const a = run.config.cases.find((a) => a.id === aid);
  if (!a) return <ErrorBox message="Case not found." />;
  if (!caseAvailable(run, a.id) || run.end)
    return (
      <ErrorBox message="This case is unavailable for new submissions. Use the diagnostic record or complete preceding cases." />
    );
  return (
    <section className={styles.intro}>
      <AppLink className={styles.back} to="/learner">
        ← Diagnostic home
      </AppLink>
      <p className={styles.eyebrow}>{a.id} · FICTIONAL CASE</p>
      <h1>{a.title}</h1>
      <p>
        Two phases: {a.phases.map((p) => p.title.toLowerCase()).join(", then ")}
        . Submit the initial response before the update appears. Your exact
        initial response stays available for reference.
      </p>
      <button
        className={styles.primary}
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await store.begin(a.id);
            navigate(resumePath(store.getSnapshot().run));
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : "Begin or resume case"} →
      </button>
    </section>
  );
}
export function AssessmentStage() {
  const { aid, sid } = useParams(),
    { run, store, error } = useSession(),
    navigate = useNavigate();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const a = run.config.cases.find((a) => a.id === aid),
    p = a?.phases.find((p) => p.id === sid);
  if (!a || !p) return <ErrorBox message="Case phase not found." />;
  const s = run.sessions[a.id];
  if (!caseAvailable(run, a.id) || !s.revealedAt[p.id])
    return (
      <section className={styles.gate}>
        <h1>This phase is not available yet</h1>
        <p>Submit the preceding phase before receiving further information.</p>
        <AppLink className={styles.primary} to={resumePath(run)}>
          Continue diagnostic →
        </AppLink>
      </section>
    );
  const snap = s.submitted[p.id],
    draft = s.draft?.phaseId === p.id ? s.draft : null;
  const commit = async () => {
    if (busy || !draft) return;
    setBusy(true);
    try {
      await store.submit(a.id, p.id, draft);
      setConfirm(false);
      const next = store.getSnapshot().run;
      const following = currentPhase(a, next.sessions[a.id]);
      navigate(
        next.end
          ? "/learner/review"
          : following
            ? `/learner/assessment/${a.id}/stage/${following.id}`
            : `/learner/assessment/${a.id}/complete`,
      );
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.workspace} data-format={a.set}>
      <AppLink className={styles.back} to="/learner">
        ← Diagnostic home
      </AppLink>
      <div className={styles.stageHeading}>
        <div>
          <p className={styles.eyebrow}>{a.id} · FICTIONAL CASE</p>
          <h1>{a.title}</h1>
        </div>
      </div>
      <StageProgress a={a} current={p.id} />
      <section className={styles.taskHeader} aria-label="Current task">
        <div>
          <h2>{p.title}</h2>
          <p>{p.task}</p>
        </div>
      </section>
      <div className={styles.stageWork}>
        <CaseFacts phase={p} />
        {p.kind === "update" && (
          <details className={styles.references} open>
            <summary>Initial facts and exact submitted response</summary>
            <CaseFacts phase={a.phases[0]} />
            <SubmittedResponsePanel
              phase={a.phases[0]}
              snapshot={s.submitted[a.phases[0].id]}
              expanded
            />
          </details>
        )}
        {snap ? (
          <>
            <SubmittedResponsePanel phase={p} snapshot={snap} expanded />
            <AppLink className={styles.primary} to={resumePath(run)}>
              Continue to diagnostic record →
            </AppLink>
          </>
        ) : run.end ? (
          <section>
            <h2>Phase left unsubmitted</h2>
            <p>
              The diagnostic ended. This draft is retained for recovery; it is
              not submitted evidence.
            </p>
            {p.prompts.map((f) => (
              <section className={styles.answer} key={f.id}>
                <h3>
                  {f.id} · {f.label}
                </h3>
                <p>{draft?.answers[f.id] || "No draft response"}</p>
              </section>
            ))}
          </section>
        ) : draft ? (
          <form
            aria-label="Phase response"
            className={styles.responseForm}
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <h2>Your response</h2>
            {p.prompts.map((f) => (
              <ResponseField
                key={f.id}
                prompt={f}
                value={draft.answers[f.id]}
                onChange={(value) =>
                  store.edit(a.id, {
                    ...draft,
                    answers: { ...draft.answers, [f.id]: value },
                  })
                }
                disabled={busy}
              />
            ))}
            <div className={styles.submitBar}>
              <p>Your exact response will be preserved.</p>
              <button type="submit" className={styles.primary} disabled={busy}>
                Submit phase →
              </button>
            </div>
          </form>
        ) : null}
      </div>
      {confirm && (
        <Modal
          title="Submit and preserve this response?"
          cancel={() => setConfirm(false)}
          confirm={commit}
          confirmLabel="Submit and preserve"
          busy={busy}
          error={error}
        >
          <p>
            {p.kind === "initial"
              ? "The initial response will be saved before the update is revealed. Later responses become a separate record; this original stays readable."
              : "This update is saved separately from your initial response."}
          </p>
          {draft && Object.values(draft.answers).some((x) => !x.trim()) && (
            <p>
              Some responses are blank. They will stay blank; no performance
              level is inferred. Human review checks relevant reasoning
              elsewhere in the same phase.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
export function AssessmentCompletion() {
  const { aid } = useParams(),
    { run } = useSession();
  const a = run.config.cases.find((a) => a.id === aid);
  if (!a || !caseComplete(a, run.sessions[a.id]))
    return (
      <ErrorBox message="Complete both phases to open this case record." />
    );
  return (
    <section className={styles.completion}>
      <p className={styles.eyebrow}>{a.id} · SUBMITTED</p>
      <h1>Both phase responses are preserved</h1>
      <p>
        Criterion judgements await human review. Substantive feedback becomes
        available after all four cases finish or an explicit early end.
      </p>
      {a.phases.map((p) => (
        <SubmittedResponsePanel
          key={p.id}
          phase={p}
          snapshot={run.sessions[a.id].submitted[p.id]}
        />
      ))}
      <div className={styles.actions}>
        <AppLink className={styles.primary} to={resumePath(run)}>
          {run.end ? "View diagnostic record" : "Continue to next case"} →
        </AppLink>
        <AppLink className={styles.secondary} to="/learner">
          Diagnostic home
        </AppLink>
      </div>
    </section>
  );
}
