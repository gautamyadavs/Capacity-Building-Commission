import { readFileSync } from 'node:fs';
import { ConfigSchema, createRun, emptyDraft, fieldsFor, submitStage, type Assessment, type Config, type Run, type Stage } from '../src/model';
export const config = ConfigSchema.parse(JSON.parse(readFileSync('public/content/assessments.json', 'utf8')));
// Reconstruct the preceding release's four-stage A2 to exercise real v2 migration.
export const previousConfig = (() => {
  const previous = structuredClone(config);
  previous.contentVersion = 'four-cases-2026-10-01';
  const a2 = previous.assessments[1];
  a2.contentVersion = 'four-cases-v2';
  a2.stages[2].selectedResponses = a2.stages.pop()!.selectedResponses;
  return ConfigSchema.parse(previous);
})();
export function validDraft(a: Assessment, stage: Stage) {
  const draft = emptyDraft(a, stage.id);
  for (const f of fieldsFor(a, stage)) draft.answers[f.id] = f.type === 'choice' ? f.options![0].id : `  My original reasoning for ${f.label}.\nA second line remains intact.  `;
  return draft;
}
export function complete(a: Assessment, run: Run, content: Config = config): Run {
  run.sessions[a.id].startedAt ||= new Date().toISOString();
  for (const s of a.stages) run = submitStage(content, run, a.id, s.id, validDraft(a, s));
  return run;
}
export function beforeCase(index: number, content: Config = config): Run {
  let run = createRun(content, 'learner');
  for (const a of content.assessments.slice(0, index)) {
    run = complete(a, run, content);
    if (a.id === content.intermission.afterAssessmentId) run.intermission.continuedAt = new Date().toISOString();
  }
  return run;
}
export function started(index = 0, content: Config = config): Run {
  const a = content.assessments[index]; const run = beforeCase(index, content);
  run.sessions[a.id].startedAt = new Date().toISOString(); run.sessions[a.id].draft = emptyDraft(a, a.stages[0].id); return run;
}
export function completedBattery(content: Config = config): Run { return complete(content.assessments[3], beforeCase(3, content), content); }
