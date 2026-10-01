import { useSession } from '../context';
import { assessmentAvailable, assessmentComplete, batteryComplete, currentStage, resumePath } from '../model';
import { AppLink } from './Shared';
import styles from '../app.module.css';

export function Home() {
  const { config, run } = useSession();
  const completed = config.assessments.filter(a => assessmentComplete(a, run.sessions[a.id])).length;
  const started = config.assessments.some(a => !!run.sessions[a.id].startedAt);
  const done = batteryComplete(config, run);
  return <>
    <section className={styles.hero}>
      <div><p className={styles.eyebrow}>BHARAT KALP · LEADERSHIP ASSESSMENT</p><h1>Reason through complex governance decisions.</h1>
        <p className={styles.heroDescription}>You will work through four simulated governance cases. In each case, you will make your reasoning visible, respond to new evidence, and decide whether and how your approach should change.</p>
        <div className={styles.actions}><AppLink to={resumePath(config, run)} className={styles.primary}>{done ? 'Review assessment' : started ? 'Continue assessment' : 'Start assessment'} →</AppLink></div>
      </div>
      <aside className={styles.heroNote} aria-label="About the assessment"><ul className={styles.supportingPoints}>
        <li>4 governance cases</li><li>Approximately 30–35 minutes per case</li><li>Progress is saved on this browser</li><li>You may take a break after Case 2</li><li>Bullets are welcome</li><li>Writing style is not assessed</li>
      </ul><div className={styles.heroStats}><div><strong>{completed} / 4</strong><span>Cases completed</span></div></div></aside>
    </section>
    <div className={styles.sectionHeader}><h2>Your four cases</h2><span>Work through each case in order, at your own pace.</span></div>
    <div className={styles.batteryCases}>{config.assessments.map((a, index) => {
      const session = run.sessions[a.id]; const complete = assessmentComplete(a, session); const current = currentStage(a, session);
      const available = assessmentAvailable(config, run, a.id);
      return <article data-format={a.format} key={a.id} className={styles.caseCard}>
        <div className={styles.caseIndex}>{index + 1}</div><div className={styles.caseMain}>
          <div className={styles.caseMeta}><span>{a.suggestedTime} suggested</span><span>{complete ? 'Complete · responses locked' : current ? 'In progress' : available ? 'Ready to start' : 'Not yet available'}</span></div>
          <h3>{a.title}</h3><p>{Object.keys(session.submitted).length} of {a.stages.length} stages submitted</p>
          {available ? <AppLink to={complete ? `/learner/assessment/${a.id}/complete` : current ? `/learner/assessment/${a.id}/stage/${current.id}` : `/learner/assessment/${a.id}`} className={styles.cardLink}>{complete ? 'View saved responses' : current ? 'Resume case' : 'Start case'} →</AppLink> : <p className={styles.help}>Complete the preceding cases to continue.</p>}
        </div>
      </article>;
    })}</div>
    <section className={styles.howItWorks}><div><span>01 / RESPOND</span><h3>Make your reasoning visible</h3><p>Use the supplied case facts. Word limits are maximums, not targets.</p></div><div><span>02 / CONTINUE</span><h3>Respond to new evidence</h3><p>Your response locks before new information appears. Earlier submissions stay available to read.</p></div><div><span>03 / REVIEW</span><h3>Look back across all four cases</h3><p>Your complete reasoning trail and evidence-check feedback become available when all four cases are complete.</p></div></section>
  </>;
}
