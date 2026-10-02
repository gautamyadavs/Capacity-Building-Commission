import { beforeEach, describe, it, expect } from 'vitest';
import { RunStore } from '../src/persistence';
import { beforeCase, completedBattery, config, previousConfig, throughStage, validDraft } from './helpers';
const a = config.assessments[0]; const s = a.stages[0];
beforeEach(() => localStorage.clear());
function seeded(index: number) { const store = new RunStore(config, 'learner'); localStorage.setItem(store.key, JSON.stringify(beforeCase(index))); return new RunStore(config, 'learner'); }
describe('local persistence', () => {
  it('keeps a newer edit visible while successive blur saves are queued', async () => {
    const store = new RunStore(config, 'learner'); await store.begin(a.id);
    const first = validDraft(a, s); store.edit(a.id, first); const save1 = store.flush();
    const second = { ...first, answers: { response: 'The latest edit must stay visible.' } }; store.edit(a.id, second); const save2 = store.flush();
    const observed: string[] = []; const unsubscribe = store.subscribe(() => observed.push(store.getSnapshot().run.sessions[a.id].draft!.answers.response));
    await Promise.all([save1, save2]); unsubscribe(); expect(observed.length).toBeGreaterThan(0); expect(observed.every(value => value === second.answers.response)).toBe(true);
    expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].draft!.answers).toEqual(second.answers);
  });
  it('restores the latest draft before debounced autosave', async () => {
    const store = new RunStore(config, 'learner'); await store.begin(a.id); const draft = validDraft(a, s); store.edit(a.id, draft);
    expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].draft!.answers).toEqual(draft.answers); await store.flush();
  });
  it('preserves exact snapshots against reload and a stale tab', async () => {
    const store = new RunStore(config, 'learner'); await store.begin(a.id); const stale = new RunStore(config, 'learner'); const draft = validDraft(a, s);
    await store.submit(a.id, s.id, draft); stale.edit(a.id, { ...draft, answers: { response: 'hindsight' } }); await stale.flush();
    const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().run.sessions[a.id].submitted[s.id].answers).toEqual(draft.answers);
    expect(restored.getSnapshot().run.sessions[a.id].draft!.stageId).toBe(a.stages[1].id);
  });
  it('persists prediction confidence and comparisons without assessing their correctness', async () => {
    const store = seeded(1); const b = config.assessments[1]; await store.begin(b.id);
    for (const stage of b.stages.slice(0, 2)) await store.submit(b.id, stage.id, validDraft(b, stage));
    const restored = new RunStore(config, 'learner').getSnapshot().run.sessions[b.id];
    expect(restored.submitted.B1_predict.answers['prediction1.confidence']).toBe('High');
    expect(restored.submitted.B1_compare.answers['prediction2.classification']).toBe('Supported');
  });
  it('persists the pause and resumes both episodes with three checks and two amendments', async () => {
    const store = new RunStore(config, 'learner');
    for (const [i, assessment] of config.assessments.entries()) {
      await store.begin(assessment.id);
      for (const stage of assessment.stages) await store.submit(assessment.id, stage.id, validDraft(assessment, stage));
      if (i === 0) {
        const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().run.intermission.continuedAt).toBeNull();
        await expect(restored.begin(config.assessments[1].id)).rejects.toThrow('preceding'); await store.continueAfterBreak();
      }
    }
    const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().run.intermission.continuedAt).not.toBeNull();
    const answers = config.assessments.flatMap(a => a.stages.flatMap(s => s.selectedResponses.map(q => restored.getSnapshot().run.sessions[a.id].submitted[s.id].answers[q.id])));
    expect(answers).toEqual(Array(3).fill('A'));
    for (const assessment of config.assessments) expect(restored.getSnapshot().run.sessions[assessment.id].submitted[assessment.stages.at(-1)!.id].answers.amendment).toBeDefined();
  });
  it('safely migrates old schema and preserves its original storage', async () => {
    const legacyKey = 'bharat-kalp:/:v1:learner'; const old = JSON.stringify({ schemaVersion: 1, sessions: { old: { submitted: { old: 'original' } } } }); localStorage.setItem(legacyKey, old);
    const store = new RunStore(config, 'learner', localStorage, '/'); expect(store.getSnapshot().fatal).toBe(false); expect(store.getSnapshot().notice).toContain('updated');
    expect(localStorage.getItem(legacyKey)).toBe(old); await store.begin(a.id); expect(new RunStore(config, 'learner', localStorage, '/').getSnapshot().run.schemaVersion).toBe(2);
  });
  it('keeps compatible case submissions on an assessment-version change', () => {
    const store = new RunStore(config, 'learner'); const run = completedBattery(); run.sessions[config.assessments[1].id].contentVersion = 'old'; localStorage.setItem(store.key, JSON.stringify(run));
    const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().fatal).toBe(false); expect(restored.getSnapshot().run.sessions[a.id]).toEqual(run.sessions[a.id]);
    expect(localStorage.getItem(`${store.key}:backup:${run.runId}`)).toBe(JSON.stringify(run));
  });
  it('backs up the four-case release and obsolete journals, then starts the changed flood episode safely', async () => {
    const key = new RunStore(config, 'learner').key; const run = completedBattery(previousConfig);
    run.reflection = { draft: 'Previous reflection', submitted: 'Previous reflection', submittedAt: new Date().toISOString() };
    const original = JSON.stringify(run); localStorage.setItem(key, original);
    // Journals from reset cases and the final reflection must not revive old state.
    for (const assessment of previousConfig.assessments) localStorage.setItem(`${key}:draft:${run.runId}:${assessment.id}`, JSON.stringify({ ...validDraft(assessment, assessment.stages[0]), updatedAt: '2099-01-01T00:00:00.000Z' }));
    localStorage.setItem(`${key}:reflection:${run.runId}`, JSON.stringify('Old reflection journal'));
    const store = new RunStore(config, 'learner'); const restored = store.getSnapshot();
    expect(restored.fatal).toBe(false); expect(restored.notice).toContain('updated');
    expect(Object.keys(restored.run.sessions)).toEqual(['A1_FLOOD', 'B1_AIR_POE']);
    for (const assessment of config.assessments) expect(restored.run.sessions[assessment.id]).toEqual({ contentVersion: assessment.contentVersion, startedAt: null, draft: null, submitted: {} });
    expect(restored.run.intermission).toEqual({ seenAt: null, continuedAt: null });
    expect(restored.run.reflection).toEqual({ draft: '', submitted: null, submittedAt: null });
    expect(localStorage.getItem(`${key}:backup:${run.runId}`)).toBe(original);
    for (const assessment of previousConfig.assessments) {
      expect(localStorage.getItem(`${key}:draft:${run.runId}:${assessment.id}`)).toBeNull();
      expect(localStorage.getItem(`${key}:backup:${run.runId}:draft:${assessment.id}`)).not.toBeNull();
    }
    expect(localStorage.getItem(`${key}:reflection:${run.runId}`)).toBeNull();
    expect(localStorage.getItem(`${key}:backup:${run.runId}:reflection`)).toBe(JSON.stringify('Old reflection journal'));
    await store.begin(a.id);
    const reloaded = new RunStore(config, 'learner').getSnapshot();
    expect(reloaded.fatal).toBe(false); expect(reloaded.notice).toBeNull();
    expect(reloaded.run.sessions[a.id].draft!.answers).toEqual({});
    for (const stage of a.stages) await store.submit(a.id, stage.id, validDraft(a, stage));
    expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].submitted.A1_review.answers.amendment).toBeDefined();
    expect(localStorage.getItem(`${key}:backup:${run.runId}`)).toBe(original);
  });
  it.each([0, 1])('journals and locks a review amendment without altering originals in episode %i', async index => {
    const assessment = config.assessments[index]; const review = assessment.stages.at(-1)!;
    const key = new RunStore(config, 'learner').key; const run = throughStage(index, assessment.stages.length - 1);
    localStorage.setItem(key, JSON.stringify(run)); const store = new RunStore(config, 'learner');
    const draft = validDraft(assessment, review); draft.answers.amendment = '  My specific amendment.\nMy reason for changing it.  ';
    store.edit(assessment.id, draft);
    expect(new RunStore(config, 'learner').getSnapshot().run.sessions[assessment.id].draft!.answers.amendment).toBe(draft.answers.amendment);
    const stale = new RunStore(config, 'learner'); await store.submit(assessment.id, review.id, draft);
    stale.edit(assessment.id, { ...draft, answers: { amendment: 'overwrite' } }); await stale.flush();
    const restored = new RunStore(config, 'learner').getSnapshot().run;
    expect(restored.sessions[assessment.id].submitted[review.id].answers.amendment).toBe(draft.answers.amendment);
    for (const [id, snap] of Object.entries(run.sessions[assessment.id].submitted)) expect(restored.sessions[assessment.id].submitted[id]).toEqual(snap);
  });
  it('does not resurrect submissions after a reset in another tab', async () => {
    const store = new RunStore(config, 'learner'); await store.begin(a.id); const stale = new RunStore(config, 'learner'); await store.reset();
    await expect(stale.submit(a.id, s.id, validDraft(a, s))).rejects.toThrow('reset'); expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].submitted).toEqual({});
  });
  it('prevents an old-version tab from replacing a draft journal after migration', async () => {
    const old = new RunStore(previousConfig, 'learner'); const previous = previousConfig.assessments[0];
    await old.begin(previous.id);
    const migrated = new RunStore(config, 'learner'); await migrated.begin(a.id);
    const currentDraft = validDraft(a, s); currentDraft.answers.response = 'My new pilot response';
    migrated.edit(a.id, currentDraft);
    // Simulate a tab whose storage event has not yet been processed.
    old.edit(previous.id, validDraft(previous, previous.stages[0]));
    expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].draft!.answers).toEqual(currentDraft.answers);
    await migrated.flush();
  });
  it('keeps the stage locked until a storage write succeeds', async () => {
    const memory = new Map<string, string>(); let fail = false;
    const storage: Storage = { get length() { return memory.size; }, clear: () => memory.clear(), key: i => Array.from(memory.keys())[i] || null, getItem: k => memory.get(k) || null, setItem: (k, v) => { if (fail) throw new Error('Quota exceeded'); memory.set(k, v); }, removeItem: k => { memory.delete(k); } };
    const store = new RunStore(config, 'learner', storage); await store.begin(a.id); fail = true;
    await expect(store.submit(a.id, s.id, validDraft(a, s))).rejects.toThrow('Quota'); expect(store.getSnapshot().run.sessions[a.id].submitted).toEqual({}); expect(store.getSnapshot().saveStatus).toBe('Not saved');
    fail = false; await store.submit(a.id, s.id, validDraft(a, s)); expect(store.getSnapshot().run.sessions[a.id].submitted[s.id]).toBeDefined();
  });
  it('preserves malformed current storage for explicit recovery', () => {
    const key = new RunStore(config, 'learner').key; localStorage.setItem(key, '{unreadable'); const store = new RunStore(config, 'learner');
    expect(store.getSnapshot().fatal).toBe(true); expect(store.recoveryData()).toBe('{unreadable');
  });
  it('autosaves and locks the single optional reflection only after completion', async () => {
    const store = new RunStore(config, 'learner'); store.reflect('too early'); expect(store.getSnapshot().run.reflection.draft).toBe('');
    localStorage.setItem(store.key, JSON.stringify(completedBattery())); const final = new RunStore(config, 'learner'); final.reflect('  My reflection.\nExact wording.  ');
    expect(new RunStore(config, 'learner').getSnapshot().run.reflection.draft).toBe('  My reflection.\nExact wording.  ');
    await final.submitReflection(); final.reflect('replacement'); expect(new RunStore(config, 'learner').getSnapshot().run.reflection.submitted).toBe('  My reflection.\nExact wording.  ');
  });
});
