import { z } from 'zod';

const OptionSchema = z.object({ id: z.string(), label: z.string() });
const FieldSchema = z.object({
  id: z.string(), label: z.string(), prompt: z.string(), type: z.enum(['text', 'choice']), required: z.boolean(),
  maxWords: z.number().int().positive().optional(), options: z.array(OptionSchema).optional(), unscored: z.boolean().optional(),
});
const SelectedResponseSchema = z.object({
  id: z.string(), label: z.string(), prompt: z.string(), options: z.array(OptionSchema).min(2),
  correctOptionId: z.string(), feedbackByOption: z.record(z.string(), z.string()), deferFeedbackUntilBatteryComplete: z.literal(true),
});
const StageSchema = z.object({
  id: z.string(), title: z.string(), kind: z.enum(['open', 'update', 'challenge', 'predict', 'compare', 'explain', 'revise', 'evidence']),
  suggestedTime: z.string(), information: z.array(z.string()), note: z.array(z.string()),
  groups: z.array(z.object({ title: z.string(), paragraphs: z.array(z.string()) })), responseInstruction: z.string().optional(),
  fields: z.array(FieldSchema), selectedResponses: z.array(SelectedResponseSchema),
  requires: z.array(z.string()), priorResponses: z.array(z.string()), contextStageIds: z.array(z.string()),
});
const PredictionsSchema = z.object({
  cards: z.array(z.object({ id: z.string(), label: z.string() })).min(1), fields: z.array(FieldSchema),
  comparisonOptions: z.array(z.string()), comparisonPrompt: z.string(), evidencePrompt: z.string(), evidenceMaxWords: z.number().positive(),
});
const AssessmentSchema = z.object({
  id: z.string(), shortId: z.string(), format: z.enum(['A', 'B']), title: z.string(), contentVersion: z.string(), suggestedTime: z.string(),
  instructions: z.array(z.string()), predictions: PredictionsSchema.optional(), stages: z.array(StageSchema).min(1),
});
export const ConfigSchema = z.object({
  schemaVersion: z.literal(2), contentVersion: z.string(), confirmation: z.string(), guidance: z.array(z.string()),
  completionAcknowledgement: z.string(), intermission: z.object({ afterAssessmentId: z.string(), heading: z.string(), body: z.string() }),
  finalReview: z.object({ heading: z.string(), intro: z.string(), explanation: z.string(), guidance: z.string(), reflection: FieldSchema }),
  assessments: z.array(AssessmentSchema).length(4),
}).superRefine((c, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(c.assessments.map(a => a.id)).size !== c.assessments.length) issue('Duplicate assessment IDs');
  if (!c.assessments.slice(0, -1).some(a => a.id === c.intermission.afterAssessmentId)) issue('Invalid intermission boundary');
  const questionIds = new Set<string>();
  for (const a of c.assessments) {
    const seen = new Set<string>();
    if (a.predictions && new Set(a.predictions.cards.map(p => p.id)).size !== a.predictions.cards.length) issue('Duplicate prediction IDs');
    for (const [i, s] of a.stages.entries()) {
      if (seen.has(s.id) || s.requires.some(id => !seen.has(id)) || (i > 0 && !s.requires.includes(a.stages[i - 1].id))) issue(`Invalid stage graph: ${s.id}`);
      if ([...s.priorResponses, ...s.contextStageIds].some(id => !seen.has(id))) issue('Invalid prior stage reference');
      if (['predict', 'compare'].includes(s.kind) && !a.predictions) issue('Prediction stages require configuration');
      const fields = fieldsFor(a, s);
      if (new Set(fields.map(f => f.id)).size !== fields.length) issue('Duplicate field ID');
      for (const f of fields) {
        if (f.type === 'text' && !f.maxWords) issue('Text responses require a maximum');
        if (f.type === 'choice' && (!f.options?.length || new Set(f.options.map(o => o.id)).size !== f.options.length)) issue('Invalid choice options');
      }
      for (const q of s.selectedResponses) {
        if (questionIds.has(q.id)) issue('Duplicate question ID');
        questionIds.add(q.id);
        if (!q.options.some(o => o.id === q.correctOptionId) || q.options.some(o => !q.feedbackByOption[o.id])) issue('Incomplete selected-response feedback');
      }
      seen.add(s.id);
    }
  }
});
export type Config = z.infer<typeof ConfigSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type SelectedResponse = z.infer<typeof SelectedResponseSchema>;
export type Mode = 'learner' | 'reviewer';
export type Answers = Record<string, string>;

export const DraftSchema = z.object({ stageId: z.string(), answers: z.record(z.string(), z.string()), cardOrder: z.array(z.string()), updatedAt: z.string() });
const SnapshotSchema = DraftSchema.omit({ updatedAt: true }).extend({ submittedAt: z.string() });
export const RunSchema = z.object({
  schemaVersion: z.literal(2), contentVersion: z.string(), runId: z.string(), mode: z.enum(['learner', 'reviewer']),
  sessions: z.record(z.string(), z.object({ contentVersion: z.string(), startedAt: z.string().nullable(), draft: DraftSchema.nullable(), submitted: z.record(z.string(), SnapshotSchema) })),
  intermission: z.object({ seenAt: z.string().nullable(), continuedAt: z.string().nullable() }),
  reflection: z.object({ draft: z.string(), submitted: z.string().nullable(), submittedAt: z.string().nullable() }),
});
export type Run = z.infer<typeof RunSchema>;
export type Draft = z.infer<typeof DraftSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type Session = Run['sessions'][string];

export function createRun(c: Config, mode: Mode): Run {
  return { schemaVersion: 2, contentVersion: c.contentVersion, runId: crypto.randomUUID(), mode,
    sessions: Object.fromEntries(c.assessments.map(a => [a.id, { contentVersion: a.contentVersion, startedAt: null, draft: null, submitted: {} }])),
    intermission: { seenAt: null, continuedAt: null }, reflection: { draft: '', submitted: null, submittedAt: null } };
}
export function wordCount(value: string): number { return value.trim() ? value.trim().split(/\s+/u).length : 0; }
export function emptyDraft(a: Assessment, stageId: string): Draft {
  return { stageId, answers: {}, cardOrder: a.predictions?.cards.map(card => card.id) || [], updatedAt: new Date().toISOString() };
}
export function currentStage(a: Assessment, session: Session): Stage | undefined {
  return session.startedAt ? a.stages.find(s => !session.submitted[s.id]) : undefined;
}
export function stageStatus(a: Assessment, session: Session, stage: Stage) {
  if (session.submitted[stage.id]) return 'submitted';
  return currentStage(a, session)?.id === stage.id ? 'current' : 'notYetAvailable';
}
export function assessmentComplete(a: Assessment, session: Session): boolean {
  return a.stages.every(s => !!session.submitted[s.id] && !Object.keys(validate(a, s, { ...session.submitted[s.id], updatedAt: '' })).length);
}
export function batteryComplete(c: Config, run: Run): boolean { return c.assessments.every(a => assessmentComplete(a, run.sessions[a.id])); }
export function intermissionDue(c: Config, run: Run): boolean {
  const a = c.assessments.find(a => a.id === c.intermission.afterAssessmentId)!;
  return assessmentComplete(a, run.sessions[a.id]) && !run.intermission.continuedAt;
}
export function assessmentAvailable(c: Config, run: Run, aid: string): boolean {
  const index = c.assessments.findIndex(a => a.id === aid);
  if (index < 0 || c.assessments.slice(0, index).some(a => !assessmentComplete(a, run.sessions[a.id]))) return false;
  const boundary = c.assessments.findIndex(a => a.id === c.intermission.afterAssessmentId);
  return index <= boundary || !!run.intermission.continuedAt;
}
export function resumePath(c: Config, run: Run, mode: Mode = run.mode): string {
  if (batteryComplete(c, run)) return `/${mode}/review`;
  if (intermissionDue(c, run)) return `/${mode}/intermission`;
  const a = c.assessments.find(a => !assessmentComplete(a, run.sessions[a.id]))!;
  const current = currentStage(a, run.sessions[a.id]);
  return `/${mode}/assessment/${a.id}${current ? `/stage/${current.id}` : ''}`;
}
export function fieldsFor(a: Assessment, stage: Stage): Field[] {
  const p = a.predictions;
  const fields = [...stage.fields];
  if (stage.kind === 'predict' && p) fields.unshift(...p.cards.flatMap(card => p.fields.map(f => ({ ...f, id: `${card.id}.${f.id}` }))));
  if (stage.kind === 'compare' && p) fields.unshift(...p.cards.flatMap(card => [
    { id: `${card.id}.classification`, label: 'Evidence classification', prompt: p.comparisonPrompt, type: 'choice' as const, required: true, unscored: true,
      options: p.comparisonOptions.map(o => ({ id: o, label: o })) },
    { id: `${card.id}.evidence`, label: 'Evidence note', prompt: p.evidencePrompt, type: 'text' as const, required: true, maxWords: p.evidenceMaxWords },
  ]));
  fields.push(...stage.selectedResponses.map(q => ({ id: q.id, label: q.label, prompt: q.prompt, type: 'choice' as const, required: true, options: q.options.map(o => ({ ...o, label: `${o.id}. ${o.label}` })) })));
  return fields;
}
export function validCardOrder(a: Assessment, draft: Draft | Snapshot): boolean {
  const ids = a.predictions?.cards.map(p => p.id) || [];
  return draft.cardOrder.length === ids.length && new Set(draft.cardOrder).size === ids.length && draft.cardOrder.every(id => ids.includes(id));
}
export function validate(a: Assessment, stage: Stage, draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = fieldsFor(a, stage);
  for (const f of fields) {
    const value = draft.answers[f.id] || '';
    if (f.required && !value.trim()) errors[f.id] = f.type === 'choice' ? 'Choose an option.' : 'Enter a response.';
    else if (f.maxWords && wordCount(value) > f.maxWords) errors[f.id] = `Use ${f.maxWords} words or fewer. Your response has ${wordCount(value)} words.`;
    else if (f.type === 'choice' && value && !f.options?.some(o => o.id === value)) errors[f.id] = 'Choose a listed option.';
  }
  if (!validCardOrder(a, draft)) errors.cardOrder = 'All configured prediction cards must be present.';
  if (Object.keys(draft.answers).some(id => !fields.some(f => f.id === id))) errors.answers = 'Unexpected response field.';
  return errors;
}
export function submitStage(c: Config, run: Run, aid: string, sid: string, draft: Draft, at = new Date().toISOString()): Run {
  const a = c.assessments.find(a => a.id === aid);
  if (!a || !assessmentAvailable(c, run, aid)) throw new Error('Complete the preceding cases before continuing.');
  const stage = currentStage(a, run.sessions[aid]);
  if (!stage || stage.id !== sid || draft.stageId !== sid) throw new Error('This stage is no longer editable. Your saved submissions have been restored.');
  if (Object.keys(validate(a, stage, draft)).length) throw new Error('Complete the required fields within their word limits.');
  const next = structuredClone(run);
  next.sessions[aid].submitted[sid] = structuredClone({ stageId: sid, answers: draft.answers, cardOrder: draft.cardOrder, submittedAt: at });
  const following = a.stages[a.stages.findIndex(s => s.id === sid) + 1];
  next.sessions[aid].draft = following ? { ...emptyDraft(a, following.id), cardOrder: [...draft.cardOrder] } : null;
  if (aid === c.intermission.afterAssessmentId && assessmentComplete(a, next.sessions[aid])) next.intermission.seenAt ||= at;
  return next;
}
export function parseRun(raw: string, c: Config, mode: Mode): Run {
  const run = RunSchema.parse(JSON.parse(raw));
  if (run.contentVersion !== c.contentVersion || run.mode !== mode) throw new Error('Saved session version does not match this assessment.');
  if (Object.keys(run.sessions).length !== c.assessments.length) throw new Error('Saved assessment set is incomplete.');
  for (const a of c.assessments) {
    const session = run.sessions[a.id];
    if (!session || session.contentVersion !== a.contentVersion) throw new Error('Incompatible assessment state.');
    if (session.startedAt && !assessmentAvailable(c, run, a.id)) throw new Error('Saved case order is inconsistent.');
    let gap = false;
    for (const stage of a.stages) {
      const snap = session.submitted[stage.id];
      if (!snap) gap = true;
      else if (gap || !session.startedAt || snap.stageId !== stage.id || Object.keys(validate(a, stage, { ...snap, updatedAt: snap.submittedAt })).length) throw new Error('Saved submissions are inconsistent.');
    }
    if (Object.keys(session.submitted).some(id => !a.stages.some(s => s.id === id))) throw new Error('Unknown saved stage.');
    if (session.draft && (session.draft.stageId !== currentStage(a, session)?.id || !validCardOrder(a, session.draft))) throw new Error('Invalid saved draft.');
  }
  const boundary = c.assessments.find(a => a.id === c.intermission.afterAssessmentId)!;
  if ((run.intermission.seenAt || run.intermission.continuedAt) && !assessmentComplete(boundary, run.sessions[boundary.id])) throw new Error('Invalid intermission state.');
  if (run.intermission.continuedAt && !run.intermission.seenAt) throw new Error('Invalid intermission continuation.');
  if ((run.reflection.draft || run.reflection.submittedAt || run.reflection.submitted !== null) && !batteryComplete(c, run)) throw new Error('Invalid final reflection state.');
  if (run.reflection.submitted !== null && wordCount(run.reflection.submitted) > c.finalReview.reflection.maxWords!) throw new Error('Invalid submitted reflection.');
  return run;
}

// Keep compatible case state when content evolves. The old v1 run is left in its
// original storage key: none of its differently scaffolded stages are equivalent.
export function restoreRun(raw: string, c: Config, mode: Mode): { run: Run; migrated: boolean } {
  const data = JSON.parse(raw);
  if (data.schemaVersion === 1) return { run: createRun(c, mode), migrated: true };
  const run = RunSchema.parse(data);
  const fresh = createRun(c, mode);
  let resetFollowing = false;
  let migrated = run.contentVersion !== c.contentVersion;
  for (const a of c.assessments) {
    if (resetFollowing || run.sessions[a.id]?.contentVersion !== a.contentVersion) {
      run.sessions[a.id] = fresh.sessions[a.id];
      resetFollowing = true;
      migrated = true;
    }
  }
  for (const id of Object.keys(run.sessions)) if (!c.assessments.some(a => a.id === id)) { delete run.sessions[id]; migrated = true; }
  if (resetFollowing) { run.intermission = fresh.intermission; run.reflection = fresh.reflection; }
  run.contentVersion = c.contentVersion;
  // A later-case reset can retain the already completed break boundary.
  const boundary = c.assessments.find(a => a.id === c.intermission.afterAssessmentId)!;
  if (resetFollowing && assessmentComplete(boundary, run.sessions[boundary.id])) run.intermission = data.intermission;
  return { run: parseRun(JSON.stringify(run), c, mode), migrated };
}
