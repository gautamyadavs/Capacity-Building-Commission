import { useSession } from '../context';
import { assessmentAvailable, assessmentComplete, batteryComplete, currentStage, resumePath } from '../model';
import { AppLink, Paragraphs } from './Shared';
import styles from '../app.module.css';

export function Home() {
  const { config, run } = useSession();
  const completed = config.assessments.filter(a => assessmentComplete(a, run.sessions[a.id])).length;
  const started = config.assessments.some(a => !!run.sessions[a.id].startedAt);
  const done = batteryComplete(config, run);
  return <div className={styles.workspace}>
    <section className={styles.workspaceIntro} aria-label="About the assessment">
      <p className={styles.eyebrow}>BHARAT KALP · LEARNING ASSESSMENT</p><h1>Practise governance decisions</h1>
      <p>Make a defensible decision, examine what new information changes, and improve your reasoning through guided self-review. Different actions can be defensible when their reasons and trade-offs support them.</p>
      <div className={styles.workspaceActions}><AppLink to={resumePath(config, run)} className={styles.primary}>{done ? 'Review assessment' : started ? 'Continue assessment' : 'Start assessment'} →</AppLink><span>{completed} / {config.assessments.length} episodes complete</span></div>
      <p className={styles.pauseNote}>You can pause at any stage and resume your saved draft on this browser. Each episode ends with a review and a separate amendment.</p>
    </section>
    <div className={styles.sectionHeader}><h2>Your learning episodes</h2></div>
    <p className={styles.sequenceNote}>Work through these episodes in order. Review your reasoning in the first, then bring one lesson into the next. Each episode can be a separate session.</p>
    <div className={styles.batteryCases}>{config.assessments.map((a, index) => {
      const session = run.sessions[a.id]; const complete = assessmentComplete(a, session); const current = currentStage(a, session);
      const available = assessmentAvailable(config, run, a.id);
      return <article data-format={a.format} key={a.id} className={styles.caseCard}>
        <div className={styles.caseIndex}>{index + 1}</div><div className={styles.caseMain}>
          <div className={styles.caseMeta}><span>{a.suggestedTime} · provisional</span><span>{complete ? 'Complete · responses locked' : current ? 'In progress' : available ? 'Ready to start' : 'Not yet available'}</span></div>
          <h3>{a.title}</h3><p>{Object.keys(session.submitted).length} of {a.stages.length} stages submitted</p>
          {available ? <AppLink to={complete ? `/learner/assessment/${a.id}/complete` : current ? `/learner/assessment/${a.id}/stage/${current.id}` : `/learner/assessment/${a.id}`} className={styles.cardLink}>{complete ? 'View saved responses' : current ? 'Resume case' : 'Start case'} →</AppLink> : <p className={styles.help}>Complete the preceding episode and review to continue.</p>}
        </div>
      </article>;
    })}</div>
    <section className={styles.writingGuidance} aria-label="Response guidance"><h2>Response guidance</h2><Paragraphs lines={config.guidance}/></section>
  </div>;
}
