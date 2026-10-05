import type { Config, Evidence, Judgement, ReviewRecord } from "../model";
import { criterionLabel, learnerReviewText } from "../presentation";
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
export function ReviewFeedback({
  record,
  config,
}: {
  record: ReviewRecord;
  config: Config;
}) {
  const criterion = config.criteria.find((c) => c.id === record.criterionId)!;
  return (
    <article className={styles.feedbackResult} data-review-id={record.id}>
      <h3>
        {record.caseId} · {criterion.title}
      </h3>
      <p>
        <strong>What this criterion considers:</strong>{" "}
        {criterion.descriptors.Proficient}
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
      <details className={styles.references}>
        <summary>Reviewer, version and criterion details</summary>
        <p>
          Review by {record.reviewer} ·{" "}
          {new Date(record.reviewedAt).toLocaleString()}
        </p>
        <p>
          {record.caseId} / {record.criterionId} · {record.packageVersion} ·
          Task {record.taskVersion} · Rubric {record.rubricVersion}
        </p>
        <p>{criterion.boundary}</p>
        {Object.entries(criterion.descriptors).map(([level, text]) => (
          <p key={level}>
            <strong>{level}:</strong> {text}
          </p>
        ))}
      </details>
      {record.supersedes && (
        <p>
          This revision identifies prior review {record.supersedes}. The
          original remains in the review history.
        </p>
      )}
    </article>
  );
}

function LearnerEvidence({
  evidence,
  record,
  config,
}: {
  evidence: Evidence[];
  record: ReviewRecord;
  config: Config;
}) {
  const a = config.cases.find((a) => a.id === record.caseId)!;
  return (
    <>
      {evidence.map((e, i) => {
        const p = a.phases.find((p) => p.id === e.phaseId)!;
        const f = p.prompts.find((f) => f.id === e.promptId)!;
        return (
          <div key={i} className={styles.answer}>
            <p>
              <strong>
                {p.title} · {f.label}
              </strong>
            </p>
            {e.excerpt ? (
              <blockquote>{e.excerpt}</blockquote>
            ) : (
              <p>Response location: {learnerReviewText(e.location, config)}</p>
            )}
          </div>
        );
      })}
    </>
  );
}

function LearnerJudgement({
  judgement,
  title,
  record,
  config,
}: {
  judgement: Judgement;
  title: string;
  record: ReviewRecord;
  config: Config;
}) {
  return (
    <section>
      <h4>{title}</h4>
      {judgement.judgement && (
        <p>
          <strong>{judgement.judgement}</strong>
        </p>
      )}
      {judgement.reviewStatus === "Uncertain" && (
        <p>
          This feedback needs a further review.{" "}
          {learnerReviewText(judgement.competingInterpretations, config)}
        </p>
      )}
      {judgement.judgement === "Insufficient evidence" && (
        <p>
          Your responses do not yet give enough evidence for this judgement.
        </p>
      )}
      {judgement.judgement === "Not elicited" && (
        <p>
          The task or circumstances did not give you an opportunity to show this
          reasoning.
        </p>
      )}
      <LearnerEvidence
        evidence={judgement.evidence}
        record={record}
        config={config}
      />
      <p>{learnerReviewText(judgement.rationale, config)}</p>
      <p>{learnerReviewText(judgement.strengthOrGap, config)}</p>
      {judgement.nextOpportunity && (
        <p>
          <strong>Next step:</strong>{" "}
          {learnerReviewText(judgement.nextOpportunity, config)}
        </p>
      )}
    </section>
  );
}

export function LearnerFeedback({
  record,
  config,
  reviewNumber,
}: {
  record: ReviewRecord;
  config: Config;
  reviewNumber?: number;
}) {
  return (
    <article className={styles.feedbackResult} data-review-id={record.id}>
      <h3>{criterionLabel(config, record.criterionId)}</h3>
      {reviewNumber && <p>Reviewer {reviewNumber}</p>}
      {record.comparisonEvidence.length > 0 && (
        <section>
          <h4>Your earlier reasoning</h4>
          <LearnerEvidence
            evidence={record.comparisonEvidence}
            record={record}
            config={config}
          />
        </section>
      )}
      <LearnerJudgement
        judgement={record.primary}
        title={
          record.primary.evidence[0].phaseId.endsWith(".I")
            ? "Initial response"
            : "After new information"
        }
        record={record}
        config={config}
      />
      {record.supplementary.map((j, i) => (
        <LearnerJudgement
          key={i}
          judgement={j}
          title="After new information — your initial feedback is retained"
          record={record}
          config={config}
        />
      ))}
    </article>
  );
}
