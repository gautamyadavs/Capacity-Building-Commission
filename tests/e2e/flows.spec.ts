import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {config} from '../helpers';
import {fieldsFor,type Stage} from '../../src/model';

const root='/bharat-kalp/';
const go=async(page:Page,path:string)=>{await page.goto(`${root}#${path}`);await expect(page.getByRole('navigation',{name:'Experience mode'})).toBeVisible();};
async function accessible(page:Page) {
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}))).toEqual([]);
}
async function fillStage(page:Page,stage:Stage) {
  for(const field of fieldsFor(config,stage)) {
    if(!field.required)continue;
    const container=page.locator(`[data-field-id="${field.id}"]`);
    if(field.type==='choice')await container.getByRole('radio',{name:field.options![0],exact:true}).check();
    else await container.getByRole('textbox').fill(`  My submitted reasoning for ${field.label}.\nI will examine evidence before changing course.  `);
  }
}
async function submit(page:Page) {
  await page.getByRole('button',{name:'Submit and continue'}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText(config.confirmation);
  await dialog.getByRole('button',{name:'Submit and lock',exact:true}).click();await expect(dialog).not.toBeVisible();
}
async function finishCase(page:Page,aid:string,mode='learner') {
  const a=config.assessments.find(a=>a.id===aid)!;
  await go(page,`/${mode}/assessment/${aid}`);await page.getByRole('button',{name:'Begin assessment'}).click();
  for(const s of a.stages){await expect(page).toHaveURL(new RegExp(`/stage/${s.id}$`));await fillStage(page,s);await submit(page);}
  await expect(page.getByRole('heading',{name:'Your responses are submitted.'})).toBeVisible();
}

for(const a of config.assessments)test(`${a.id}: full flow, exact snapshots, refresh and future gates`,async({page})=>{
  await go(page,`/learner/assessment/${a.id}`);
  const firstFact=a.stages[0].information[0];await expect(page.getByText(firstFact,{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Begin assessment'}).click();
  await expect(page.getByText(firstFact,{exact:true})).toBeVisible();
  for(const [i,stage]of a.stages.entries()) {
    for(const future of a.stages.slice(i+1))for(const text of [...future.information,...future.reviewerNotes])await expect(page.getByText(text,{exact:true})).toHaveCount(0);
    if(i===0){
      const future=a.stages[1];await go(page,`/learner/assessment/${a.id}/stage/${future.id}`);await expect(page.getByRole('heading',{name:'This stage is not available yet'})).toBeVisible();await expect(page.getByText(future.information[0],{exact:true})).toHaveCount(0);
      await go(page,`/learner/assessment/${a.id}/stage/${stage.id}`);
    }
    await fillStage(page,stage);
    await accessible(page);
    if(stage.kind==='predict')await page.getByRole('button',{name:`Move ${config.cards[2].label} up`,exact:true}).click();
    // Before the autosave debounce elapses, reload must retain the latest edit.
    await page.reload();await expect(page.getByRole('button',{name:'Submit and continue'})).toBeVisible();
    const first=fieldsFor(config,stage).find(f=>f.type==='text'&&f.required)!;
    await expect(page.locator(`[data-field-id="${first.id}"]`).getByRole('textbox')).not.toBeEmpty();
    await page.getByRole('button',{name:'Submit and continue'}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('textbox').first()).toBeEditable();
    await submit(page);
    const after=page.url();
    await go(page,`/learner/assessment/${a.id}/stage/${stage.id}`);await expect(page.locator('textarea,input')).toHaveCount(0);
    await expect(page.getByText('▣ Submitted and locked',{exact:true}).first()).toBeVisible();
    await page.reload();await expect(page.locator('textarea,input')).toHaveCount(0);
    await page.goto(after);
  }
  await expect(page.getByRole('heading',{name:'Your responses are submitted.'})).toBeVisible();
  await expect(page.getByText('The developmental debrief unlocks after both assessments are complete.')).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download session JSON'}).click();expect((await download).suggestedFilename()).toContain(a.id);
  await go(page,`/learner/format/${a.format}/debrief`);await expect(page.getByRole('heading',{name:'Your debrief is still locked'})).toBeVisible();
});

for(const fid of ['A','B'])test(`Format ${fid}: paired completion unlocks exact trail and optional reflections`,async({page})=>{
  const assessments=config.assessments.filter(a=>a.format===fid);for(const a of assessments)await finishCase(page,a.id);
  await page.getByRole('link',{name:'Open developmental debrief'}).click();await expect(page.getByRole('heading',{name:fid==='A'?'Your Decision Trail':'Your Prediction Trail'})).toBeVisible();
  const format=config.formats.find(f=>f.id===fid)!;for(const f of format.debrief.fields)await expect(page.getByLabel(f.label,{exact:false})).toBeVisible();
  await accessible(page);
  await page.getByRole('button',{name:`Complete Format ${fid}`}).click();await expect(page.getByRole('status').filter({hasText:`Format ${fid} complete`})).toBeVisible();
  await page.getByRole('textbox').first().fill('My developmental reflection stays separate.');await page.reload();await expect(page.getByRole('textbox').first()).toHaveValue('My developmental reflection stays separate.');
});

test('reviewer previews and sandbox reset never unlock or change learner state',async({page})=>{
  await go(page,'/learner/assessment/A1_FLOOD');await page.getByRole('button',{name:'Begin assessment'}).click();await page.locator('[data-field-id="field1"] textarea').fill('Original learner draft');await expect(page.getByRole('status')).toHaveText('● Saved');
  await page.getByRole('navigation',{name:'Experience mode'}).getByRole('link',{name:'Reviewer',exact:true}).click();await go(page,'/reviewer/preview/A1_FLOOD/A1_stage3');await expect(page.getByText(config.assessments[0].stages[2].information[0],{exact:true})).toBeVisible();await expect(page.getByText(config.assessments[0].stages[2].reviewerNotes[0],{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Submit and continue'})).toHaveCount(0);
  await go(page,'/reviewer');await page.getByRole('button',{name:'Reset reviewer demo',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Reset reviewer demo',exact:true}).click();
  await go(page,'/learner/assessment/A1_FLOOD/stage/A1_stage1');await expect(page.locator('[data-field-id="field1"] textarea')).toHaveValue('Original learner draft');await expect(page.getByText(config.assessments[0].stages[2].information[0],{exact:true})).toHaveCount(0);
});

test('live word limits, empty submission and keyboard modal focus',async({page})=>{
  await go(page,'/learner/assessment/A1_FLOOD');await page.getByRole('button',{name:'Begin assessment'}).click();await page.getByRole('button',{name:'Submit and continue'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('[data-field-id="field1"] textarea')).toBeFocused();
  await fillStage(page,config.assessments[0].stages[0]);const input=page.locator('[data-field-id="field1"] textarea');await input.fill(Array(121).fill('word').join(' '));await page.getByRole('button',{name:'Submit and continue'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(input).toHaveAttribute('aria-invalid','true');await input.fill(Array(120).fill('word').join(' '));await page.getByRole('button',{name:'Submit and continue'}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Cancel'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('browser back and a second open tab cannot restore editing',async({page,context})=>{
  await go(page,'/learner/assessment/A1_FLOOD');await page.getByRole('button',{name:'Begin assessment'}).click();await fillStage(page,config.assessments[0].stages[0]);const second=await context.newPage();await go(second,'/learner/assessment/A1_FLOOD/stage/A1_stage1');await submit(page);await expect(second.locator('textarea,input')).toHaveCount(0);await page.goBack();await expect(page.locator('textarea,input')).toHaveCount(0);
});

test('learner reset clears only the named mode and relocks debriefs',async({page})=>{
  await finishCase(page,'A1_FLOOD','reviewer');await finishCase(page,'A1_FLOOD');await page.getByRole('button',{name:'Reset demo',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Reset learner demo',exact:true}).click();await expect(page).toHaveURL(/#\/learner$/);await go(page,'/learner/assessment/A1_FLOOD');await expect(page.getByRole('button',{name:'Begin assessment'})).toBeVisible();await go(page,'/reviewer/assessment/A1_FLOOD/complete');await expect(page.getByRole('heading',{name:'Your responses are submitted.'})).toBeVisible();
});

test('responsive layouts and automated accessibility checks',async({page},testInfo)=>{
  for(const width of [1440,834,390]) {
    await page.setViewportSize({width,height:1000});await go(page,'/learner');await expect(page.getByRole('heading',{name:/Judgement/})).toBeVisible();
    expect(await page.locator('body').evaluate(el=>el.scrollWidth <= window.innerWidth)).toBe(true);
    await accessible(page);
    await page.screenshot({path:testInfo.outputPath(`landing-${width}.png`),fullPage:true});
  }
  await go(page,'/learner/assessment/B1_AIR_POE');await page.getByRole('button',{name:'Begin assessment'}).click();await accessible(page);
  expect(await page.locator('body').evaluate(el=>el.scrollWidth <= window.innerWidth)).toBe(true);
});
