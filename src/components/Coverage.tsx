import { useState } from "react";
import coverage from "../../public/content/coverage.json";
import { useApp } from "../context";
import { AppLink } from "./Shared";
import { downloadJson } from "../persistence";
import styles from "../app.module.css";

export function Coverage() {
  const { config } = useApp();
  const [domain, setDomain] = useState("All domains");
  const domains = ["Programme learning", "Self Leadership", "Strategic Leadership", "Ethical & Civilisational Leadership", "Collaborative Leadership", "Systems Leadership", "Transformational Leadership"];
  const rows = coverage.rows.filter(row => domain === "All domains" || row.domains.includes(domain));
  const excluded = coverage.excludedMetrics.filter(row => domain === "All domains" || row.domain === domain);
  const aligned = coverage.packageVersion === config.packageVersion && coverage.taskVersion === config.taskVersion && coverage.rubricVersion === config.rubricVersion;

  return <section className={styles.workspace}>
    <p className={styles.eyebrow}>CBC REVIEW REFERENCE · CURRENT DESIGN</p>
    <h1>Teaching and assessment coverage</h1>
    <p>{coverage.notice}</p>
    <p><strong>{coverage.teachingStatus}.</strong> The four cases offer evidence for eight objectives, sampling aspects of ten of the framework's 28 metrics. Twenty criterion observations are possible; completion does not guarantee usable evidence.</p>
    <div className={styles.actions}>
      <a className={styles.secondary} href={coverage.masterUrl}>Compact CBC document</a>
      <AppLink className={styles.secondary} to="/reviewer">Reviewer workspace</AppLink>
      <AppLink className={styles.secondary} to="/learner/files">Facilitator files</AppLink>
      <button className={styles.secondary} disabled={!aligned} onClick={() => downloadJson({ ...coverage, objectives: config.objectives, criteria: config.criteria }, "kalp-coverage-crosswalk.json")}>Download coverage crosswalk</button>
    </div>
    <p>{coverage.packageVersion} · {config.frameworkVersion} · Task {config.taskVersion} · Rubric {config.rubricVersion}. This view describes the current release; reviews of earlier sessions use their captured design.</p>
    {!aligned && <p role="alert">The coverage reference and assessment content differ. Use the source documents until the release is reconciled.</p>}
    <h2>Demonstrate the evidence chain</h2>
    <p>{coverage.demonstration}</p>
    <label className={styles.coverageFilter}>Framework domain
      <select value={domain} onChange={event => setDomain(event.target.value)}>
        <option>All domains</option>
        {domains.map(name => <option key={name}>{name}</option>)}
      </select>
    </label>
    <p role="status">{rows.length} objectives in this view; {excluded.length} framework metrics outside the scored diagnostic.</p>
    {aligned && rows.map(row => {
      const objective = config.objectives.find(o => o.id === row.objectiveId)!;
      const criteria = config.criteria.filter(c => c.objectiveId === row.objectiveId);
      return <article key={row.objectiveId} className={styles.coverageCard}>
        <h2>{row.objectiveId} · {objective.title}</h2>
        <p>{objective.text}</p>
        <p><strong>Framework:</strong> {objective.metrics}</p>
        <p><strong>Teaching link:</strong> {row.fit}. {row.teachingLimit}</p>
        <details className={styles.references}>
          <summary>Declared teaching evidence and source locators</summary>
          <ul>{row.lessons.map((lesson, index) => <li key={index}>
            <a href={lesson.sourceUrl}>{lesson.course} · {lesson.locator}</a>
            <p>Stated outcome: {lesson.excerpt}</p>
          </li>)}</ul>
        </details>
        <details className={styles.references}>
          <summary>Exact questions and criterion descriptors</summary>
          {criteria.map(criterion => <section key={criterion.id}>
            <h3>{criterion.id} · {criterion.title}</h3>
            <p>Primary: {criterion.primaryPhase} / {criterion.primaryPrompts.join(", ")}. Supplementary: {criterion.supplementaryPrompts.join(", ") || "none"}. Preserved comparison: {criterion.comparisonPrompts.join(", ") || "none"}.</p>
            {config.cases.filter(c => c.set === row.objectiveId[0]).map(c => <div key={c.id}>
              <h4>{c.id} · {c.title}</h4>
              {c.phases.flatMap(phase => phase.prompts.filter(prompt => [...criterion.primaryPrompts, ...criterion.supplementaryPrompts, ...criterion.comparisonPrompts].includes(prompt.id)).map(prompt => <p key={prompt.id}><strong>{prompt.id} · {criterion.primaryPrompts.includes(prompt.id) ? "primary" : criterion.supplementaryPrompts.includes(prompt.id) ? "supplementary" : "preserved comparison"}:</strong> {prompt.text}</p>))}
              <AppLink to={`/learner/assessment/${c.id}`}>Open diagnostic case</AppLink>
            </div>)}
            <dl>{Object.entries(criterion.descriptors).map(([level, descriptor]) => <div key={level}><dt><strong>{level}</strong></dt><dd>{descriptor}</dd></div>)}</dl>
            <p><strong>Judgement boundary:</strong> {criterion.boundary}</p>
          </section>)}
          <p>Use relevant evidence elsewhere in the same phase with its location recorded. Initial judgement remains distinct from later supplementary evidence. These are opportunities to elicit reasoning, not verified participant outcomes.</p>
        </details>
      </article>;
    })}
    <h2>Framework metrics outside this diagnostic</h2>
    <p>These metrics have no separate diagnostic rating. Perspective Taking can support reasoning but is not scored separately. Workplace, collaborative, specialist and longitudinal claims require other evidence.</p>
    <ul>{excluded.map(row => <li key={row.metric}>{row.metric} · {row.domain}</li>)}</ul>
    <p>{coverage.courseScope}</p>
    <h2>Confirm teaching before programme-learning claims</h2>
    <p>{coverage.teachingEvidenceNeeded}</p>
    <p>{coverage.transcriptLimit}</p>
    <details className={styles.references}>
      <summary>Teaching sources reviewed</summary>
      <ul>{coverage.reviewedTeachingSources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul>
    </details>
    <p>{coverage.science}</p>
  </section>;
}
