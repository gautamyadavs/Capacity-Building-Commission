import { afterEach,it,expect,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseField } from '../src/components/Forms';
import { SubmittedResponsePanel } from '../src/components/Assessment';
import { config,validDraft } from './helpers';
afterEach(cleanup);
it('ties validation errors and counters to a labelled textarea',async()=>{
  const onChange=vi.fn();render(<ResponseField field={{id:'response',type:'text',required:true,label:'Situation assessment',prompt:'Explain the situation.',maxWords:2}} value="one two three" onChange={onChange}/>);
  const input=screen.getByRole('textbox',{name:'Situation assessment'});expect(input).toHaveAttribute('aria-invalid','true');expect(input).toHaveAccessibleDescription(/Use 2 words or fewer/);await userEvent.type(input,'x');expect(onChange).toHaveBeenCalled();
});
it('renders submitted answers as exact text, never editable controls',()=>{
  const stage=config.assessments[0].stages[0];const draft=validDraft(stage);const {container}=render(<SubmittedResponsePanel config={config} stage={stage} snapshot={{...draft,sourceLog:draft.answers.sources,submittedAt:new Date().toISOString()}}/>);
  expect(container.querySelector('textarea,input')).toBeNull();expect(container.querySelectorAll('p')[1].textContent).toBe(draft.answers.field1);expect(screen.getByText('▣ Submitted and locked')).toBeInTheDocument();
});
