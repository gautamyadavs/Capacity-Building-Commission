import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  criteriaFor,
  evidenceStatuses,
  levels,
  type Judgement,
  type Evidence,
  type Phase,
  type Run,
} from "../model";
import { ReviewerStore, emptyJudgement, type ReviewDraft } from "../reviewer";
import { downloadJson } from "../persistence";
import { CaseFacts, SubmittedResponsePanel } from "./Shared";
import { FileInput } from "./Files";
import { ReviewFeedback } from "./Feedback";
import { Modal } from "./Forms";
import styles from "../app.module.css";
function JudgementEditor({
  value,
  phase,
  change,
  title,
}: {
  value: Judgement;
  phase: Phase;
  change: (v: Judgement) => void;
  title: string;
}) {
  return (
    <fieldset className={styles.judgement}>
      <legend>{title}</legend>
      <p>
        Mapped prompts locate intended elicitation. Relevant evidence in any
        prompt of this phase can contribute; record its actual location.
      </p>
      <label>
        Descriptive judgement or evidence status
        <select
          value={value.judgement || ""}
          onChange={(e) =>
            change({
              ...value,
              judgement: (e.target.value || null) as Judgement["judgement"],
            })
          }
        >
          <option value="">No defensible level selected</option>
          {[...levels, ...evidenceStatuses].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        Review status
        <select
          value={value.reviewStatus}
          onChange={(e) =>
            change({
              ...value,
              reviewStatus: e.target.value as Judgement["reviewStatus"],
            })
          }
        >
          <option>Reviewed</option>
          <option>Uncertain</option>
        </select>
      </label>
      {value.evidence.map((e, i) => (
        <fieldset key={i} className={styles.evidenceLocation}>
          <legend>
            Evidence location {i + 1} · {phase.id}
          </legend>
          <label>
            Prompt
            <select
              value={e.promptId}
              onChange={(event) =>
                change({
                  ...value,
                  evidence: value.evidence.map((old, n) =>
                    n === i
                      ? { ...old, promptId: event.target.value, excerpt: "" }
                      : old,
                  ),
                })
              }
            >
              {phase.prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Precise location in response or missing opportunity
            <input
              value={e.location}
              onChange={(event) =>
                change({
                  ...value,
                  evidence: value.evidence.map((old, n) =>
                    n === i ? { ...old, location: event.target.value } : old,
                  ),
                })
              }
              placeholder="e.g. second bullet, or phase not revealed"
            />
          </label>
          <label>
            Exact response excerpt (optional if precise location is given)
            <textarea
              rows={3}
              value={e.excerpt}
              onChange={(event) =>
                change({
                  ...value,
                  evidence: value.evidence.map((old, n) =>
                    n === i ? { ...old, excerpt: event.target.value } : old,
                  ),
                })
              }
            />
          </label>
          {value.evidence.length > 1 && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() =>
                change({
                  ...value,
                  evidence: value.evidence.filter((_, n) => n !== i),
                })
              }
            >
              Remove location {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className={styles.secondary}
        onClick={() =>
          change({
            ...value,
            evidence: [
              ...value.evidence,
              {
                phaseId: phase.id,
                promptId: phase.prompts[0].id,
                location: "",
                excerpt: "",
              },
            ],
          })
        }
      >
        Add evidence location
      </button>
      <label>
        Descriptor-based rationale
        <textarea
          rows={4}
          value={value.rationale}
          onChange={(e) => change({ ...value, rationale: e.target.value })}
        />
      </label>
      <label>
        Supported strength, unresolved reasoning link or evidence limitation
        <textarea
          rows={4}
          value={value.strengthOrGap}
          onChange={(e) => change({ ...value, strengthOrGap: e.target.value })}
        />
      </label>
      <label>
        Relevant next opportunity or further review (where available)
        <textarea
          rows={3}
          value={value.nextOpportunity}
          onChange={(e) =>
            change({ ...value, nextOpportunity: e.target.value })
          }
        />
      </label>
      {value.reviewStatus === "Uncertain" && (
        <label>
          Competing interpretations requiring review
          <textarea
            rows={4}
            value={value.competingInterpretations}
            onChange={(e) =>
              change({ ...value, competingInterpretations: e.target.value })
            }
          />
        </label>
      )}
      <p>
        Missing evidence calls for a fresh elicitation opportunity. Uncertain
        judgement calls for further review. Practice tasks remain pending.
      </p>
    </fieldset>
  );
}
function ComparisonEditor({
  phase,
  values,
  change,
}: {
  phase: Phase;
  values: Evidence[];
  change: (v: Evidence[]) => void;
}) {
  return (
    <fieldset className={styles.judgement}>
      <legend>Preserved initial comparison evidence</legend>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={values.length > 0}
          onChange={(e) =>
            change(
              e.target.checked
                ? [
                    {
                      phaseId: phase.id,
                      promptId: phase.prompts[0].id,
                      location: "",
                      excerpt: "",
                    },
                  ]
                : [],
            )
          }
        />
        Record a precise prior-reasoning reference
      </label>
      {values.map((value, i) => (
        <section key={i}>
          <label>
            Initial comparison prompt
            <select
              value={value.promptId}
              onChange={(e) =>
                change(
                  values.map((old, n) =>
                    n === i
                      ? { ...old, promptId: e.target.value, excerpt: "" }
                      : old,
                  ),
                )
              }
            >
              {phase.prompts.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.id} · {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Precise prior response location
            <input
              value={value.location}
              onChange={(e) =>
                change(
                  values.map((old, n) =>
                    n === i ? { ...old, location: e.target.value } : old,
                  ),
                )
              }
            />
          </label>
          <label>
            Exact prior response excerpt (optional)
            <textarea
              value={value.excerpt}
              onChange={(e) =>
                change(
                  values.map((old, n) =>
                    n === i ? { ...old, excerpt: e.target.value } : old,
                  ),
                )
              }
            />
          </label>
        </section>
      ))}
      <p>
        Compare updating with the preserved initial reasoning. A blank or
        unavailable prior record calls for an evidence limitation rather than
        invented prior reasoning. Relevant reasoning anywhere in the initial
        phase may contribute.
      </p>
    </fieldset>
  );
}
function ReviewForm({
  store,
  run,
  draft,
}: {
  store: ReviewerStore;
  run: Run;
  draft: ReviewDraft;
}) {
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const c = run.config.criteria.find((c) => c.id === draft.criterionId)!,
    a = run.config.cases.find((a) => a.id === draft.caseId)!,
    phase = a.phases.find((p) => p.id === c.primaryPhase)!;
  return (
    <form
      className={styles.responseForm}
      aria-label="Criterion review"
      onSubmit={(e) => {
        e.preventDefault();
        setConfirm(true);
      }}
    >
      <h2>
        {a.id} / {c.id} · {c.title}
      </h2>
      <p>
        {c.objectiveId} · Task {run.config.taskVersion} · Rubric{" "}
        {run.config.rubricVersion}
      </p>
      <p>{c.alignment}</p>
      <p>
        Compare with:{" "}
        {c.comparisonPrompts.join(", ") || "No additional comparison required"}
        {c.id === "B-R4" && " and the case’s supplied intervention"}. Judge each
        criterion directly.
      </p>
      <details className={styles.references} open>
        <summary>Captured rubric descriptors</summary>
        {levels.map((level) => (
          <p key={level}>
            <strong>{level}:</strong> {c.descriptors[level]}
          </p>
        ))}
        <p>{c.boundary}</p>
      </details>
      <label>
        Reviewer name or identifier
        <input
          value={draft.reviewer}
          onChange={(e) => store.edit({ ...draft, reviewer: e.target.value })}
        />
      </label>
      {c.comparisonPrompts.length > 0 && (
        <ComparisonEditor
          phase={a.phases[0]}
          values={draft.comparisonEvidence}
          change={(comparisonEvidence) =>
            store.edit({ ...draft, comparisonEvidence })
          }
        />
      )}
      <JudgementEditor
        title={
          phase.kind === "initial"
            ? "Initial primary judgement"
            : "Update primary judgement"
        }
        phase={phase}
        value={draft.primary}
        change={(primary) => store.edit({ ...draft, primary })}
      />
      {!!c.supplementaryPrompts.length && (
        <>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={!!draft.supplementary.length}
              onChange={(e) =>
                store.edit({
                  ...draft,
                  supplementary: e.target.checked
                    ? [
                        emptyJudgement(
                          a.phases[1].id,
                          c.supplementaryPrompts[0],
                        ),
                      ]
                    : [],
                })
              }
            />
            Record later supplementary evidence; keep initial judgement visible
          </label>
          {draft.supplementary.map((j, i) => (
            <JudgementEditor
              key={i}
              title="Later supplementary evidence"
              phase={a.phases[1]}
              value={j}
              change={(next) =>
                store.edit({
                  ...draft,
                  supplementary: draft.supplementary.map((old, n) =>
                    n === i ? next : old,
                  ),
                })
              }
            />
          ))}
        </>
      )}
      <button className={styles.primary} disabled={busy} type="submit">
        Save human review record
      </button>
      {confirm && (
        <Modal
          title="Save this human review?"
          busy={busy}
          cancel={() => setConfirm(false)}
          confirmLabel="Save review record"
          error={store.getSnapshot().error}
          confirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await store.save();
              setConfirm(false);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            The evidence and judgement will become a recorded human review.
            Later revisions receive a new record ID and preserve this judgement.
          </p>
        </Modal>
      )}
    </form>
  );
}
export function Reviewer() {
  const store = useMemo(() => new ReviewerStore(), []),
    view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [reference, setReference] = useState<{
      packageVersion: string;
      notice: string;
      illustrations: string[];
      calibration: string[];
      reviewerFocus: string[];
    } | null>(null),
    [referenceError, setReferenceError] = useState<string | null>(null),
    [pending, setPending] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void store.load();
    const listener = (e: StorageEvent) => {
      if (e.key === store.key || e.key === null)
        store.reportError(
          new Error(
            "Reviewer workspace changed in another tab. Download any unsaved draft, then reload the latest workspace.",
          ),
        );
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [store]);
  const loadReference = async () => {
    try {
      const result = await fetch(
        `${import.meta.env.BASE_URL}content/reviewer-reference.json`,
      );
      if (!result.ok) throw new Error("Reference file could not be loaded.");
      const data = await result.json();
      if (
        data.packageVersion !== view.run?.config.packageVersion ||
        JSON.stringify(data.sources) !==
          JSON.stringify(view.run?.config.sources)
      )
        throw new Error(
          "Reference package differs from this captured session. Use the original source links for version-appropriate review.",
        );
      setReference(data);
      setReferenceError(null);
    } catch (error) {
      setReferenceError(
        error instanceof Error ? error.message : "Unable to load reference.",
      );
    }
  };
  const choose = (caseId: string, criterionId: string) => {
    const c = view.run!.config.criteria.find((c) => c.id === criterionId)!;
    store.edit({
      caseId,
      criterionId,
      reviewer: view.draft?.reviewer || "",
      primary: emptyJudgement(c.primaryPhase, c.primaryPrompts[0]),
      comparisonEvidence: [],
      supplementary: [],
      supersedes: null,
    });
  };
  return (
    <section className={styles.workspace}>
      <p className={styles.eyebrow}>LOCAL HUMAN REVIEW</p>
      <h1 className={styles.debriefTitle}>Reviewer workspace</h1>
      <p>
        Import an explicitly completed or early-ended diagnostic session. Read
        its captured facts, prompts, submitted responses and rubric before
        recording criterion feedback. Export the review file for a facilitator
        to import in the participant's browser using Recovery and files.
      </p>
      <p>
        This static prototype has no authentication or secure concealment.
        Reviewers’ identifiers and imported files are local records. Independent
        raters can import the same session into separate browser profiles and
        export their original judgements before comparison.
      </p>
      <p role="status">
        {view.loading ? "Loading saved reviewer workspace…" : view.status}
      </p>
      {view.error && (
        <div role="alert" className={styles.errorBox}>
          <p>{view.error}</p>
          <button onClick={() => void store.load()}>
            Reload latest reviewer workspace
          </button>
        </div>
      )}
      <div className={styles.actions}>
        <Link className={styles.secondary} to="/learner">
          Return to learner workspace
        </Link>
        <button
          className={styles.secondary}
          onClick={() => {
            try {
              downloadJson(store.recoveryData(), "kalp-reviewer-recovery.json");
            } catch (error) {
              store.reportError(error);
            }
          }}
        >
          Download reviewer recovery and draft
        </button>
        {view.run && (
          <button
            className={styles.secondary}
            onClick={() =>
              downloadJson(
                store.workspaceData(),
                "kalp-reviewer-workspace.json",
              )
            }
          >
            Export reviewer workspace and draft
          </button>
        )}
      </div>
      <FileInput
        label="Import ended diagnostic session"
        onFile={async (raw) => {
          setPending(raw);
          return false;
        }}
      />
      <FileInput
        label="Restore reviewer workspace backup"
        onFile={(raw) => store.restoreWorkspace(raw)}
      />
      {view.run && view.bundle && (
        <>
          <p>
            Session {view.run.runId} · {view.run.config.packageVersion} ·{" "}
            {view.run.end?.kind === "early" ? "Ended early" : "Completed"} ·
            Actual order: {view.run.actualSequence.join(" → ") || "None"}
          </p>
          {view.run.supportNotes && (
            <p>Support conditions: {view.run.supportNotes}</p>
          )}
          <FileInput
            label="Import reviews for comparison or revision"
            onFile={(raw) => store.importReviews(raw)}
          />
          <button
            className={styles.primary}
            onClick={() =>
              downloadJson(view.bundle, `kalp-reviews-${view.run!.runId}.json`)
            }
          >
            Export saved human reviews
          </button>
          <details className={styles.references}>
            <summary>Captured judgement rules and source references</summary>
            {view.run.config.rubricRules.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
            <p>{view.run.config.feedbackRule}</p>
            <ul>
              {view.run.config.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          {view.run.config.cases.map((a) => (
            <details key={a.id} className={styles.responseTrail}>
              <summary>
                {a.id} · {a.title}: responses and criteria
              </summary>
              <div className={styles.trailBody}>
                {a.phases.map((p) => (
                  <section key={p.id}>
                    <CaseFacts phase={p} />
                    <p>{p.task}</p>
                    {view.run!.sessions[a.id].submitted[p.id] ? (
                      <SubmittedResponsePanel
                        phase={p}
                        snapshot={view.run!.sessions[a.id].submitted[p.id]}
                        expanded
                      />
                    ) : (
                      <p>
                        Not submitted. Opportunity:{" "}
                        {view.run!.sessions[a.id].revealedAt[p.id]
                          ? "Revealed but unsubmitted"
                          : "Not elicited; phase was not revealed"}
                        . Unsubmitted drafts are retained for recovery and
                        cannot support a performance level.
                      </p>
                    )}
                  </section>
                ))}
                <div className={styles.actions}>
                  {criteriaFor(view.run!, a.id).map((c) => (
                    <button
                      className={styles.secondary}
                      key={c.id}
                      onClick={() => choose(a.id, c.id)}
                    >
                      Review {a.id} / {c.id}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          ))}
          {view.draft && (
            <ReviewForm
              key={`${view.draft.caseId}:${view.draft.criterionId}:${view.draft.supersedes}`}
              store={store}
              run={view.run}
              draft={view.draft}
            />
          )}
          <h2>Saved review records</h2>
          {!view.bundle.records.length && (
            <p>Awaiting review. No judgements recorded.</p>
          )}
          {view.bundle.records.map((r) => (
            <section key={r.id}>
              <ReviewFeedback record={r} config={view.run!.config} />
              <button
                className={styles.secondary}
                onClick={() =>
                  store.edit({
                    caseId: r.caseId,
                    criterionId: r.criterionId,
                    reviewer: r.reviewer,
                    primary: structuredClone(r.primary),
                    comparisonEvidence: structuredClone(r.comparisonEvidence),
                    supplementary: structuredClone(r.supplementary),
                    supersedes: r.id,
                  })
                }
              >
                Record a revision of {r.caseId} / {r.criterionId}
              </button>
            </section>
          ))}
          <details
            className={styles.references}
            onToggle={(e) => {
              if (e.currentTarget.open && !reference) void loadReference();
            }}
          >
            <summary>Authored illustrations and calibration reference</summary>
            {referenceError && <p role="alert">{referenceError}</p>}
            {reference ? (
              <>
                <p>{reference.notice}</p>
                {reference.illustrations.map((s, i) => (
                  <p key={i}>{s}</p>
                ))}
                <h3>Independent-rater calibration</h3>
                {reference.calibration.map((s, i) => (
                  <p key={i}>{s}</p>
                ))}
              </>
            ) : (
              <p>
                Reference material is loaded on request. Authored fragments are
                illustrations, not empirical anchors or personalised feedback.
              </p>
            )}
          </details>
        </>
      )}
      {pending && (
        <Modal
          title="Import this session for review?"
          cancel={() => setPending(null)}
          busy={busy}
          confirmLabel="Preserve workspace and import"
          error={view.error}
          confirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await store.importSession(pending);
              setReference(null);
              setPending(null);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Only completed or explicitly ended sessions can be reviewed. The
            previous saved reviewer workspace is archived before replacement.
            Export an unsaved draft first if saving has failed.
          </p>
        </Modal>
      )}
    </section>
  );
}
