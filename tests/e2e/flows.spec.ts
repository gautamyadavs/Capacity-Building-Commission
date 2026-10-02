import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completedBattery, config, previousConfig, throughStage } from '../helpers';
import { fieldsFor, type Assessment, type Stage } from '../../src/model';
const root = '/bharat-kalp/';
const key = 'bharat-kalp:/bharat-kalp/:v2:learner';
const go = async (page: Page, path: string) => { await page.goto(`${root}#${path}`); await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible(); };
async function accessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
}
async function fillStage(page: Page, a: Assessment, stage: Stage) {
  for (const field of fieldsFor(a, stage)) {
    if (!field.required) continue;
    const container = page.locator(`[data-field-id="${field.id}"]`);
    if (field.type === 'choice') await container.getByRole('radio').first().check();
    else await container.getByRole('textbox').fill(`  My submitted reasoning for ${field.label}.\nI will examine outcomes before changing course.  `);
  }
}
async function submit(page: Page) {
  await page.getByRole('button', { name: 'Submit and continue' }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toContainText(config.confirmation);
  await dialog.getByRole('button', { name: 'Submit and lock', exact: true }).click(); await expect(dialog).not.toBeVisible();
}
function stateFor(page: Page) { return page.evaluate(storageKey => {
  const run = JSON.parse(localStorage.getItem(storageKey)!);
  for (const [aid, session] of Object.entries(run.sessions) as [string, { draft: { stageId: string } | null }][]) {
    const journal = JSON.parse(localStorage.getItem(`${storageKey}:draft:${run.runId}:${aid}`) || 'null');
    if (journal && session.draft?.stageId === journal.stageId) session.draft = journal;
  }
  return run;
}, key); }
async function noFeedback(page: Page) {
  await expect(page.locator('[data-feedback-id]')).toHaveCount(0);
  await expect(page.getByText('Best-supported answer:', { exact: true })).toHaveCount(0);
  for (const q of config.assessments[1].stages[4].selectedResponses) {
    for (const text of Object.values(q.feedbackByOption)) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  }
}

test('two episodes: immutable originals, review amendments, pause/resume and gated feedback', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await go(page, '/learner'); await expect(page.getByRole('heading', { name: 'Practise governance decisions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: config.assessments[0].title })).toBeVisible();
  await expect(page.getByRole('heading', { name: config.assessments[1].title })).toBeVisible();
  await expect(page.getByRole('link', { name: /Reviewer/ })).toHaveCount(0);
  await go(page, `/learner/assessment/${config.assessments[1].id}`); await expect(page.getByRole('heading', { name: 'This case is not available yet' })).toBeVisible();
  for (const [index, a] of config.assessments.entries()) {
    await go(page, `/learner/assessment/${a.id}`); await page.getByRole('button', { name: 'Begin case' }).click();
    for (const [i, stage] of a.stages.entries()) {
      const path = `/learner/assessment/${a.id}/stage/${stage.id}`;
      await expect(page).toHaveURL(new RegExp(`/stage/${stage.id}$`));
      await expect(page.getByRole('region', { name: 'Current task' })).toContainText(stage.task!);
      // Neither future case facts, coaching nor evidence-check options scaffold an open response.
      for (const future of a.stages.slice(i + 1)) {
        for (const text of [...future.information, ...future.groups.flatMap(g => g.paragraphs), ...future.selectedResponses.map(q => q.prompt)]) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
        await go(page, `/learner/assessment/${a.id}/stage/${future.id}`);
        await expect(page.getByRole('heading', { name: 'This stage is not available yet' })).toBeVisible();
        await noFeedback(page);
        await go(page, path);
      }
      if (stage.kind === 'predict') {
        await expect(page.getByRole('region', { name: 'Prediction 1', exact: true })).toBeVisible(); await expect(page.getByRole('region', { name: 'Prediction 2', exact: true })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Prediction 3', exact: true })).toHaveCount(0);
        await expect(page.getByText('Simulated outcomes', { exact: true })).toHaveCount(0);
      }
      if (stage.kind === 'revise') {
        await expect(page.getByRole('form', { name: 'Stage response' })).toContainText('supplied 48-hour response package');
        const facts = page.getByRole('region', { name: 'Case information', exact: true });
        for (const fact of a.stages[0].groups.find(g => g.title === '48-hour response package')!.paragraphs) await expect(facts.getByText(fact, { exact: true }).first()).toBeVisible();
      }
      if (stage.kind === 'review') {
        await expect(page.getByRole('region', { name: 'Case commentary' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Case commentary' })).toContainText('has not automatically evaluated your response');
        await expect(page.getByRole('textbox')).toHaveCount(1);
        await expect(page.getByText('0 / 100 words · maximum', { exact: true })).toBeVisible();
        await expect(page.locator('[data-feedback-id]')).toHaveCount(index === 0 ? 0 : 3);
        await go(page, '/learner/review'); await expect(page.getByRole('heading', { name: 'Your final review is still locked' })).toBeVisible(); await noFeedback(page);
        if (index === 0) { await go(page, `/learner/assessment/${config.assessments[1].id}`); await expect(page.getByRole('heading', { name: 'This case is not available yet' })).toBeVisible(); }
        await go(page, path);
      } else await noFeedback(page);
      await fillStage(page, a, stage); await accessible(page);
      for (const textarea of await page.getByRole('textbox').all()) {
        expect(await textarea.getAttribute('spellcheck')).toBeNull();
        expect(await textarea.evaluate(el => (el as HTMLTextAreaElement).spellcheck)).toBe(true);
      }
      if (['predict', 'compare', 'revise', 'review'].includes(stage.kind)) await page.screenshot({ path: testInfo.outputPath(`${a.shortId}-${stage.kind}.png`), fullPage: true });
      const before = await stateFor(page); const draft = before.sessions[a.id].draft;
      // A refresh before the debounce retains the run-scoped draft, including amendments.
      await page.reload(); await expect(page.getByRole('button', { name: 'Submit and continue' })).toBeVisible();
      for (const field of fieldsFor(a, stage)) {
        const container = page.locator(`[data-field-id="${field.id}"]`);
        if (field.type === 'text') await expect(container.getByRole('textbox')).toHaveValue(draft.answers[field.id]);
        else await expect(container.getByRole('radio').first()).toBeChecked();
      }
      await submit(page); const after = page.url(); const saved = (await stateFor(page)).sessions[a.id]; expect(saved.submitted[stage.id].answers).toEqual(draft.answers);
      expect(Object.fromEntries(Object.entries(saved.submitted).filter(([id]) => id !== stage.id))).toEqual(before.sessions[a.id].submitted);
      if (stage.kind === 'evidence') {
        await expect(page).toHaveURL(/\/stage\/B1_review$/);
        await expect(page.locator('[data-feedback-id]')).toHaveCount(3);
      }
      await go(page, path); await expect(page.locator('textarea,input')).toHaveCount(0); await expect(page.getByText('▣ Submitted and locked', { exact: true }).first()).toBeVisible();
      if (stage.kind !== 'review') await noFeedback(page);
      await page.reload(); await expect(page.locator('textarea,input')).toHaveCount(0); await page.goto(after);
    }
    if (index === 0) {
      await expect(page).toHaveURL(/#\/learner\/intermission$/); await expect(page.getByRole('heading', { name: config.intermission.heading })).toBeVisible();
      await expect(page.getByText(config.intermission.body)).toBeVisible(); await accessible(page); await page.screenshot({ path: testInfo.outputPath('intermission.png'), fullPage: true });
      await page.getByRole('link', { name: 'Return to assessment home' }).click(); await page.reload();
      await page.getByRole('link', { name: 'Continue assessment' }).click(); await expect(page.getByRole('heading', { name: config.intermission.heading })).toBeVisible();
      await go(page, `/learner/assessment/${config.assessments[1].id}`); await expect(page.getByRole('heading', { name: 'This case is not available yet' })).toBeVisible();
      await go(page, '/learner/intermission'); await page.getByRole('button', { name: 'Continue to Episode 2' }).click(); await expect(page).toHaveURL(new RegExp(`/assessment/${config.assessments[1].id}$`));
    }
  }
  await expect(page).toHaveURL(/#\/learner\/review$/); await expect(page.getByRole('heading', { name: config.finalReview.heading })).toBeVisible(); await expect(page.locator('[data-feedback-id]')).toHaveCount(3);
  for (const q of config.assessments[1].stages[4].selectedResponses) {
    await expect(page.locator(`[data-feedback-id="${q.id}"]`)).toHaveCount(1);
    await expect(page.getByText(q.feedbackByOption.A, { exact: true })).toHaveCount(1);
  }
  await expect(page.locator('[data-trail-id]')).toHaveCount(2);
  for (const trail of await page.locator('[data-trail-id]').all()) await trail.locator(':scope > summary').click();
  for (const detail of await page.locator('[data-trail-id] details').all()) { if (!(await detail.evaluate(el => (el as HTMLDetailsElement).open))) await detail.locator(':scope > summary').click(); }
  await expect(page.getByRole('textbox')).toHaveCount(1); await expect(page.getByText('Your review amendment (unscored)', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Critical assumption or dependency', { exact: true })).toHaveCount(1);
  expect(await page.locator('main').innerText()).not.toMatch(/overall score|total score|competency profile|KCM|KQF|rubric|sample answer|reviewer note|validated/i);
  await accessible(page); await page.screenshot({ path: testInfo.outputPath('final-review.png'), fullPage: true });
  const reflection = page.getByRole('textbox'); expect(await reflection.getAttribute('spellcheck')).toBeNull(); expect(await reflection.evaluate(el => (el as HTMLTextAreaElement).spellcheck)).toBe(true);
  await reflection.fill('  I kept observations separate from inferences.\nI revised proportionately.  '); await page.reload(); await expect(page.getByRole('textbox')).toHaveValue('  I kept observations separate from inferences.\nI revised proportionately.  ');
  await page.getByRole('button', { name: 'Submit optional reflection' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Save and lock reflection', exact: true }).click(); await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.reload(); await expect(page.getByText('▣ Reflection saved and locked')).toBeVisible();
});

test('word boundaries, keyboard modal focus, browser history and stale-tab locking', async ({ page, context }) => {
  const a = config.assessments[0]; await go(page, `/learner/assessment/${a.id}`); await page.getByRole('button', { name: 'Begin case' }).click();
  await page.getByRole('button', { name: 'Submit and continue' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); const input = page.getByRole('textbox'); await expect(input).toBeFocused();
  await input.fill(Array(201).fill('word').join(' ')); await page.getByRole('button', { name: 'Submit and continue' }).click(); await expect(input).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await input.fill(Array(200).fill('word').join(' ')); await page.getByRole('button', { name: 'Submit and continue' }).click(); await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  const second = await context.newPage(); await go(second, `/learner/assessment/${a.id}/stage/${a.stages[0].id}`); await submit(page); await expect(second.locator('textarea,input')).toHaveCount(0);
  await page.goBack(); await expect(page.locator('textarea,input')).toHaveCount(0);
});

test('review amendment limits and stale tabs preserve original reasoning', async ({ page, context }) => {
  const a = config.assessments[1]; const run = throughStage(1, 5); const originals = run.sessions[a.id].submitted;
  await go(page, '/learner'); await page.evaluate(({ storageKey, state }) => localStorage.setItem(storageKey, JSON.stringify(state)), { storageKey: key, state: run });
  await page.reload();
  await go(page, `/learner/assessment/${a.id}/stage/B1_review`); await expect(page.locator('[data-feedback-id]')).toHaveCount(3);
  const input = page.getByRole('textbox'); await input.fill(Array(101).fill('word').join(' ')); await page.getByRole('button', { name: 'Submit and continue' }).click();
  await expect(input).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await input.fill(Array(100).fill('word').join(' '));
  const second = await context.newPage(); await go(second, `/learner/assessment/${a.id}/stage/B1_review`);
  await expect(second.getByRole('textbox')).toHaveValue(Array(100).fill('word').join(' '));
  await submit(page); await expect(page).toHaveURL(/#\/learner\/review$/); await expect(second.getByRole('textbox')).toHaveCount(0);
  const state = await stateFor(page); expect(Object.fromEntries(Object.entries(state.sessions[a.id].submitted).filter(([id]) => id !== 'B1_review'))).toEqual(originals);
  await second.reload(); await expect(second.getByRole('textbox')).toHaveCount(0); await expect(second.locator('[data-feedback-id]')).toHaveCount(3);
});

test('hash routing, old routes, legacy state and responsive workspace accessibility', async ({ page }, testInfo) => {
  await go(page, '/reviewer'); await expect(page).toHaveURL(/#\/learner$/); await expect(page.getByRole('link', { name: /Reviewer/ })).toHaveCount(0);
  await go(page, '/learner/format/A/debrief'); await expect(page.getByRole('heading', { name: 'Your final review is still locked' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('bharat-kalp:/bharat-kalp/:v1:learner', JSON.stringify({ schemaVersion: 1, sessions: { old: { submitted: {} } } })));
  await go(page, '/learner'); await page.reload(); await expect(page.getByText(/Incompatible case progress has been restarted/)).toBeVisible();
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await go(page, '/learner'); expect(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true); await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`workspace-${width}.png`), fullPage: true });
  }
  const run = throughStage(1, 3);
  await page.evaluate(({ storageKey, state }) => localStorage.setItem(storageKey, JSON.stringify(state)), { storageKey: key, state: run });
  await page.reload();
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await go(page, `/learner/assessment/${config.assessments[1].id}/stage/B1_revise`);
    await expect(page.getByRole('region', { name: 'Current task' })).toHaveCSS('position', width > 850 ? 'sticky' : 'static');
    await expect(page.getByRole('form', { name: 'Stage response' })).toHaveCSS('position', 'static');
    expect(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true); await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`revision-${width}.png`), fullPage: true });
  }
});

test('four-case migration backs up old data, resets changed content and removes obsolete sessions and journals', async ({ page }) => {
  const oldRun = completedBattery(previousConfig); const raw = JSON.stringify(oldRun);
  const stale = { stageId: 'A1_initial', answers: { reasoning: 'An incompatible old draft' }, cardOrder: [], updatedAt: '2099-01-01T00:00:00.000Z' };
  await go(page, '/learner');
  await page.evaluate(({ storageKey, runId, value, journal }) => {
    localStorage.setItem(storageKey, value);
    localStorage.setItem(`${storageKey}:draft:${runId}:A1_FLOOD`, JSON.stringify(journal));
    localStorage.setItem(`${storageKey}:draft:${runId}:A2_LPG`, JSON.stringify(journal));
  }, { storageKey: key, runId: oldRun.runId, value: raw, journal: stale });
  await page.reload(); await expect(page.getByText(/Incompatible case progress has been restarted/)).toBeVisible();
  const restored = await stateFor(page); expect(Object.keys(restored.sessions)).toEqual(config.assessments.map(a => a.id));
  for (const a of config.assessments) expect(restored.sessions[a.id]).toEqual({ contentVersion: a.contentVersion, startedAt: null, draft: null, submitted: {} });
  expect(restored.intermission).toEqual({ seenAt: null, continuedAt: null });
  expect(await page.evaluate(({ storageKey, runId }) => localStorage.getItem(`${storageKey}:backup:${runId}`), { storageKey: key, runId: oldRun.runId })).toBe(raw);
  for (const aid of ['A1_FLOOD', 'A2_LPG']) {
    expect(await page.evaluate(({ storageKey, runId, id }) => localStorage.getItem(`${storageKey}:draft:${runId}:${id}`), { storageKey: key, runId: oldRun.runId, id: aid })).toBeNull();
    expect(await page.evaluate(({ storageKey, runId, id }) => localStorage.getItem(`${storageKey}:backup:${runId}:draft:${id}`), { storageKey: key, runId: oldRun.runId, id: aid })).toBe(JSON.stringify(stale));
  }
  await page.getByRole('link', { name: 'Start assessment', exact: false }).click(); await expect(page).toHaveURL(/#\/learner\/assessment\/A1_FLOOD$/);
  await page.getByRole('button', { name: 'Begin case' }).click(); await expect(page.getByRole('textbox')).toBeEmpty();
  await page.reload(); await expect(page.getByRole('textbox')).toBeEmpty(); await accessible(page);
});
