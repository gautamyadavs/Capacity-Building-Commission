import { beforeEach, describe, it, expect } from 'vitest';
import { RunStore } from '../src/persistence';
import { beforeCase, completedBattery, config, validDraft } from './helpers';
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
    const store = seeded(2); const b = config.assessments[2]; await store.begin(b.id);
    for (const stage of b.stages.slice(0, 2)) await store.submit(b.id, stage.id, validDraft(b, stage));
    const restored = new RunStore(config, 'learner').getSnapshot().run.sessions[b.id];
    expect(restored.submitted.B1_predict.answers['prediction1.confidence']).toBe('High');
    expect(restored.submitted.B1_compare.answers['prediction2.classification']).toBe('Supported');
  });
  it('persists the intermission and resumes through all four cases with seven answers', async () => {
    const store = new RunStore(config, 'learner');
    for (const [i, assessment] of config.assessments.entries()) {
      await store.begin(assessment.id);
      for (const stage of assessment.stages) await store.submit(assessment.id, stage.id, validDraft(assessment, stage));
      if (i === 1) {
        const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().run.intermission.continuedAt).toBeNull();
        await expect(restored.begin(config.assessments[2].id)).rejects.toThrow('preceding'); await store.continueAfterBreak();
      }
    }
    const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().run.intermission.continuedAt).not.toBeNull();
    const answers = config.assessments.flatMap(a => a.stages.flatMap(s => s.selectedResponses.map(q => restored.getSnapshot().run.sessions[a.id].submitted[s.id].answers[q.id])));
    expect(answers).toEqual(Array(7).fill('A'));
  });
  it('safely migrates old schema and preserves its original storage', async () => {
    const legacyKey = 'bharat-kalp:/:v1:learner'; const old = JSON.stringify({ schemaVersion: 1, sessions: { old: { submitted: { old: 'original' } } } }); localStorage.setItem(legacyKey, old);
    const store = new RunStore(config, 'learner', localStorage, '/'); expect(store.getSnapshot().fatal).toBe(false); expect(store.getSnapshot().notice).toContain('updated');
    expect(localStorage.getItem(legacyKey)).toBe(old); await store.begin(a.id); expect(new RunStore(config, 'learner', localStorage, '/').getSnapshot().run.schemaVersion).toBe(2);
  });
  it('keeps compatible case submissions on an assessment-version change', () => {
    const store = new RunStore(config, 'learner'); const run = completedBattery(); run.sessions[config.assessments[3].id].contentVersion = 'old'; localStorage.setItem(store.key, JSON.stringify(run));
    const restored = new RunStore(config, 'learner'); expect(restored.getSnapshot().fatal).toBe(false); expect(restored.getSnapshot().run.sessions[a.id]).toEqual(run.sessions[a.id]);
    expect(localStorage.getItem(`${store.key}:backup:${run.runId}`)).toBe(JSON.stringify(run));
  });
  it('does not resurrect submissions after a reset in another tab', async () => {
    const store = new RunStore(config, 'learner'); await store.begin(a.id); const stale = new RunStore(config, 'learner'); await store.reset();
    await expect(stale.submit(a.id, s.id, validDraft(a, s))).rejects.toThrow('reset'); expect(new RunStore(config, 'learner').getSnapshot().run.sessions[a.id].submitted).toEqual({});
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
