import { describe, it, expect } from 'vitest';
import { ConfigSchema, assessmentAvailable, batteryComplete, createRun, currentStage, feedbackAvailable, fieldsFor, intermissionDue, parseRun, reasoningComplete, restoreRun, resumePath, submitStage, validate, wordCount } from '../src/model';
import { beforeCase, complete, completedBattery, config, preAuditConfig, previousConfig, started, throughStage, validDraft } from './helpers';

describe('two-case learning content', () => {
  it('retains the substantive skeleton and appends one gated review per episode', () => {
    expect(config.assessments.map(a => a.shortId)).toEqual(['A1', 'B1']);
    expect(config.assessments.map(a => a.stages.map(s => s.id))).toEqual([
      ['A1_initial', 'A1_execution', 'A1_update', 'A1_challenge', 'A1_review'],
      ['B1_predict', 'B1_compare', 'B1_explain', 'B1_revise', 'B1_checks', 'B1_review'],
    ]);
    for (const a of config.assessments) {
      const review = a.stages.at(-1)!;
      expect(review).toMatchObject({ kind: 'review', title: 'Review your reasoning', selectedResponses: [], requires: a.stages.slice(0, -1).map(s => s.id) });
      expect(review.fields).toEqual([{ id: 'amendment', label: 'Your review amendment', prompt: 'Choose one part of your submitted response that you would improve after this review. Rewrite that part, then state briefly what changed in your reasoning.', type: 'text', required: true, unscored: true, maxWords: 100 }]);
      expect(review.groups.filter(g => /defensible approach/.test(g.title))).toHaveLength(2);
      expect(a.stages.every(s => !!s.task && !!s.rationale)).toBe(true);
      const old = previousConfig.assessments.find(old => old.id === a.id)!;
      expect(a.stages.slice(0, -1).map(s => s.fields.map(f => f.maxWords))).toEqual(old.stages.map(s => s.fields.map(f => f.maxWords)));
      expect(a.contentVersion).not.toBe(old.contentVersion);
    }
    expect(config.contentVersion).toBe('learning-pilot-2026-10-01-v3');
    expect(config.guidance.join(' ')).toContain('You may answer in bullet points.');
  });
  it('keeps two prediction cards, confidence and comparison choices unscored, and every maximum', () => {
    const a = config.assessments[1];
    expect(a.predictions!.cards.map(c => c.label)).toEqual(['Prediction 1', 'Prediction 2']);
    expect(a.predictions!.fields.map(f => [f.id, f.maxWords])).toEqual([['prediction', 35], ['why', 60], ['confidence', undefined]]);
    expect(a.predictions!.fields.find(f => f.id === 'confidence')).toMatchObject({ required: true, unscored: true });
    expect(a.predictions!.evidenceMaxWords).toBe(35);
    expect(a.stages[0].fields[0].maxWords).toBe(60);
    expect(a.stages[2].fields.map(f => f.maxWords)).toEqual([120, 150]);
    expect(a.stages[3].fields[0].maxWords).toBe(180);
    expect(fieldsFor(a, a.stages[1]).filter(f => f.type === 'choice').every(f => f.unscored)).toBe(true);
    expect(config.assessments[0].stages[3].fields[0]).toMatchObject({ id: 'position', unscored: true, options: [{ id: 'Maintain' }, { id: 'Modify' }, { id: 'Reverse' }] });
    expect(config.finalReview.reflection).toMatchObject({ required: false, maxWords: 150 });
  });
  it('preserves all group facts, uncertainty, challenges, notes and the three original MCQs', () => {
    for (const a of config.assessments) {
      const old = previousConfig.assessments.find(old => old.id === a.id)!;
      for (const [i, stage] of a.stages.slice(0, -1).entries()) {
        const previous = old.stages[i];
        for (const group of previous.groups) for (const fact of group.paragraphs) {
          const displayed = [...stage.groups.flatMap(g => g.paragraphs), ...(stage.timeline?.map(t => t.text) || [])];
          expect(displayed).toContain(fact);
        }
        expect(stage.note).toEqual(previous.note);
        if (i > 0) expect(stage.information).toEqual(previous.information);
        expect(stage.selectedResponses).toEqual(previous.selectedResponses.map(q => ({ ...q, deferFeedbackUntilBatteryComplete: false })));
      }
    }
    const flood = config.assessments[0].stages[0];
    expect(flood.timeline).toEqual([{ label: 'Current time', text: '07:00, after seven hours of intense rainfall.' }, { label: 'Immediate window', text: 'Next 6 hours: lead emergency transport coordination.' }, { label: 'Planning horizon', text: 'Following 72 hours: set direction for continuity.' }]);
    expect(flood.information).toEqual(previousConfig.assessments[0].stages[0].information.slice(1));
    const air = config.assessments[1];
    expect(air.stages[1].groups[0].title).toBe('Simulated outcomes');
    expect(air.stages[3].fields[0].prompt).toContain('supplied 48-hour response package');
    expect(air.stages[3].focusContext).toContainEqual({ stageId: 'B1_predict', groupTitles: ['48-hour response package'] });
    const checks = air.stages.flatMap(s => s.selectedResponses);
    expect(checks).toHaveLength(3); expect(checks.map(q => q.correctOptionId)).toEqual(['B', 'A', 'C']);
  });
  it('rejects broken prerequisites, early or incomplete reviews, bad context, tables and feedback', () => {
    const badGraph = structuredClone(config); badGraph.assessments[0].stages[1].requires = [];
    const earlyReview = structuredClone(config); earlyReview.assessments[0].stages.reverse();
    const missingPrerequisite = structuredClone(config); missingPrerequisite.assessments[0].stages.at(-1)!.requires = ['A1_challenge'];
    const scoredReview = structuredClone(config); scoredReview.assessments[0].stages.at(-1)!.fields[0].unscored = false;
    const wrongMaximum = structuredClone(config); wrongMaximum.assessments[0].stages.at(-1)!.fields[0].maxWords = 150;
    const noReview = structuredClone(config); noReview.assessments[1].stages.pop();
    const badContext = structuredClone(config); badContext.assessments[1].stages[3].focusContext![0].groupTitles = ['Unknown package'];
    const futureContext = structuredClone(config); futureContext.assessments[1].stages[0].focusContext = [{ stageId: 'B1_compare', groupTitles: ['Simulated outcomes'] }];
    const badTable = structuredClone(config); badTable.assessments[0].stages[0].groups[0].rowLabels = [];
    const missingFeedback = structuredClone(config); missingFeedback.assessments[1].stages[4].selectedResponses[0].feedbackByOption = {};
    for (const invalid of [badGraph, earlyReview, missingPrerequisite, scoredReview, wrongMaximum, noReview, badContext, futureContext, badTable, missingFeedback]) expect(ConfigSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('learning sequence and immutable submissions', () => {
  it('requires the first amendment and explicit continuation before episode two', () => {
    const a = config.assessments[0]; let run = throughStage(0, 4);
    expect(reasoningComplete(a, run.sessions[a.id])).toBe(true);
    expect(intermissionDue(config, run)).toBe(false); expect(assessmentAvailable(config, run, config.assessments[1].id)).toBe(false);
    expect(run.intermission.seenAt).toBeNull(); expect(currentStage(a, run.sessions[a.id])!.id).toBe('A1_review');
    run = submitStage(config, run, a.id, 'A1_review', validDraft(a, a.stages[4]));
    expect(intermissionDue(config, run)).toBe(true); expect(resumePath(config, run)).toBe('/learner/intermission');
    expect(assessmentAvailable(config, run, config.assessments[1].id)).toBe(false);
    run.intermission.continuedAt = new Date().toISOString();
    expect(assessmentAvailable(config, run, config.assessments[1].id)).toBe(true);
  });
  it.each([0, 1])('gates review until every substantive stage is locked in episode %i', index => {
    const a = config.assessments[index]; const review = a.stages.at(-1)!; let run = started(index);
    for (const s of a.stages.slice(0, -1)) {
      expect(() => submitStage(config, run, a.id, review.id, validDraft(a, review))).toThrow('no longer editable');
      run = submitStage(config, run, a.id, s.id, validDraft(a, s));
    }
    expect(currentStage(a, run.sessions[a.id])!.id).toBe(review.id);
    const originals = structuredClone(run.sessions[a.id].submitted);
    const amendment = validDraft(a, review);
    run = submitStage(config, run, a.id, review.id, amendment);
    for (const [id, snap] of Object.entries(originals)) expect(run.sessions[a.id].submitted[id]).toEqual(snap);
    expect(run.sessions[a.id].submitted[review.id].answers).toEqual({ amendment: amendment.answers.amendment });
    expect(() => submitStage(config, run, a.id, review.id, amendment)).toThrow('no longer editable');
  });
  it('locks predictions, open explanations and revision before objective checks', () => {
    const a = config.assessments[1]; let run = started(1);
    expect(currentStage(a, run.sessions[a.id])!.kind).toBe('predict');
    expect(() => submitStage(config, run, a.id, a.stages[1].id, validDraft(a, a.stages[1]))).toThrow('no longer editable');
    for (const s of a.stages.slice(0, 4)) {
      expect(() => submitStage(config, run, a.id, 'B1_checks', validDraft(a, a.stages[4]))).toThrow('no longer editable');
      run = submitStage(config, run, a.id, s.id, validDraft(a, s));
    }
    expect(currentStage(a, run.sessions[a.id])!.kind).toBe('evidence');
  });
  it('releases feedback only after all reasoning and checks, before the review amendment', () => {
    const a = config.assessments[1]; const questions = a.stages[4].selectedResponses;
    for (let count = 0; count < 5; count++) {
      const run = throughStage(1, count);
      expect(questions.every(q => !feedbackAvailable(config, run, a, q))).toBe(true);
    }
    const run = throughStage(1, 5);
    expect(batteryComplete(config, run)).toBe(false);
    expect(questions.every(q => feedbackAvailable(config, run, a, q))).toBe(true);
    const incomplete = structuredClone(run); delete incomplete.sessions[a.id].submitted.B1_checks.answers.B1_check3;
    expect(reasoningComplete(a, incomplete.sessions[a.id])).toBe(false);
    expect(questions.every(q => !feedbackAvailable(config, incomplete, a, q))).toBe(true);
    expect(feedbackAvailable(config, run, a, { ...questions[0], deferFeedbackUntilBatteryComplete: true })).toBe(false);
    expect(feedbackAvailable(config, completedBattery(), a, { ...questions[0], deferFeedbackUntilBatteryComplete: true })).toBe(true);
  });
  it('deep-copies exact responses and rejects repeat submission', () => {
    const a = config.assessments[0]; const s = a.stages[0]; const draft = validDraft(a, s); const exact = draft.answers.response;
    const next = submitStage(config, started(), a.id, s.id, draft); draft.answers.response = 'Retrospective change';
    expect(next.sessions[a.id].submitted[s.id].answers.response).toBe(exact);
    expect(() => submitStage(config, next, a.id, s.id, draft)).toThrow('no longer editable');
  });
  it('requires both episodes and both amendments before the final review', () => {
    expect(batteryComplete(config, beforeCase(0))).toBe(false); expect(batteryComplete(config, beforeCase(1))).toBe(false);
    expect(batteryComplete(config, throughStage(1, 5))).toBe(false);
    const run = completedBattery(); expect(batteryComplete(config, run)).toBe(true);
    delete run.sessions.B1_AIR_POE.submitted.B1_checks.answers.B1_check3;
    expect(batteryComplete(config, run)).toBe(false);
  });
  it('accepts one word and exact maxima, retains over-limit drafts and validates choices/card order', () => {
    expect(wordCount('  one\n two  ')).toBe(2); expect(wordCount('')).toBe(0);
    for (const a of config.assessments) for (const s of a.stages) for (const f of fieldsFor(a, s).filter(f => f.type === 'text')) {
      const draft = validDraft(a, s); draft.answers[f.id] = 'one'; expect(validate(a, s, draft)).toEqual({});
      draft.answers[f.id] = Array(f.maxWords).fill('word').join(' '); expect(validate(a, s, draft)).toEqual({});
      draft.answers[f.id] += ' extra'; expect(validate(a, s, draft)[f.id]).toContain('words or fewer');
    }
    const a = config.assessments[1]; const s = a.stages[4]; const draft = validDraft(a, s); draft.answers.B1_check1 = 'made-up';
    expect(validate(a, s, draft).B1_check1).toBe('Choose a listed option.');
    draft.cardOrder = ['prediction1', 'prediction1']; expect(validate(a, s, draft).cardOrder).toBeDefined();
    for (const option of ['Maintain', 'Modify', 'Reverse']) {
      const flood = config.assessments[0]; const challenge = flood.stages[3]; const response = validDraft(flood, challenge); response.answers.position = option;
      expect(validate(flood, challenge, response)).toEqual({});
    }
  });
});

describe('version migration and saved-run validation', () => {
  it('preserves compatible earlier progress when only a later case changes', () => {
    const run = completedBattery(); expect(parseRun(JSON.stringify(run), config, 'learner')).toEqual(run);
    run.sessions.B1_AIR_POE.contentVersion = 'old-version';
    const restored = restoreRun(JSON.stringify(run), config, 'learner');
    expect(restored.migrated).toBe(true); expect(restored.run.sessions.A1_FLOOD).toEqual(run.sessions.A1_FLOOD);
    expect(restored.run.sessions.B1_AIR_POE.submitted).toEqual({}); expect(restored.run.intermission).toEqual(run.intermission);
    expect(restored.run.reflection).toEqual({ draft: '', submitted: null, submittedAt: null });
  });
  it.each([0, 1, 2, 3, 4])('migrates an old run with %i completed cases to safe two-episode progress', count => {
    const old = beforeCase(count, previousConfig);
    expect(parseRun(JSON.stringify(old), previousConfig, 'learner')).toEqual(old);
    const { run, migrated } = restoreRun(JSON.stringify(old), config, 'learner');
    expect(migrated).toBe(true); expect(run.runId).toBe(old.runId);
    expect(Object.keys(run.sessions)).toEqual(['A1_FLOOD', 'B1_AIR_POE']);
    for (const a of config.assessments) expect(run.sessions[a.id]).toEqual({ contentVersion: a.contentVersion, startedAt: null, draft: null, submitted: {} });
    expect(run.intermission).toEqual({ seenAt: null, continuedAt: null });
    expect(resumePath(config, run)).toBe('/learner/assessment/A1_FLOOD');
    expect(parseRun(JSON.stringify(run), config, 'learner')).toEqual(run);
  });
  it('resets incompatible old drafts and final reflections and accepts the pre-audit release', () => {
    for (const oldConfig of [previousConfig, preAuditConfig]) {
      const old = completedBattery(oldConfig); old.reflection = { draft: 'Old reflection', submitted: 'Old reflection', submittedAt: new Date().toISOString() };
      const { run } = restoreRun(JSON.stringify(old), config, 'learner');
      expect(run.reflection).toEqual({ draft: '', submitted: null, submittedAt: null }); expect(batteryComplete(config, run)).toBe(false);
      const partial = throughStage(0, 1, oldConfig); partial.sessions.A1_FLOOD.draft!.answers.response = 'Old unfinished response';
      expect(restoreRun(JSON.stringify(partial), config, 'learner').run.sessions.A1_FLOOD.draft).toBeNull();
    }
    expect(restoreRun(JSON.stringify({ schemaVersion: 1 }), config, 'learner').run.schemaVersion).toBe(2);
  });
  it('rejects out-of-order, unknown and malformed saved review state', () => {
    const early = started(); const a = config.assessments[0]; const review = a.stages.at(-1)!;
    early.sessions[a.id].submitted[review.id] = { ...validDraft(a, review), submittedAt: new Date().toISOString() };
    expect(() => parseRun(JSON.stringify(early), config, 'learner')).toThrow('inconsistent');
    const unknown = completedBattery(); unknown.sessions.A2_LPG = unknown.sessions.A1_FLOOD;
    expect(() => parseRun(JSON.stringify(unknown), config, 'learner')).toThrow('incomplete');
    const invalid = completedBattery(); invalid.sessions.A1_FLOOD.submitted.A1_review.answers.amendment = '';
    expect(() => parseRun(JSON.stringify(invalid), config, 'learner')).toThrow('inconsistent');
  });
});
