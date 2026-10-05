import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../context";
import {
  caseAvailable,
  caseComplete,
  currentPhase,
  resumePath,
  casePath,
} from "../model";
import {
  AppLink,
  CaseReference,
  ReferenceDialog,
  ErrorBox,
  StageProgress,
  SubmittedResponsePanel,
} from "./Shared";
import { Modal, ResponseField } from "./Forms";
import { RetryButton } from "./Trial";
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
        ← All cases
      </AppLink>
      <p className={styles.eyebrow}>FICTIONAL CASE</p>
      <h1>{a.title}</h1>
      <p>
        Start with the first question. Case information stays beside your response.
      </p>
      <button
        className={styles.primary}
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await store.begin(a.id);
            navigate(casePath(store.getSnapshot().run, a.id));
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
    [busy, setBusy] = useState(false),
    [referenceOpen, setReferenceOpen] = useState(false);
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
            : next.config.caseOrderPolicy === "free"
              ? "/learner"
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
        ← All cases
      </AppLink>
      <div className={styles.stageHeading}>
        <div>
          <p className={styles.eyebrow}>FICTIONAL CASE</p>
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
        <aside
          className={styles.referencePane}
          aria-label="Case reference"
          tabIndex={0}
        >
          <CaseReference a={a} phase={p} />
        </aside>
        <div className={styles.responseColumn}>
          <div className={styles.mobileReferenceControl}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setReferenceOpen(true)}
            >
              View case information
            </button>
          </div>
          {snap ? (
            <>
              <SubmittedResponsePanel phase={p} snapshot={snap} expanded />
              <AppLink className={styles.primary} to={resumePath(run)}>
                Continue →
              </AppLink>
            </>
          ) : run.end ? (
            <section>
              <h2>This response was not submitted</h2>
              <p>
                The session ended. Your draft is saved separately from your
                submitted responses.
              </p>
              {p.prompts.map((f) => (
                <section className={styles.answer} key={f.id}>
                  <h3>{f.label}</h3>
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
              <p className={styles.responseGuidance}>
                Start with the first question. Use bullets or short paragraphs;
                you can refine your draft before submitting.
              </p>
              <details className={styles.writingHelp}>
                <summary>Resources and writing</summary>
                <p>
                  Use the supplied fictional facts and label assumptions. Notes,
                  online resources and generative AI are allowed without penalty;
                  research is optional.
                </p>
                <p>
                  There is no timer or word limit. Writing polish is not assessed.
                  Drafts save in this browser so you can pause and resume.
                </p>
              </details>
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
                <p>
                  {p.kind === "initial"
                    ? "Submit to receive new information. This response stays available and becomes read-only."
                    : "You can keep sound reasoning or revise it. This update is saved separately and becomes read-only."}
                </p>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={busy}
                >
                  {p.kind === "initial"
                    ? "Submit initial response"
                    : "Submit update"}{" "}
                  →
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
      {referenceOpen && (
        <ReferenceDialog
          a={a}
          phase={p}
          close={() => setReferenceOpen(false)}
        />
      )}
      {confirm && (
        <Modal
          title={
            p.kind === "initial" ? "Submit initial response?" : "Submit update?"
          }
          cancel={() => setConfirm(false)}
          confirm={commit}
          confirmLabel={
            p.kind === "initial" ? "Submit initial response" : "Submit update"
          }
          busy={busy}
          error={error}
        >
          <p>
            {p.kind === "initial"
              ? "This submitted version cannot be edited. It stays available for reference and unlocks the update. Your update will be a separate record."
              : "This submitted update cannot be edited. It stays available alongside your initial response and completes this case."}
          </p>
          {draft && Object.values(draft.answers).some((x) => !x.trim()) && (
            <p>
              Some responses are blank. You can go back to answer them or submit
              them as they are.
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
      <p className={styles.eyebrow}>SUBMITTED</p>
      <h1>Case submitted</h1>
      <p>
        Your responses have been saved. Feedback will follow human review after
        you finish the cases or end the session early.
      </p>
      {a.phases.map((p) => (
        <SubmittedResponsePanel
          key={p.id}
          phase={p}
          snapshot={run.sessions[a.id].submitted[p.id]}
        />
      ))}
      <div className={styles.actions}>
        <AppLink
          className={styles.primary}
          to={run.end ? "/learner/review" : "/learner"}
        >
          {run.end ? "View submissions and feedback" : "Choose another case"} →
        </AppLink>
        <RetryButton ids={[a.id]} openCase={a.id} label="Retry case" />
      </div>
    </section>
  );
}
