import { useEffect, useState } from "react";
import { useSession } from "../context";
import { resumePath } from "../model";
import { AppLink, SubmittedResponsePanel } from "./Shared";
import { LearnerFeedback } from "./Feedback";
import { criterionLabel } from "../presentation";
import { PreviousAttempts, RetryButton } from "./Trial";
import styles from "../app.module.css";
export function Debrief() {
  const { run, reviews } = useSession();
  const records = (reviews?.records || []).filter(
    (r) => !reviews!.records.some((later) => later.supersedes === r.id),
  );
  const firstReviewedCase = run.config.cases.find((a) =>
    records.some((r) => r.caseId === a.id),
  )?.id;
  const [openCase, setOpenCase] = useState<string | null>(null);
  // Open asynchronously loaded feedback once; preserve the learner's choices.
  useEffect(() => {
    if (firstReviewedCase) setOpenCase(firstReviewedCase);
  }, [run.runId, firstReviewedCase]);
  if (!run.end)
    return (
      <section className={styles.gate}>
        <h1>The diagnostic is still in progress</h1>
        <p>
          Complete the cases or end the session early to receive feedback after
          review.
        </p>
        <AppLink className={styles.primary} to={resumePath(run)}>
          Continue diagnostic →
        </AppLink>
      </section>
    );
  return (
    <div className={styles.workspace}>
      <AppLink className={styles.back} to="/learner">
        ← All cases
      </AppLink>
      <h1 className={styles.debriefTitle}>Submissions and feedback</h1>
      <p>
        {run.end.kind === "early"
          ? "You ended this session early. Your submitted responses have been saved."
          : "All four cases are submitted. Your responses have been saved."}
      </p>
      <p>No overall score or pass/fail result is assigned.</p>
      <div className={styles.actions}>
        <RetryButton ids={run.config.cases.map((a) => a.id)} label="Retry all cases" />
      </div>
      {!records.length && (
        <p role="status" className={styles.pauseNote}>
          Awaiting review. Feedback will appear after a reviewer has read your
          responses.
        </p>
      )}
      {run.config.cases
        .filter(
          (a) =>
            Object.keys(run.sessions[a.id].submitted).length ||
            records.some((r) => r.caseId === a.id),
        )
        .map((a) => {
          const caseRecords = records.filter((r) => r.caseId === a.id);
          const groups = run.config.criteria.filter((c) =>
            caseRecords.some((r) => r.criterionId === c.id),
          );
          return (
            <details
              key={a.id}
              data-format={a.set}
              className={styles.caseRecord}
              open={openCase === a.id}
            >
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setOpenCase(openCase === a.id ? null : a.id);
                }}
              >
                <h2>
                  {a.title}
                  <span>
                    {caseRecords.length
                      ? "Feedback available"
                      : "Submitted responses"}
                  </span>
                </h2>
              </summary>
              {groups.map((c) => {
                const ratings = caseRecords.filter(
                  (r) => r.criterionId === c.id,
                );
                const disagree =
                  new Set(
                    ratings.map((r) =>
                      JSON.stringify([
                        r.primary.judgement,
                        r.primary.reviewStatus,
                        r.supplementary.map((j) => [
                          j.judgement,
                          j.reviewStatus,
                        ]),
                      ]),
                    ),
                  ).size > 1;
                return (
                  <section
                    key={c.id}
                    aria-label={criterionLabel(run.config, c.id)}
                  >
                    {ratings.length > 1 && (
                      <p>
                        {disagree
                          ? "Reviewers reached different judgements. Both views are shown; a further review is needed."
                          : "More than one reviewer has provided feedback. Each view is shown separately."}
                      </p>
                    )}
                    {ratings.map((r, i) => (
                      <LearnerFeedback
                        key={r.id}
                        record={r}
                        config={run.config}
                        reviewNumber={ratings.length > 1 ? i + 1 : undefined}
                      />
                    ))}
                  </section>
                );
              })}
              <details className={styles.responseTrail}>
                <summary>Your submitted responses</summary>
                <div className={styles.trailBody}>
                  {a.phases
                    .filter((p) => run.sessions[a.id].submitted[p.id])
                    .map((p) => (
                      <SubmittedResponsePanel
                        key={p.id}
                        phase={p}
                        snapshot={run.sessions[a.id].submitted[p.id]}
                        expanded
                      />
                    ))}
                </div>
              </details>
              <RetryButton ids={[a.id]} openCase={a.id} label="Retry case" />
            </details>
          );
        })}
      <PreviousAttempts />
    </div>
  );
}
