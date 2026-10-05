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
        {run.config.packageVersion} ·{" "}
        {run.end.kind === "early" ? "ENDED EARLY" : "FOUR CASES SUBMITTED"}
      </p>
      <h1 className={styles.debriefTitle}>Submissions and human review</h1>
      <p>
        Submitted responses are preserved. Criterion feedback appears only from
        actual imported human-review records. Practice is optional and pending.
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
      {!reviews?.records.length && (
        <p role="status" className={styles.pauseNote}>
          Awaiting review. No criterion performance levels have been assigned.
        </p>
      )}
      {run.config.cases.map((a) => (
        <section key={a.id} data-format={a.set}>
          <h2>
            {a.id} · {a.title}
          </h2>
          <div className={styles.profileList}>
            {criteriaFor(run, a.id).map((c) => {
              const records =
                reviews?.records.filter(
                  (r) => r.caseId === a.id && r.criterionId === c.id,
                ) || [];
              return (
                <section key={c.id} className={styles.profile}>
                  <h3>
                    {c.id} · {c.title}
                  </h3>
                  {records.length ? (
                    <>
                      {records
                        .filter(
                          (r) =>
                            !records.some((later) => later.supersedes === r.id),
                        )
                        .map((r) => (
                          <ReviewFeedback key={r.id} record={r} />
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
                              <ReviewFeedback key={r.id} record={r} />
                            ))}
                        </details>
                      )}
                    </>
                  ) : (
                    <>
                      <p>Awaiting review</p>
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
        </section>
      ))}
      <p className={styles.note}>
        This prototype supports design review. Subject-matter review,
        representative-officer responses, example review and rater calibration
        remain pending before operational interpretation. Programme-learning
        claims require actual teaching exposure and further evidence.
      </p>
    </div>
  );
}
