import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { ResponseField } from '../src/components/Forms';
import { SubmittedResponsePanel } from '../src/components/Assessment';
import { SelectedResponseFeedback } from '../src/components/Feedback';
import { AppContext } from '../src/context';
import { RunStore } from '../src/persistence';
import { submitStage, type Run } from '../src/model';
import { beforeCase, complete, completedBattery, config, started, throughStage, validDraft } from './helpers';
beforeEach(() => { localStorage.clear(); window.location.hash = '#/learner'; vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function show(path: string, run: Run) {
  window.location.hash = `#${path}`; const initial = new RunStore(config, 'learner'); localStorage.setItem(initial.key, JSON.stringify(run));
  return render(<App config={config} store={new RunStore(config, 'learner')}/>);
}
it('associates validation and live counters with a labelled textarea using default spellcheck', async () => {
  const onChange = vi.fn(); render(<ResponseField field={{ id: 'response', type: 'text', required: true, label: 'Reasoning', prompt: 'Explain the situation.', maxWords: 2 }} value="one two three" onChange={onChange}/>);
  const input = screen.getByRole('textbox', { name: 'Reasoning' }); expect(input).toHaveAttribute('aria-invalid', 'true'); expect(input).toHaveAccessibleDescription(/Use 2 words or fewer/);
  expect(input).not.toHaveAttribute('spellcheck'); expect(screen.getByRole('status')).toHaveTextContent('3 / 2 words · maximum');
  await userEvent.type(input, 'x'); expect(onChange).toHaveBeenCalled();
});
it('preserves exact submitted text without editable controls', () => {
  const a = config.assessments[0]; const stage = a.stages[0]; const draft = validDraft(a, stage);
  const { container } = render(<SubmittedResponsePanel assessment={a} stage={stage} snapshot={{ stageId: stage.id, answers: draft.answers, cardOrder: draft.cardOrder, submittedAt: new Date().toISOString() }}/>);
  expect(container.querySelector('textarea,input')).toBeNull(); expect(container.querySelectorAll('p')[1].textContent).toBe(draft.answers.response); expect(screen.getByText('▣ Submitted and locked')).toBeInTheDocument();
});
it('shows a compact learning workspace, two episodes, one writing guide and pause-at-any-stage copy', () => {
  const { container } = show('/learner', beforeCase(0));
  expect(screen.getByRole('heading', { name: 'Practise governance decisions' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start assessment →' })).toBeInTheDocument(); expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.getByText('0 / 2 episodes complete')).toBeInTheDocument(); expect(screen.getByText('You may answer in bullet points. Writing style is not assessed.')).toBeInTheDocument();
  expect(container.textContent).toContain('pause at any stage'); expect(container.textContent).toContain('bring one lesson into the next');
  expect(container.textContent).not.toMatch(/Reviewer|KCM|KQF|rubric|competency|sample answer|Format A|Format B|SJT|PEOE|four cases/i);
  expect(container.querySelector('a[href*="reviewer"]')).toBeNull();
});
it.each([0, 1])('explains the stage purposes without repeating writing guidance in episode %i', index => {
  const a = config.assessments[index]; const { container } = show(`/learner/assessment/${a.id}`, beforeCase(index));
  expect(screen.getByText(/What you will practise/)).toBeInTheDocument();
  for (const s of a.stages) expect(screen.getByText(s.rationale!)).toBeInTheDocument();
  expect(container.textContent).not.toContain('You may answer in bullet points.'); expect(container.textContent).toContain(`EPISODE ${index + 1} OF 2`);
});
it('renders an accessible timeline and neutral resource tables with the original facts', () => {
  show('/learner/assessment/A1_FLOOD/stage/A1_initial', started());
  expect(screen.getByLabelText('Case timeline')).toHaveTextContent('07:00, after seven hours of intense rainfall.');
  const table = screen.getByRole('table', { name: 'Transport capacity' });
  for (const fact of config.assessments[0].stages[0].groups.find(g => g.title === 'Transport capacity')!.paragraphs) expect(within(table).getByText(fact)).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'Case facts' })).toBeInTheDocument();
});
it('renders exactly two prediction cards and keeps outcomes, checks and coaching absent', () => {
  const a = config.assessments[1]; const { container } = show(`/learner/assessment/${a.id}/stage/B1_predict`, started(1));
  expect(screen.getByRole('region', { name: 'Prediction 1' })).toBeInTheDocument(); expect(screen.getByRole('region', { name: 'Prediction 2' })).toBeInTheDocument();
  expect(screen.queryByText('Prediction 3')).toBeNull(); expect(container.textContent).not.toMatch(/Primary outcome|System response|Secondary consequence/);
  for (const s of [a.stages[1], a.stages[5]]) for (const p of s.groups.flatMap(g => g.paragraphs)) expect(screen.queryByText(p)).toBeNull();
  for (const q of a.stages[4].selectedResponses) expect(screen.queryByText(q.prompt)).toBeNull();
});
it('keeps earlier submissions read-only in expandable references while the next response is editable', async () => {
  const a = config.assessments[0]; const run = throughStage(0, 1);
  show(`/learner/assessment/${a.id}/stage/A1_execution`, run);
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  await userEvent.click(screen.getByText('Earlier briefings and locked responses'));
  expect(screen.getByRole('region', { name: 'Previously submitted responses' }).querySelector('textarea,input')).toBeNull();
  expect(screen.getByText('▣ Submitted and locked')).toBeInTheDocument();
});
it.each([1, 2, 3, 4])('displays the supplied package adjacent to the current task at B1 stage index %i', count => {
  const a = config.assessments[1]; const stage = a.stages[count]; show(`/learner/assessment/${a.id}/stage/${stage.id}`, throughStage(1, count));
  const packageHeading = screen.getAllByRole('heading', { name: '48-hour response package' }).find(el => !el.closest('details'))!;
  const packageRegion = packageHeading.closest('[aria-label="Case information"]') as HTMLElement;
  for (const p of a.stages[0].groups.find(g => g.title === '48-hour response package')!.paragraphs) expect(within(packageRegion).getByText(p)).toBeVisible();
  if (count === 3) expect(screen.getByText(stage.fields[0].prompt)).toHaveTextContent('supplied 48-hour response package');
  expect(screen.queryByText('Observed evidence')).toBeNull();
});
it('gates checks until the open revision is submitted and never reveals their answers in the check form', () => {
  const a = config.assessments[1]; let run = throughStage(1, 3);
  const { unmount } = show(`/learner/assessment/${a.id}/stage/B1_checks`, run);
  expect(screen.getByRole('heading', { name: 'This stage is not available yet' })).toBeInTheDocument();
  for (const q of a.stages[4].selectedResponses) expect(screen.queryByText(q.prompt)).toBeNull(); unmount();
  run = submitStage(config, run, a.id, 'B1_revise', validDraft(a, a.stages[3]));
  const { container } = show(`/learner/assessment/${a.id}/stage/B1_checks`, run);
  expect(screen.getAllByRole('radio')).toHaveLength(9); expect(screen.queryByRole('textbox')).toBeNull();
  expect(container.querySelector('[data-feedback-id]')).toBeNull();
  for (const q of a.stages[4].selectedResponses) for (const feedback of Object.values(q.feedbackByOption)) expect(screen.queryByText(feedback)).toBeNull();
});
it.each([0, 1])('blocks direct review URLs before all substantive stages in episode %i', index => {
  const a = config.assessments[index]; const review = a.stages.at(-1)!;
  const { container } = show(`/learner/assessment/${a.id}/stage/${review.id}`, throughStage(index, a.stages.length - 2));
  expect(screen.getByRole('heading', { name: 'This stage is not available yet' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).toBeNull(); expect(container.querySelector('[data-feedback-id]')).toBeNull();
  for (const p of review.groups.flatMap(g => g.paragraphs)) expect(screen.queryByText(p)).toBeNull();
});
it.each([0, 1])('shows guided commentary, two approaches, originals and a separate unscored amendment in episode %i', index => {
  const a = config.assessments[index]; const review = a.stages.at(-1)!;
  const { container } = show(`/learner/assessment/${a.id}/stage/${review.id}`, throughStage(index, a.stages.length - 1));
  expect(screen.getByRole('region', { name: 'Previously submitted responses' }).querySelector('textarea,input')).toBeNull();
  expect(screen.getByRole('region', { name: 'Case commentary' })).toHaveTextContent('has not automatically evaluated your response');
  for (const group of review.groups.filter(g => /defensible approach/.test(g.title))) expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: /Your review amendment/ }); expect(input).toHaveAttribute('aria-required', 'true'); expect(input).not.toHaveAttribute('spellcheck');
  expect(screen.getByText(review.fields[0].prompt)).toBeInTheDocument(); expect(screen.getByText('0 / 100 words · maximum')).toBeInTheDocument();
  expect(container.querySelectorAll('[data-feedback-id]')).toHaveLength(index === 1 ? 3 : 0);
});
it('guards the feedback component independently of route rendering', () => {
  const store = new RunStore(config, 'learner'); localStorage.setItem(store.key, JSON.stringify(throughStage(1, 4)));
  const { container } = render(<AppContext.Provider value={{ config, store: new RunStore(config, 'learner') }}><SelectedResponseFeedback assessment={config.assessments[1]}/></AppContext.Provider>);
  expect(container.textContent).toBe('');
});
it('submits the flood amendment, preserves originals and proceeds to the pause screen', async () => {
  const a = config.assessments[0]; const run = throughStage(0, 4); const originals = structuredClone(run.sessions[a.id].submitted);
  show(`/learner/assessment/${a.id}/stage/A1_review`, run);
  await userEvent.type(screen.getByRole('textbox'), 'I will connect my allocation to access and coordination conditions.');
  await userEvent.click(screen.getByRole('button', { name: 'Submit and continue →' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Submit and lock$/ }));
  expect(await screen.findByRole('heading', { name: config.intermission.heading })).toBeInTheDocument();
  const saved = new RunStore(config, 'learner').getSnapshot().run;
  for (const [id, snap] of Object.entries(originals)) expect(saved.sessions[a.id].submitted[id]).toEqual(snap);
  expect(saved.sessions[a.id].submitted.A1_review.answers.amendment).toBe('I will connect my allocation to access and coordination conditions.');
  expect(window.location.hash).toBe('#/learner/intermission');
});
it('shows the pause choice after the first review and blocks episode two until continuation', () => {
  const run = complete(config.assessments[0], beforeCase(0)); const { unmount } = show('/learner/intermission', run);
  expect(screen.getByRole('heading', { name: config.intermission.heading })).toBeInTheDocument(); expect(screen.getByText(config.intermission.body)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue to Episode 2 →' })).toBeInTheDocument(); unmount();
  show('/learner/assessment/B1_AIR_POE', run); expect(screen.getByRole('heading', { name: 'This case is not available yet' })).toBeInTheDocument();
});
it('keeps submitted evidence answers read-only and reveals feedback only in the guided review', () => {
  const a = config.assessments[1]; const { container } = show(`/learner/assessment/${a.id}/stage/B1_checks`, throughStage(1, 5));
  expect(container.querySelector('textarea,input')).toBeNull(); expect(container.querySelector('[data-feedback-id]')).toBeNull();
  for (const q of a.stages[4].selectedResponses) for (const feedback of Object.values(q.feedbackByOption)) expect(screen.queryByText(feedback)).toBeNull();
});
it.each([0, 1])('keeps the final review locked before episode %i is complete', index => {
  const { container } = show('/learner/review', beforeCase(index));
  expect(screen.getByRole('heading', { name: 'Your final review is still locked' })).toBeInTheDocument();
  expect(container.querySelector('[data-feedback-id], [data-trail-id], textarea')).toBeNull();
});
it('keeps the final review locked when B1 reasoning is complete but its amendment is missing', () => {
  const { container } = show('/learner/review', throughStage(1, 5));
  expect(screen.getByRole('heading', { name: 'Your final review is still locked' })).toBeInTheDocument(); expect(container.querySelector('[data-feedback-id]')).toBeNull();
});
it.each(['A', 'B', 'C'])('shows exactly three final feedback results for choice %s, two trails, both amendments and one optional reflection', async answer => {
  const run = completedBattery(); const a = config.assessments[1];
  for (const q of a.stages[4].selectedResponses) run.sessions[a.id].submitted.B1_checks.answers[q.id] = answer;
  const { container } = show('/learner/review', run);
  expect(screen.getByRole('heading', { name: config.finalReview.heading })).toBeInTheDocument(); expect(container.querySelectorAll('[data-feedback-id]')).toHaveLength(3);
  for (const q of a.stages[4].selectedResponses) {
    expect(container.querySelectorAll(`[data-feedback-id="${q.id}"]`)).toHaveLength(1);
    expect(screen.getAllByText(q.feedbackByOption[answer], { exact: true })).toHaveLength(1);
  }
  expect(Array.from(container.querySelectorAll('[data-trail-id]')).map(el => el.getAttribute('data-trail-id'))).toEqual(['A1', 'B1']);
  expect(screen.getAllByRole('textbox')).toHaveLength(1); expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'false'); expect(screen.getByRole('textbox')).not.toHaveAttribute('spellcheck');
  expect(container.textContent).not.toMatch(/total score|overall score|competency profile|KCM|KQF|rubric|sample answer|reviewer note/);
  for (const trail of container.querySelectorAll<HTMLDetailsElement>('[data-trail-id]')) await userEvent.click(trail.querySelector('summary')!);
  expect(screen.getAllByText('Your review amendment (unscored)')).toHaveLength(2);
  expect(screen.getAllByText('Critical assumption or dependency')).toHaveLength(1);
});
