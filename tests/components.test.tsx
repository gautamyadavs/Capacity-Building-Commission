import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { ResponseField } from '../src/components/Forms';
import { SubmittedResponsePanel } from '../src/components/Assessment';
import { RunStore } from '../src/persistence';
import { submitStage, type Run } from '../src/model';
import { beforeCase, complete, completedBattery, config, started, validDraft } from './helpers';
beforeEach(() => { localStorage.clear(); window.location.hash = '#/learner'; vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function show(path: string, run: Run) {
  window.location.hash = `#${path}`; const initial = new RunStore(config, 'learner'); localStorage.setItem(initial.key, JSON.stringify(run));
  return render(<App config={config} store={new RunStore(config, 'learner')}/>);
}
it('associates live counters and validation with a labelled textarea', async () => {
  const onChange = vi.fn(); render(<ResponseField field={{ id: 'response', type: 'text', required: true, label: 'Reasoning', prompt: 'Explain the situation.', maxWords: 2 }} value="one two three" onChange={onChange}/>);
  const input = screen.getByRole('textbox', { name: 'Reasoning' }); expect(input).toHaveAttribute('aria-invalid', 'true'); expect(input).toHaveAccessibleDescription(/Use 2 words or fewer/);
  expect(screen.getByRole('status')).toHaveTextContent('3 / 2 words · maximum'); await userEvent.type(input, 'x'); expect(onChange).toHaveBeenCalled();
});
it('preserves exact submitted text without editable controls', () => {
  const a = config.assessments[0]; const stage = a.stages[0]; const draft = validDraft(a, stage);
  const { container } = render(<SubmittedResponsePanel assessment={a} stage={stage} snapshot={{ stageId: stage.id, answers: draft.answers, cardOrder: draft.cardOrder, submittedAt: new Date().toISOString() }}/>);
  expect(container.querySelector('textarea,input')).toBeNull(); expect(container.querySelectorAll('p')[1].textContent).toBe(draft.answers.response); expect(screen.getByText('▣ Submitted and locked')).toBeInTheDocument();
});
it('shows the learner landing and case progress without reviewer navigation or design terminology', () => {
  const { container } = show('/learner', beforeCase(0));
  expect(screen.getByRole('heading', { name: 'Reason through complex governance decisions.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start assessment →' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(4);
  expect(container.textContent).not.toMatch(/Reviewer|KCM|KQF|rubric|competency|sample answer|prototype|Format A|Format B|SJT|PEOE|POE/i);
  expect(container.querySelector('a[href*="reviewer"]')).toBeNull();
});
it.each([2, 3])('renders two prediction cards for case index %i and keeps observations absent', index => {
  const a = config.assessments[index]; const { container } = show(`/learner/assessment/${a.id}/stage/${a.stages[0].id}`, started(index));
  expect(screen.getByRole('region', { name: 'Prediction 1' })).toBeInTheDocument(); expect(screen.getByRole('region', { name: 'Prediction 2' })).toBeInTheDocument();
  expect(screen.queryByText('Prediction 3')).toBeNull(); expect(container.textContent).not.toMatch(/Primary outcome|System response|Secondary consequence/);
  for (const p of a.stages[1].groups.flatMap(g => g.paragraphs)) expect(screen.queryByText(p)).toBeNull();
});
it('shows earlier responses read-only while the next stage stays editable', () => {
  const a = config.assessments[0]; const run = submitStage(config, started(), a.id, a.stages[0].id, validDraft(a, a.stages[0]));
  show(`/learner/assessment/${a.id}/stage/${a.stages[1].id}`, run);
  expect(screen.getByRole('region', { name: 'Previously submitted responses' }).querySelector('textarea,input')).toBeNull();
  expect(screen.getAllByRole('textbox')).toHaveLength(1); expect(screen.getByText('▣ Submitted and locked')).toBeInTheDocument();
});
it.each([2, 3])('gates evidence checks before the open revision is submitted for case %i', index => {
  const a = config.assessments[index]; let run = started(index);
  for (const s of a.stages.slice(0, 3)) run = submitStage(config, run, a.id, s.id, validDraft(a, s));
  const { unmount } = show(`/learner/assessment/${a.id}/stage/${a.stages[4].id}`, run);
  expect(screen.getByRole('heading', { name: 'This stage is not available yet' })).toBeInTheDocument();
  for (const q of a.stages[4].selectedResponses) expect(screen.queryByText(q.prompt)).toBeNull(); unmount();
  run = submitStage(config, run, a.id, a.stages[3].id, validDraft(a, a.stages[3])); show(`/learner/assessment/${a.id}/stage/${a.stages[4].id}`, run);
  expect(screen.getAllByRole('radio')).toHaveLength(9);
  for (const q of a.stages[4].selectedResponses) for (const feedback of Object.values(q.feedbackByOption)) expect(screen.queryByText(feedback)).toBeNull();
});
it('keeps a submitted selected answer read-only without exposing its feedback', () => {
  const a = config.assessments[1]; let run = started(1);
  for (const s of a.stages.slice(0, 3)) run = submitStage(config, run, a.id, s.id, validDraft(a, s));
  const { container } = show(`/learner/assessment/${a.id}/stage/${a.stages[2].id}`, run);
  expect(container.querySelector('textarea,input')).toBeNull(); expect(container.querySelector('[data-feedback-id]')).toBeNull();
  for (const feedback of Object.values(a.stages[2].selectedResponses[0].feedbackByOption)) expect(screen.queryByText(feedback)).toBeNull();
});
it.each([0, 1, 2])('has neutral case completion and no corrective guidance after case %i', index => {
  const a = config.assessments[index]; const run = complete(a, beforeCase(index));
  const { container } = show(`/learner/assessment/${a.id}/complete`, run);
  expect(screen.getByText(config.completionAcknowledgement)).toBeInTheDocument(); expect(screen.queryByText(config.finalReview.guidance)).toBeNull();
  expect(container.textContent).not.toMatch(/Correct\.|Not quite\.|Best-supported answer/);
});
it('shows the exact intermission after A2 and blocks Case 3 until continuation', async () => {
  const run = complete(config.assessments[1], beforeCase(1)); const { unmount } = show('/learner/intermission', run);
  expect(screen.getByRole('heading', { name: config.intermission.heading })).toBeInTheDocument(); expect(screen.getByText(config.intermission.body)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue to Case 3 →' })).toBeInTheDocument(); unmount();
  show(`/learner/assessment/${config.assessments[2].id}`, run); expect(screen.getByRole('heading', { name: 'This case is not available yet' })).toBeInTheDocument();
});
it.each([0, 1, 2, 3])('withholds the final feedback and trails before all cases complete (%i)', index => {
  const { container } = show('/learner/review', beforeCase(index)); expect(screen.getByRole('heading', { name: 'Your final review is still locked' })).toBeInTheDocument();
  expect(container.querySelector('[data-feedback-id], [data-trail-id], textarea')).toBeNull();
});
it.each(['A', 'B', 'C'])('renders all seven feedback results for chosen option %s, all trails and one optional reflection without any score', async answer => {
  const run = completedBattery();
  for (const a of config.assessments) for (const s of a.stages) for (const q of s.selectedResponses) run.sessions[a.id].submitted[s.id].answers[q.id] = answer;
  const { container } = show('/learner/review', run);
  expect(screen.getByRole('heading', { name: 'Assessment complete' })).toBeInTheDocument(); expect(container.querySelectorAll('[data-feedback-id]')).toHaveLength(7);
  expect(Array.from(container.querySelectorAll('[data-trail-id]')).map(el => el.getAttribute('data-trail-id'))).toEqual(['A1', 'A2', 'B1', 'B2']);
  expect(screen.getAllByRole('textbox')).toHaveLength(1); expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'false');
  expect(container.textContent).not.toMatch(/total score|overall score|competency profile|KCM|KQF|rubric|sample answer|reviewer note|validated/i);
  for (const a of config.assessments) for (const s of a.stages) for (const q of s.selectedResponses) expect(within(container.querySelector(`[data-feedback-id="${q.id}"]`) as HTMLElement).getByText(q.feedbackByOption[answer])).toBeInTheDocument();
  for (const trail of container.querySelectorAll<HTMLDetailsElement>('[data-trail-id]')) await userEvent.click(trail.querySelector('summary')!);
  expect(screen.getAllByText('Critical assumption or dependency').length).toBe(4);
});
