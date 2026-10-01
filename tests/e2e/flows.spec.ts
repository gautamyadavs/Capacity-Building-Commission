import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completedBattery, config, previousConfig } from '../helpers';
import { fieldsFor, type Assessment, type Stage } from '../../src/model';
const root = '/bharat-kalp/';
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
    else await container.getByRole('textbox').fill(`  My submitted reasoning for ${field.label}.\nI will examine evidence before changing course.  `);
  }
}
async function submit(page: Page) {
  await page.getByRole('button', { name: 'Submit and continue' }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toContainText(config.confirmation);
  await dialog.getByRole('button', { name: 'Submit and lock', exact: true }).click(); await expect(dialog).not.toBeVisible();
}
function stateFor(page: Page) { return page.evaluate(() => {
  const key = 'bharat-kalp:/bharat-kalp/:v2:learner';
  const run = JSON.parse(localStorage.getItem(key)!);
  for (const [aid, session] of Object.entries(run.sessions) as [string, { draft: { stageId: string } | null }][]) {
    const journal = JSON.parse(localStorage.getItem(`${key}:draft:${run.runId}:${aid}`) || 'null');
    if (journal && session.draft?.stageId === journal.stageId) session.draft = journal;
  }
  return run;
}); }

test('complete ordered battery: locks, reloads, intermission, deferred feedback and all trails', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await go(page, '/learner'); await expect(page.getByRole('heading', { name: 'Reason through complex governance decisions.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Reviewer/ })).toHaveCount(0);
  await go(page, `/learner/assessment/${config.assessments[2].id}`); await expect(page.getByRole('heading', { name: 'This case is not available yet' })).toBeVisible();
  for (const [index, a] of config.assessments.entries()) {
    await go(page, `/learner/assessment/${a.id}`); await page.getByRole('button', { name: 'Begin case' }).click();
    for (const [i, stage] of a.stages.entries()) {
      await expect(page).toHaveURL(new RegExp(`/stage/${stage.id}$`));
      for (const future of a.stages.slice(i + 1)) {
        for (const text of [...future.information, ...future.groups.flatMap(g => g.paragraphs), ...future.selectedResponses.map(q => q.prompt)]) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      }
      if (i === 0) {
        const future = a.stages[1]; await go(page, `/learner/assessment/${a.id}/stage/${future.id}`); await expect(page.getByRole('heading', { name: 'This stage is not available yet' })).toBeVisible();
        await go(page, `/learner/assessment/${a.id}/stage/${stage.id}`);
      }
      if (stage.kind === 'predict') {
        await expect(page.getByRole('region', { name: 'Prediction 1', exact: true })).toBeVisible(); await expect(page.getByRole('region', { name: 'Prediction 2', exact: true })).toBeVisible();
        await expect(page.getByText('Primary outcome')).toHaveCount(0); await expect(page.getByText('Prediction 3')).toHaveCount(0);
      }
      if (stage.kind === 'revise' && a.predictions) {
        await go(page, `/learner/assessment/${a.id}/stage/${a.stages[4].id}`); await expect(page.getByRole('heading', { name: 'This stage is not available yet' })).toBeVisible();
        for (const q of a.stages[4].selectedResponses) await expect(page.getByText(q.prompt, { exact: true })).toHaveCount(0);
        await go(page, `/learner/assessment/${a.id}/stage/${stage.id}`);
      }
      if (stage.id === 'A2_update' || stage.id === 'A2_challenge') {
        const check = a.stages[4];
        await expect(page.getByText(check.selectedResponses[0].prompt, { exact: true })).toHaveCount(0);
        for (const option of check.selectedResponses[0].options) await expect(page.getByText(`${option.id}. ${option.label}`, { exact: true })).toHaveCount(0);
        await expect(page.getByRole('form', { name: 'Stage response' }).getByRole('textbox')).toHaveCount(1);
        await expect(page.getByRole('radio')).toHaveCount(stage.id === 'A2_update' ? 0 : 3);
        const future = stage.id === 'A2_update' ? a.stages[3] : check;
        await go(page, `/learner/assessment/${a.id}/stage/${future.id}`);
        await expect(page.getByRole('heading', { name: 'This stage is not available yet' })).toBeVisible();
        await expect(page.getByText(check.selectedResponses[0].prompt, { exact: true })).toHaveCount(0);
        await go(page, `/learner/assessment/${a.id}/stage/${stage.id}`);
      }
      if (stage.id === 'A2_check') {
        await expect(page.getByRole('form', { name: 'Stage response' }).locator('[data-field-id]')).toHaveCount(1);
        await expect(page.getByRole('textbox')).toHaveCount(0); await expect(page.getByRole('radio')).toHaveCount(3);
        await expect(page.getByText(stage.selectedResponses[0].prompt, { exact: true })).toBeVisible();
        await page.getByText('Earlier update', { exact: true }).click();
        for (const fact of a.stages[2].information) await expect(page.getByText(fact, { exact: true })).toBeVisible();
      }
      await fillStage(page, a, stage); await accessible(page);
      for (const textarea of await page.getByRole('textbox').all()) {
        expect(await textarea.getAttribute('spellcheck')).toBeNull();
        expect(await textarea.evaluate(el => (el as HTMLTextAreaElement).spellcheck)).toBe(true);
      }
      for (const q of stage.selectedResponses) {
        await expect(page.getByText('Best-supported answer:', { exact: true })).toHaveCount(0);
        for (const text of Object.values(q.feedbackByOption)) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      }
      if (stage.kind === 'predict' || stage.kind === 'compare') await page.screenshot({ path: testInfo.outputPath(`${a.shortId}-${stage.kind}.png`), fullPage: true });
      const draft = (await stateFor(page)).sessions[a.id].draft;
      // The run-scoped journal retains edits even when refresh beats the debounce.
      await page.reload(); await expect(page.getByRole('button', { name: 'Submit and continue' })).toBeVisible();
      for (const field of fieldsFor(a, stage)) {
        const container = page.locator(`[data-field-id="${field.id}"]`);
        if (field.type === 'text') await expect(container.getByRole('textbox')).toHaveValue(draft.answers[field.id]);
        else await expect(container.getByRole('radio').first()).toBeChecked();
      }
      await submit(page); const after = page.url(); const saved = (await stateFor(page)).sessions[a.id].submitted[stage.id]; expect(saved.answers).toEqual(draft.answers);
      if (stage.id === 'A2_challenge') await expect(page).toHaveURL(/\/stage\/A2_check$/);
      if (stage.id === 'A2_check') {
        await expect(page).toHaveURL(/#\/learner\/intermission$/);
        await expect(page.getByRole('heading', { name: config.intermission.heading })).toBeVisible();
        await expect(page.locator('[data-feedback-id]')).toHaveCount(0);
        for (const text of Object.values(stage.selectedResponses[0].feedbackByOption)) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      }
      await go(page, `/learner/assessment/${a.id}/stage/${stage.id}`); await expect(page.locator('textarea,input')).toHaveCount(0); await expect(page.getByText('▣ Submitted and locked', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Best-supported answer:', { exact: true })).toHaveCount(0);
      for (const q of stage.selectedResponses) for (const text of Object.values(q.feedbackByOption)) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      await page.reload(); await expect(page.locator('textarea,input')).toHaveCount(0); await page.goto(after);
    }
    if (index < 3) {
      await expect(page.getByText(config.completionAcknowledgement)).toBeVisible(); await expect(page.getByText(config.finalReview.guidance)).toHaveCount(0);
      await go(page, '/learner/review'); await expect(page.getByRole('heading', { name: 'Your final review is still locked' })).toBeVisible(); await expect(page.locator('[data-feedback-id]')).toHaveCount(0);
    }
    if (index === 1) {
      await go(page, '/learner/intermission'); await expect(page.getByRole('heading', { name: config.intermission.heading })).toBeVisible(); await expect(page.getByText(config.intermission.body)).toBeVisible();
      await accessible(page); await page.screenshot({ path: testInfo.outputPath('intermission.png'), fullPage: true }); await page.getByRole('link', { name: 'Return to assessment home' }).click();
      await page.reload(); await page.getByRole('link', { name: 'Continue assessment' }).click(); await expect(page.getByRole('heading', { name: config.intermission.heading })).toBeVisible();
      await page.getByRole('button', { name: 'Continue to Case 3' }).click(); await expect(page).toHaveURL(new RegExp(`/assessment/${config.assessments[2].id}$`));
    }
  }
  await expect(page).toHaveURL(/#\/learner\/review$/); await expect(page.getByRole('heading', { name: 'Assessment complete' })).toBeVisible(); await expect(page.locator('[data-feedback-id]')).toHaveCount(7);
  await expect(page.locator('[data-feedback-id="A2_check"]')).toHaveCount(1);
  await expect(page.locator('[data-feedback-id^="B1_"]')).toHaveCount(3); await expect(page.locator('[data-feedback-id^="B2_"]')).toHaveCount(3);
  await expect(page.getByText(config.assessments[1].stages[4].selectedResponses[0].feedbackByOption.A, { exact: true })).toHaveCount(1);
  for (const a of config.assessments) for (const s of a.stages) for (const q of s.selectedResponses) await expect(page.getByText(q.feedbackByOption.A, { exact: true })).toBeVisible();
  await expect(page.locator('[data-trail-id]')).toHaveCount(4); for (const trail of await page.locator('[data-trail-id]').all()) await trail.locator(':scope > summary').click();
  for (const prediction of await page.locator('[data-trail-id] details').all()) { if (!(await prediction.evaluate(el => (el as HTMLDetailsElement).open))) await prediction.locator(':scope > summary').click(); }
  await expect(page.getByRole('textbox')).toHaveCount(1); await expect(page.getByText('Critical assumption or dependency', { exact: true })).toHaveCount(4);
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

test('hash routing, old routes, legacy state and responsive accessibility', async ({ page }, testInfo) => {
  await go(page, '/reviewer'); await expect(page).toHaveURL(/#\/learner$/); await expect(page.getByRole('link', { name: /Reviewer/ })).toHaveCount(0);
  await go(page, '/learner/format/A/debrief'); await expect(page.getByRole('heading', { name: 'Your final review is still locked' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('bharat-kalp:/bharat-kalp/:v1:learner', JSON.stringify({ schemaVersion: 1, sessions: { old: { submitted: {} } } })));
  await go(page, '/learner'); await page.reload(); await expect(page.getByText(/Incompatible case progress has been restarted/)).toBeVisible();
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await go(page, '/learner'); expect(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true); await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Start assessment', exact: false }).click(); await page.getByRole('button', { name: 'Begin case' }).click(); await accessible(page);
  expect(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
});

test('previous four-stage A2 run migrates with A1 retained and dependent progress reset', async ({ page }) => {
  const oldRun = completedBattery(previousConfig); const raw = JSON.stringify(oldRun);
  await go(page, '/learner');
  await page.evaluate(value => localStorage.setItem('bharat-kalp:/bharat-kalp/:v2:learner', value), raw);
  await page.reload(); await expect(page.getByText(/Incompatible case progress has been restarted/)).toBeVisible();
  const restored = await stateFor(page); expect(restored.sessions.A1_FLOOD).toEqual(oldRun.sessions.A1_FLOOD);
  for (const a of config.assessments.slice(1)) expect(restored.sessions[a.id]).toEqual({ contentVersion: a.contentVersion, startedAt: null, draft: null, submitted: {} });
  expect(restored.intermission).toEqual({ seenAt: null, continuedAt: null });
  expect(await page.evaluate(runId => localStorage.getItem(`bharat-kalp:/bharat-kalp/:v2:learner:backup:${runId}`), oldRun.runId)).toBe(raw);
  await page.getByRole('link', { name: 'Continue assessment', exact: false }).click();
  await expect(page).toHaveURL(/#\/learner\/assessment\/A2_LPG$/);
  await expect(page.getByText('Evidence check', { exact: true })).toBeVisible();
  await go(page, '/learner/assessment/A2_LPG/stage/A2_check');
  await expect(page.getByRole('heading', { name: 'This stage is not available yet' })).toBeVisible();
  await go(page, '/learner/assessment/A2_LPG'); await page.getByRole('button', { name: 'Begin case' }).click();
  await expect(page).toHaveURL(/\/stage\/A2_initial$/); await expect(page.getByRole('textbox')).toBeEmpty();
  await page.reload(); await expect(page.getByRole('textbox')).toBeEmpty(); await accessible(page);
});
