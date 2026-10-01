import { readFileSync } from 'node:fs';
import { ConfigSchema, createRun, emptyDraft, fieldsFor, submitStage, type Assessment, type Mode, type Run, type Stage } from '../src/model';
export const config=ConfigSchema.parse(JSON.parse(readFileSync('public/content/assessments.json','utf8')));
export function validDraft(stage:Stage) {
  const draft=emptyDraft(config,stage.id);
  for(const f of fieldsFor(config,stage)) draft.answers[f.id]=f.type==='choice'?f.options![0]:`  My original reasoning for ${f.label}.\nA second line remains intact.  `;
  return draft;
}
export function started(a:Assessment,mode:Mode='learner') {const run=createRun(config,mode);run.sessions[a.id].startedAt=new Date().toISOString();run.sessions[a.id].draft=emptyDraft(config,a.stages[0].id);return run;}
export function complete(a:Assessment,run:Run) {run.sessions[a.id].startedAt||=new Date().toISOString();for(const s of a.stages)run=submitStage(config,run,a.id,s.id,validDraft(s));return run;}
