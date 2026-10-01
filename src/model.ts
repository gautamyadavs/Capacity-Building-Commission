import { z } from 'zod';

const FieldSchema = z.object({
  id: z.string(), label: z.string(), prompt: z.string(),
  type: z.enum(['text', 'choice']), required: z.boolean(),
  maxWords: z.number().positive().optional(), options: z.array(z.string()).optional(), unscored: z.boolean().optional(),
});
const StageSchema = z.object({
  id: z.string(), title: z.string(), sourceSection: z.string(),
  kind: z.enum(['decision', 'update', 'challenge', 'predict', 'compare', 'explain', 'revise']),
  suggestedTime: z.string(), information: z.array(z.string()), note: z.array(z.string()),
  groups: z.array(z.object({ title: z.string(), paragraphs: z.array(z.string()) })),
  fields: z.array(FieldSchema), requires: z.array(z.string()), priorResponses: z.array(z.string()),
  reviewerNotes: z.array(z.string()), sourcesEnabled: z.boolean(),
});
const AssessmentSchema = z.object({
  id: z.string(), shortId: z.string(), format: z.enum(['A', 'B']), title: z.string(),
  instructions: z.array(z.string()), reviewerNotes: z.array(z.string()), sourceSection: z.string(), stages: z.array(StageSchema),
});
export const ConfigSchema = z.object({
  schemaVersion: z.literal(1), contentVersion: z.string(),
  source: z.object({ url: z.string(), sha256: z.string(), retrievedOn: z.string() }),
  confirmation: z.string(), openBook: z.array(z.string()), notAssessed: z.array(z.string()), status: z.string(),
  sourcePrompt: z.string(), cards: z.array(z.object({ id: z.string(), label: z.string(), prompt: z.string() })).length(3),
  cardFields: z.array(FieldSchema), comparisonOptions: z.array(z.string()), comparisonPrompt: z.string(),
  assessments: z.array(AssessmentSchema).length(4),
  formats: z.array(z.object({
    id: z.enum(['A', 'B']), title: z.string(), description: z.string(), assessmentIds: z.array(z.string()).length(2),
    reviewerNotes: z.array(z.string()),
    debrief: z.object({ information: z.array(z.string()), fields: z.array(FieldSchema), button: z.string() }),
  })),
  reviewerSections: z.array(z.object({ title: z.string(), paragraphs: z.array(z.string()) })),
}).superRefine((c, ctx) => {
  const ids = c.assessments.map(a => a.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate assessment IDs' });
  for (const a of c.assessments) {
    const seen = new Set<string>();
    a.stages.forEach((s, i) => {
      if (seen.has(s.id) || s.requires.some(id => !seen.has(id)) || (i > 0 && !s.requires.includes(a.stages[i-1].id)))
        ctx.addIssue({ code: 'custom', message: `Invalid stage graph: ${s.id}` });
      if (s.priorResponses.some(id => !seen.has(id))) ctx.addIssue({ code: 'custom', message: 'Invalid prior response reference' });
      if (new Set(s.fields.map(f => f.id)).size !== s.fields.length) ctx.addIssue({ code: 'custom', message: 'Duplicate field ID' });
      if (s.fields.some(f => f.type === 'choice' && !f.options?.length)) ctx.addIssue({ code: 'custom', message: 'Choice requires options' });
      seen.add(s.id);
    });
  }
  for (const f of c.formats) if (f.assessmentIds.some(id => !c.assessments.some(a => a.id === id && a.format === f.id)))
    ctx.addIssue({ code: 'custom', message: 'Invalid format membership' });
});
export type Config = z.infer<typeof ConfigSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Mode = 'learner' | 'reviewer';
export type FormatId = 'A' | 'B';
export type Answers = Record<string, string>;

export const DraftSchema = z.object({ stageId: z.string(), answers: z.record(z.string(), z.string()), cardOrder: z.array(z.string()), updatedAt: z.string() });
const SnapshotSchema = z.object({ stageId: z.string(), answers: z.record(z.string(), z.string()), cardOrder: z.array(z.string()), sourceLog: z.string(), submittedAt: z.string() });
export const RunSchema = z.object({
  schemaVersion: z.literal(1), contentVersion: z.string(), runId: z.string(), demoParticipantId: z.string(), mode: z.enum(['learner', 'reviewer']),
  sessions: z.record(z.string(), z.object({ startedAt: z.string().nullable(), draft: DraftSchema.nullable(), submitted: z.record(z.string(), SnapshotSchema) })),
  reflections: z.record(z.string(), z.object({ answers: z.record(z.string(), z.string()), completedAt: z.string().nullable() })),
});
export type Run = z.infer<typeof RunSchema>;
export type Draft = z.infer<typeof DraftSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type Session = Run['sessions'][string];

export function createRun(c: Config, mode: Mode): Run {
  return { schemaVersion: 1, contentVersion: c.contentVersion, runId: crypto.randomUUID(), demoParticipantId: crypto.randomUUID(), mode,
    sessions: Object.fromEntries(c.assessments.map(a => [a.id, { startedAt: null, draft: null, submitted: {} }])),
    reflections: { A: { answers: {}, completedAt: null }, B: { answers: {}, completedAt: null } } };
}
export function wordCount(value: string): number { return value.trim() ? value.trim().split(/\s+/u).length : 0; }
export function emptyDraft(c: Config, stageId: string): Draft {
  return { stageId, answers: {}, cardOrder: c.cards.map(card => card.id), updatedAt: new Date().toISOString() };
}
export function currentStage(a: Assessment, session: Session): Stage | undefined {
  return session.startedAt ? a.stages.find(s => !session.submitted[s.id]) : undefined;
}
export function stageStatus(a: Assessment, session: Session, stage: Stage) {
  if (session.submitted[stage.id]) return 'submitted';
  return currentStage(a, session)?.id === stage.id ? 'current' : 'notYetAvailable';
}
export function assessmentComplete(a: Assessment, session: Session): boolean { return a.stages.every(s => !!session.submitted[s.id]); }
export function debriefEligible(c: Config, run: Run, fid: FormatId): boolean {
  return c.assessments.filter(a => a.format === fid).every(a => assessmentComplete(a, run.sessions[a.id]));
}
export function fieldsFor(c: Config, stage: Stage): Field[] {
  const fields = [...stage.fields];
  if (stage.kind === 'predict') fields.unshift(...c.cards.flatMap(card => c.cardFields.map(f => ({ ...f, id: `${card.id}.${f.id}` }))));
  if (stage.kind === 'compare') fields.unshift(...c.cards.flatMap(card => [
    { id: `${card.id}.classification`, label: `${card.label} — Evidence classification`, prompt: 'For each prediction card, choose one evidence classification:', type: 'choice' as const, required: true, options: c.comparisonOptions },
    { id: `${card.id}.evidence`, label: 'Evidence note', prompt: c.comparisonPrompt, type: 'text' as const, required: true, maxWords: 60 },
  ]));
  if (stage.sourcesEnabled) fields.push({ id: 'sources', label: 'External sources used', prompt: c.sourcePrompt, type: 'text', required: false });
  return fields;
}
export function validate(c: Config, stage: Stage, draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fieldsFor(c, stage)) {
    const value = draft.answers[f.id] || '';
    if (f.required && !value.trim()) errors[f.id] = f.type === 'choice' ? 'Choose an option.' : 'Enter a response.';
    else if (f.maxWords && wordCount(value) > f.maxWords) errors[f.id] = `Use ${f.maxWords} words or fewer. Your response has ${wordCount(value)} words.`;
    else if (f.type === 'choice' && value && !f.options?.includes(value)) errors[f.id] = 'Choose a listed option.';
  }
  if (stage.kind === 'predict' && (draft.cardOrder.length !== c.cards.length || new Set(draft.cardOrder).size !== c.cards.length || draft.cardOrder.some(id => !c.cards.some(card => card.id === id)))) errors.cardOrder = 'All three prediction cards must be present.';
  return errors;
}
export function submitStage(c: Config, run: Run, aid: string, sid: string, draft: Draft, at = new Date().toISOString()): Run {
  const a = c.assessments.find(a => a.id === aid)!;
  const session = run.sessions[aid];
  const stage = currentStage(a, session);
  if (!stage || stage.id !== sid || draft.stageId !== sid) throw new Error('This stage is no longer editable. Your saved submissions have been restored.');
  if (Object.keys(validate(c, stage, draft)).length) throw new Error('Complete the required fields within their word limits.');
  const next = structuredClone(run);
  // Never retain references to editable drafts, including card ordering.
  next.sessions[aid].submitted[sid] = structuredClone({ stageId: sid, answers: draft.answers, cardOrder: draft.cardOrder, sourceLog: draft.answers.sources || '', submittedAt: at });
  const following = a.stages[a.stages.findIndex(s => s.id === sid) + 1];
  next.sessions[aid].draft = following ? { ...emptyDraft(c, following.id), cardOrder: [...draft.cardOrder] } : null;
  return next;
}
export function parseRun(raw: string, c: Config, mode: Mode): Run {
  const run = RunSchema.parse(JSON.parse(raw));
  if (run.contentVersion !== c.contentVersion || run.mode !== mode) throw new Error('Saved session version does not match this prototype.');
  if (Object.keys(run.sessions).length !== c.assessments.length) throw new Error('Saved assessment set is incomplete.');
  for (const a of c.assessments) {
    const session = run.sessions[a.id];
    if (!session) throw new Error('Missing saved assessment.');
    let gap = false;
    for (const stage of a.stages) {
      const snap = session.submitted[stage.id];
      if (!snap) gap = true;
      else if (gap || !session.startedAt || snap.stageId !== stage.id || Object.keys(validate(c, stage, { ...snap, updatedAt: snap.submittedAt })).length) throw new Error('Saved submissions are inconsistent.');
    }
    if (Object.keys(session.submitted).some(id => !a.stages.some(s => s.id === id))) throw new Error('Unknown saved stage.');
    if (session.draft && session.draft.stageId !== currentStage(a, session)?.id) throw new Error('Saved draft does not match the current stage.');
    if (session.draft && (session.draft.cardOrder.length !== c.cards.length || new Set(session.draft.cardOrder).size !== c.cards.length || session.draft.cardOrder.some(id => !c.cards.some(card => card.id === id)))) throw new Error('Invalid draft card order.');
  }
  for (const fid of ['A', 'B'] as const) if (!run.reflections[fid] || (run.reflections[fid].completedAt && !debriefEligible(c, run, fid))) throw new Error('Invalid debrief state.');
  return run;
}
