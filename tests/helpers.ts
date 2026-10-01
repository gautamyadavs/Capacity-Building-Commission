import { readFileSync } from 'node:fs';
import { ConfigSchema, createRun, emptyDraft, fieldsFor, submitStage, type Assessment, type Run, type Stage } from '../src/model';
export const config = ConfigSchema.parse(JSON.parse(readFileSync('public/content/assessments.json', 'utf8')));
export function validDraft(a: Assessment, stage: Stage) {
  const draft = emptyDraft(a, stage.id);
  for (const f of fieldsFor(a, stage)) draft.answers[f.id] = f.type === 'choice' ? f.options![0].id : `  My original reasoning for ${f.label}.\nA second line remains intact.  `;
  return draft;
}
export function complete(a: Assessment, run: Run): Run {
  run.sessions[a.id].startedAt ||= new Date().toISOString();
  for (const s of a.stages) run = submitStage(config, run, a.id, s.id, validDraft(a, s));
  return run;
}
export function beforeCase(index: number): Run {
  let run = createRun(config, 'learner');
  for (const a of config.assessments.slice(0, index)) {
    run = complete(a, run);
    if (a.id === config.intermission.afterAssessmentId) run.intermission.continuedAt = new Date().toISOString();
  }
  return run;
}
export function started(index = 0): Run {
  const a = config.assessments[index]; const run = beforeCase(index);
  run.sessions[a.id].startedAt = new Date().toISOString(); run.sessions[a.id].draft = emptyDraft(a, a.stages[0].id); return run;
}
export function completedBattery(): Run { return complete(config.assessments[3], beforeCase(3)); }
