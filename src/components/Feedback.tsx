import { useSession } from '../context';
import { feedbackAvailable, type Assessment } from '../model';
import styles from '../app.module.css';

export function SelectedResponseFeedback({ assessment }: { assessment: Assessment }) {
  const { config, run } = useSession();
  const checks = assessment.stages.flatMap(stage => stage.selectedResponses
    .filter(question => feedbackAvailable(config, run, assessment, question))
    .map(question => ({ stage, question })));
  if (!checks.length) return null;
  return <section aria-label="Evidence-check feedback"><h2>Evidence-check feedback</h2>
    {checks.map(({ stage, question: q }) => {
      const answer = run.sessions[assessment.id].submitted[stage.id].answers[q.id];
      const option = q.options.find(o => o.id === answer)!;
      const best = q.options.find(o => o.id === q.correctOptionId)!;
      return <article key={q.id} className={styles.feedbackResult} data-feedback-id={q.id}>
        <p className={styles.sectionEyebrow}>{assessment.title} · {q.label}</p><h3>{q.prompt}</h3>
        <p><strong>Your choice:</strong> {option.id}. {option.label}</p>
        <p><strong>Best-supported answer:</strong> {best.id}. {best.label}</p>
        <p>{q.feedbackByOption[answer]}</p>
      </article>;
    })}
  </section>;
}
