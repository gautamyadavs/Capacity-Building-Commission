import type { Judgement, ReviewRecord } from "../model";
import styles from "../app.module.css";
function JudgementView({
  judgement,
  title,
}: {
  judgement: Judgement;
  title: string;
}) {
  return (
    <section>
      <h4>{title}</h4>
      <p>
        <strong>{judgement.judgement || "No defensible level selected"}</strong>{" "}
        · Review status: {judgement.reviewStatus}
      </p>
      {judgement.evidence.map((e, i) => (
        <p key={i}>
          <strong>
            {e.phaseId} / {e.promptId} · {e.location}
          </strong>
          {e.excerpt && (
            <>
              {" "}
              — <q>{e.excerpt}</q>
            </>
          )}
        </p>
      ))}
      <p>
        <strong>Rationale:</strong> {judgement.rationale}
      </p>
      <p>
        <strong>
          Supported strength, unresolved link or evidence limitation:
        </strong>{" "}
        {judgement.strengthOrGap}
      </p>
      {judgement.nextOpportunity && (
        <p>
          <strong>Next opportunity or further review:</strong>{" "}
          {judgement.nextOpportunity}
        </p>
      )}
      {judgement.reviewStatus === "Uncertain" && (
        <p>
          <strong>Competing interpretations:</strong>{" "}
          {judgement.competingInterpretations}
        </p>
      )}
    </section>
  );
}
export function ReviewFeedback({ record }: { record: ReviewRecord }) {
  return (
    <article className={styles.feedbackResult} data-review-id={record.id}>
      <h3>
        {record.caseId} / {record.criterionId} · Review by {record.reviewer}
      </h3>
      <p>
        {record.packageVersion} · Task {record.taskVersion} · Rubric{" "}
        {record.rubricVersion} · {new Date(record.reviewedAt).toLocaleString()}
      </p>
      {record.comparisonEvidence.length > 0 && (
        <section>
          <h4>Preserved initial comparison evidence</h4>
          {record.comparisonEvidence.map((e, i) => (
            <p key={i}>
              <strong>
                {e.phaseId} / {e.promptId} · {e.location}
              </strong>
              {e.excerpt && (
                <>
                  {" "}
                  — <q>{e.excerpt}</q>
                </>
              )}
            </p>
          ))}
        </section>
      )}
      <JudgementView
        judgement={record.primary}
        title={
          record.primary.evidence[0].phaseId.endsWith(".I")
            ? "Initial primary judgement"
            : "Update primary judgement (compared with preserved prior reasoning)"
        }
      />
      {record.supplementary.map((j, i) => (
        <JudgementView
          key={i}
          judgement={j}
          title="Later supplementary evidence — initial judgement retained"
        />
      ))}
      {record.supersedes && (
        <p>
          This revision identifies prior review {record.supersedes}. The
          original remains in the review history.
        </p>
      )}
    </article>
  );
}
