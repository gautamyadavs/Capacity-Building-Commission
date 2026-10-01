import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ConfigSchema, assessmentAvailable, batteryComplete, createRun, currentStage, fieldsFor, intermissionDue, parseRun, restoreRun, submitStage, validate, wordCount } from '../src/model';
import { beforeCase, complete, completedBattery, config, started, validDraft } from './helpers';

describe('final four-case content', () => {
  it('has the specified stage order and seven deferred checks', () => {
    expect(config.assessments.map(a => a.stages.map(s => s.title))).toEqual([
      ['Initial judgement', 'Make it executable', 'New information', 'Decision challenge'],
      ['Initial judgement', 'Allocation and execution', 'Day 4 update', 'Allocation challenge'],
      ['Predict', 'Observe and compare', 'Explain', 'Revise', 'Evidence checks'],
      ['Predict', 'Observe and compare', 'Explain', 'Revise', 'Evidence checks'],
    ]);
    expect(config.assessments[1].stages[2].selectedResponses).toHaveLength(1);
    const checks = config.assessments.flatMap(a => a.stages.flatMap(s => s.selectedResponses));
    expect(checks.map(q => q.correctOptionId)).toEqual(['C', 'B', 'A', 'C', 'B', 'A', 'B']);
    expect(checks.every(q => q.deferFeedbackUntilBatteryComplete && Object.keys(q.feedbackByOption).length === 3)).toBe(true);
  });
  it('configures exactly two identical prediction cards per case with the correct limits', () => {
    for (const a of config.assessments.slice(2)) {
      expect(a.predictions!.cards.map(c => c.label)).toEqual(['Prediction 1', 'Prediction 2']);
      expect(a.predictions!.fields.map(f => [f.id, f.maxWords])).toEqual([['prediction', 35], ['why', 60], ['confidence', undefined]]);
      expect(a.predictions!.fields.find(f => f.id === 'confidence')).toMatchObject({ required: true, unscored: true });
      expect(a.predictions!.evidenceMaxWords).toBe(35);
      expect(a.stages[0].fields[0].maxWords).toBe(60);
      expect(a.stages[2].fields.map(f => f.maxWords)).toEqual([120, 150]);
      expect(a.stages[3].fields[0].maxWords).toBe(180);
    }
  });
  it('uses every specified open-response maximum and unscored position selectors', () => {
    expect(config.assessments.slice(0, 2).map(a => a.stages.map(s => s.fields.find(f => f.type === 'text')!.maxWords))).toEqual([[200, 150, 160, 170], [220, 150, 150, 180]]);
    for (const a of config.assessments.slice(0, 2)) expect(a.stages[3].fields[0]).toMatchObject({ id: 'position', unscored: true, options: [{ id: 'Maintain' }, { id: 'Modify' }, { id: 'Reverse' }] });
    expect(config.finalReview.reflection).toMatchObject({ required: false, maxWords: 150 });
  });
  it('retains authoritative facts, replaces observed values, and removes reviewer content', () => {
    const facts = config.assessments.map(a => JSON.stringify(a));
    for (const text of ['140,000', '11,000', '600 buses', '260 buses', '420 buses', 'limited access to private transport', 'No single agency controls all resources']) expect(facts[0]).toContain(text);
    for (const text of ['18 days', '9 to 12 days', 'no safe short-term substitute', 'last-mile allocation', '70 percent confidence']) expect(facts[1]).toContain(text);
    for (const text of ['91 percent', '14 percent', '455 and 480', '38 to 46 percent', '39 percent', 'income distress']) expect(facts[2]).toContain(text);
    for (const text of ['Monthly closures increase 32 percent', '23 to 15 days', 'backlog falls 11 percent', '17 percent to 20 percent', '56 percent to 54 percent', 'It does not show when substantive work', 'fewer cross-department grievances']) expect(facts[3]).toContain(text);
    const publicContent = readFileSync('public/content/assessments.json', 'utf8');
    expect(publicContent).not.toMatch(/reviewerNotes|reviewerSections|KCM|KQF|rubric|competency|psychometric|sample answer|pilot methodology|PEOE|POE-R|SJT|evidence architecture/i);
  });
  it('rejects a broken prerequisite graph and incomplete question feedback', () => {
    const broken = structuredClone(config); broken.assessments[0].stages[1].requires = [];
    expect(ConfigSchema.safeParse(broken).success).toBe(false);
    const missing = structuredClone(config); missing.assessments[1].stages[2].selectedResponses[0].feedbackByOption = {};
    expect(ConfigSchema.safeParse(missing).success).toBe(false);
  });
});
describe('battery state and immutable submission', () => {
  it('enforces case order and the intermission boundary', () => {
    let run = createRun(config, 'learner');
    expect(config.assessments.map(a => assessmentAvailable(config, run, a.id))).toEqual([true, false, false, false]);
    run = complete(config.assessments[0], run); run = complete(config.assessments[1], run);
    expect(intermissionDue(config, run)).toBe(true); expect(run.intermission.seenAt).not.toBeNull();
    expect(assessmentAvailable(config, run, config.assessments[2].id)).toBe(false);
    run.intermission.continuedAt = new Date().toISOString(); expect(assessmentAvailable(config, run, config.assessments[2].id)).toBe(true);
  });
  it('locks predictions before comparison and checks after both open explanation and revision', () => {
    for (const index of [2, 3]) {
      const a = config.assessments[index]; let run = started(index);
      expect(currentStage(a, run.sessions[a.id])!.kind).toBe('predict');
      expect(() => submitStage(config, run, a.id, a.stages[1].id, validDraft(a, a.stages[1]))).toThrow('no longer editable');
      for (const s of a.stages.slice(0, 4)) {
        expect(() => submitStage(config, run, a.id, a.stages[4].id, validDraft(a, a.stages[4]))).toThrow('no longer editable');
        run = submitStage(config, run, a.id, s.id, validDraft(a, s));
      }
      expect(currentStage(a, run.sessions[a.id])!.kind).toBe('evidence');
    }
  });
  it('deep-copies the exact response and rejects repeat submission', () => {
    const a = config.assessments[0]; const s = a.stages[0]; const draft = validDraft(a, s); const exact = draft.answers.response;
    const next = submitStage(config, started(), a.id, s.id, draft);
    draft.answers.response = 'Retrospective change';
    expect(next.sessions[a.id].submitted[s.id].answers.response).toBe(exact);
    expect(() => submitStage(config, next, a.id, s.id, draft)).toThrow('no longer editable');
  });
  it('requires every case and every selected-response answer before final review', () => {
    for (const i of [0, 1, 2, 3]) expect(batteryComplete(config, beforeCase(i))).toBe(false);
    const run = completedBattery(); expect(batteryComplete(config, run)).toBe(true);
    delete run.sessions[config.assessments[3].id].submitted.B2_checks.answers.B2_check3;
    expect(batteryComplete(config, run)).toBe(false);
  });
  it('has no correctness key for position, classification or confidence', () => {
    const a = config.assessments[2];
    expect(fieldsFor(a, a.stages[1]).filter(f => f.type === 'choice').every(f => f.unscored)).toBe(true);
    for (const option of ['Maintain', 'Modify', 'Reverse']) {
      const challenge = config.assessments[0].stages[3]; const draft = validDraft(config.assessments[0], challenge); draft.answers.position = option;
      expect(validate(config.assessments[0], challenge, draft)).toEqual({});
    }
  });
  it('accepts one word and exact maxima, preserves over-limit drafts and validates stable option ids', () => {
    expect(wordCount('  one\n two  ')).toBe(2); expect(wordCount('')).toBe(0);
    for (const a of config.assessments) for (const s of a.stages) for (const f of fieldsFor(a, s).filter(f => f.type === 'text')) {
      const draft = validDraft(a, s); draft.answers[f.id] = 'one'; expect(validate(a, s, draft)).toEqual({});
      draft.answers[f.id] = Array(f.maxWords).fill('word').join(' '); expect(validate(a, s, draft)).toEqual({});
      draft.answers[f.id] += ' extra'; expect(validate(a, s, draft)[f.id]).toContain('words or fewer');
    }
    const a = config.assessments[1]; const s = a.stages[2]; const draft = validDraft(a, s); draft.answers.A2_check = 'made-up'; expect(validate(a, s, draft).A2_check).toBe('Choose a listed option.');
  });
  it('restores valid state and resets only incompatible cases and dependent progress', () => {
    const run = completedBattery(); expect(parseRun(JSON.stringify(run), config, 'learner')).toEqual(run);
    run.sessions[config.assessments[3].id].contentVersion = 'old-version';
    const restored = restoreRun(JSON.stringify(run), config, 'learner');
    expect(restored.migrated).toBe(true); expect(restored.run.sessions[config.assessments[0].id]).toEqual(run.sessions[config.assessments[0].id]);
    expect(restored.run.sessions[config.assessments[2].id]).toEqual(run.sessions[config.assessments[2].id]);
    expect(restored.run.sessions[config.assessments[3].id].submitted).toEqual({}); expect(restored.run.intermission).toEqual(run.intermission);
    expect(restoreRun(JSON.stringify({ schemaVersion: 1 }), config, 'learner').run.schemaVersion).toBe(2);
  });
});
