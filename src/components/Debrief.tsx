import { useSession } from "../context";
import { criteriaFor, evidenceAvailability, resumePath } from "../model";
import { AppLink, CaseFacts, SubmittedResponsePanel } from "./Shared";
import { ReviewFeedback } from "./Feedback";
import { FileInput } from "./Files";
import { downloadJson } from "../persistence";
import styles from "../app.module.css";
export function Debrief() {
  const { run, reviews, store } = useSession();
  if (!run.end)
    return (
      <section className={styles.gate}>
        <h1>The diagnostic is still in progress</h1>
        <p>
          Complete all four cases or explicitly end early to release submissions
          for human review.
        </p>
        <AppLink className={styles.primary} to={resumePath(run)}>
          Continue diagnostic →
        </AppLink>
      </section>
    );
  return (
    <div className={styles.workspace}>
      <AppLink className={styles.back} to="/learner">
        ← Diagnostic home
      </AppLink>
      <p className={styles.eyebrow}>
        {run.end.kind === "early" ? "ENDED EARLY" : "FOUR CASES SUBMITTED"}
      </p>
      <h1 className={styles.debriefTitle}>Submissions and feedback</h1>
      <p>
        Your submitted responses are read-only. Feedback appears after a human
        reviewer reviews your evidence.
      </p>
      <p>
        Actual case sequence:{" "}
        {run.actualSequence.join(" → ") || "No case started"}.{" "}
        {run.end.kind === "early" && `Reason: ${run.end.reason}`}
      </p>
      {run.supportNotes && (
        <p>Recorded support conditions: {run.supportNotes}</p>
      )}
      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={() =>
            downloadJson(
              store.exportSession(),
              `kalp-session-${run.runId}.json`,
            )
          }
        >
          Export session for review
        </button>
        {reviews && (
          <button
            className={styles.secondary}
            onClick={() =>
              downloadJson(reviews, `kalp-reviews-${run.runId}.json`)
            }
          >
            Export review records
          </button>
        )}
      </div>
      <FileInput
        label="Import human-review feedback"
        onFile={(raw) => store.importReviews(raw)}
      />
      <p role="status" className={styles.pauseNote}>
        {!reviews?.records.length
          ? "Awaiting review. No criterion performance levels have been assigned."
          : `${new Set(reviews.records.map((r) => `${r.caseId}/${r.criterionId}`)).size} of 20 case criteria have human-review records. Uncertain judgements and evidence limitations are identified in the records.`}
      </p>
      {run.config.cases.map((a) => (
        <details
          key={a.id}
          data-format={a.set}
          className={styles.caseRecord}
          open={reviews?.records.some((r) => r.caseId === a.id) || undefined}
        >
          <summary>
            <h2>
              {a.id} · {a.title}
              <span>
                {Object.keys(run.sessions[a.id].submitted).length} of 2
                responses submitted ·{" "}
                {
                  new Set(
                    reviews?.records
                      .filter((r) => r.caseId === a.id)
                      .map((r) => r.criterionId),
                  ).size
                }{" "}
                of {criteriaFor(run, a.id).length} criteria with review records
              </span>
            </h2>
          </summary>
          <div className={styles.profileList}>
            {criteriaFor(run, a.id).map((c) => {
              const records =
                reviews?.records.filter(
                  (r) => r.caseId === a.id && r.criterionId === c.id,
                ) || [];
              return (
                <section key={c.id} className={styles.profile}>
                  {!records.length && (
                    <h3>
                      {c.id} · {c.title}
                    </h3>
                  )}
                  {records.length ? (
                    <>
                      {records
                        .filter(
                          (r) =>
                            !records.some((later) => later.supersedes === r.id),
                        )
                        .map((r) => (
                          <ReviewFeedback
                            key={r.id}
                            record={r}
                            config={run.config}
                          />
                        ))}
                      {records.some((r) =>
                        records.some((later) => later.supersedes === r.id),
                      ) && (
                        <details>
                          <summary>Preserved earlier review judgements</summary>
                          {records
                            .filter((r) =>
                              records.some(
                                (later) => later.supersedes === r.id,
                              ),
                            )
                            .map((r) => (
                              <ReviewFeedback
                                key={r.id}
                                record={r}
                                config={run.config}
                              />
                            ))}
                        </details>
                      )}
                    </>
                  ) : (
                    <>
                      <p>No human-review record yet.</p>
                      {evidenceAvailability(run, a.id, c) !==
                        "Awaiting review" && (
                        <p>
                          Evidence availability:{" "}
                          {evidenceAvailability(run, a.id, c)} ·{" "}
                          {evidenceAvailability(run, a.id, c) === "Not elicited"
                            ? "A required phase or prior comparison opportunity is unavailable."
                            : "No submitted reasoning is available in the primary phase."}{" "}
                          A human reviewer checks the limitation and other
                          relevant same-phase evidence.
                        </p>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
          <details className={styles.responseTrail}>
            <summary>
              Facts, submitted responses and incomplete opportunities
            </summary>
            <div className={styles.trailBody}>
              {a.phases.map((p) => (
                <section key={p.id}>
                  {run.sessions[a.id].revealedAt[p.id] ? (
                    <CaseFacts phase={p} />
                  ) : (
                    <p>{p.title}: not revealed during this diagnostic.</p>
                  )}
                  {run.sessions[a.id].submitted[p.id] ? (
                    <SubmittedResponsePanel
                      phase={p}
                      snapshot={run.sessions[a.id].submitted[p.id]}
                      expanded
                    />
                  ) : (
                    <p>
                      {p.title}: unsubmitted. Drafts remain in the session
                      export and are not judged as submitted evidence.
                    </p>
                  )}
                </section>
              ))}
              {run.end?.incomplete
                .filter((m) => m.caseId === a.id)
                .map((m) => (
                  <p key={m.promptId}>
                    {m.phaseId} / {m.promptId}: {m.opportunity}
                  </p>
                ))}
            </div>
          </details>
        </details>
      ))}
      <details className={styles.references}>
        <summary>Design status and captured version</summary>
        <p>
          {run.config.packageVersion} · Task {run.config.taskVersion} · Rubric{" "}
          {run.config.rubricVersion}. Practice is optional and pending.
        </p>
        <p>
          This prototype supports design review. Subject-matter review,
          representative-officer responses, example review and rater calibration
          remain pending before operational interpretation. Programme-learning
          claims require actual teaching exposure and further evidence.
        </p>
      </details>
    </div>
  );
}
