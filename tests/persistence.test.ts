import { beforeEach,describe,it,expect } from 'vitest';
import { RunStore } from '../src/persistence';
import { config,validDraft } from './helpers';
const a=config.assessments[0];const s=a.stages[0];
beforeEach(()=>localStorage.clear());
describe('persistence',()=>{
  it('never replaces a newer edit while successive blur saves are queued',async()=>{
    const store=new RunStore(config,'learner');await store.begin(a.id);
    const first=validDraft(s);store.edit(a.id,first);const save1=store.flush();
    const second={...first,answers:{...first.answers,field2:'The latest edit must stay visible.'}};
    store.edit(a.id,second);const save2=store.flush();
    const observed:string[]=[];const unsubscribe=store.subscribe(()=>observed.push(store.getSnapshot().run.sessions[a.id].draft!.answers.field2));
    await Promise.all([save1,save2]);unsubscribe();
    expect(observed.length).toBeGreaterThan(0);expect(observed.every(value=>value===second.answers.field2)).toBe(true);
    expect(new RunStore(config,'learner').getSnapshot().run.sessions[a.id].draft!.answers).toEqual(second.answers);
  });
  it('carries the submitted prediction order into comparison and later stages',async()=>{
    const store=new RunStore(config,'learner');const b=config.assessments[2];await store.begin(b.id);
    const draft=validDraft(b.stages[0]);draft.cardOrder.reverse();await store.submit(b.id,b.stages[0].id,draft);
    expect(store.getSnapshot().run.sessions[b.id].draft!.cardOrder).toEqual(draft.cardOrder);
    expect(new RunStore(config,'learner').getSnapshot().run.sessions[b.id].submitted[b.stages[0].id].cardOrder).toEqual(draft.cardOrder);
  });
  it('restores a draft immediately before debounced autosave',async()=>{const store=new RunStore(config,'learner');await store.begin(a.id);const draft=validDraft(s);store.edit(a.id,draft);const restored=new RunStore(config,'learner');expect(restored.getSnapshot().run.sessions[a.id].draft?.answers).toEqual(draft.answers);await store.flush();});
  it('keeps exact snapshots after refresh, a stale edit and another tab',async()=>{
    const store=new RunStore(config,'learner');await store.begin(a.id);const stale=new RunStore(config,'learner');
    const draft=validDraft(s);await store.submit(a.id,s.id,draft);stale.edit(a.id,{...draft,answers:{field1:'hindsight'}});await stale.flush();
    const restored=new RunStore(config,'learner');expect(restored.getSnapshot().run.sessions[a.id].submitted[s.id].answers).toEqual(draft.answers);
    expect(restored.getSnapshot().run.sessions[a.id].draft?.stageId).toBe(a.stages[1].id);
  });
  it('isolates reviewer responses and resets from learner data',async()=>{const learner=new RunStore(config,'learner');await learner.begin(a.id);await learner.submit(a.id,s.id,validDraft(s));const before=localStorage.getItem(learner.key);const reviewer=new RunStore(config,'reviewer');await reviewer.begin(a.id);await reviewer.submit(a.id,s.id,validDraft(s));await reviewer.reset();expect(localStorage.getItem(learner.key)).toBe(before);});
  it('does not resurrect submissions after reset from a stale tab',async()=>{const store=new RunStore(config,'learner');await store.begin(a.id);const stale=new RunStore(config,'learner');await store.reset();await expect(stale.submit(a.id,s.id,validDraft(s))).rejects.toThrow('reset');expect(new RunStore(config,'learner').getSnapshot().run.sessions[a.id].submitted).toEqual({});});
  it('does not unlock on failed storage writes',async()=>{
    const memory=new Map<string,string>();let fail=false;const storage:Storage={get length(){return memory.size;},clear:()=>memory.clear(),key:(i:number)=>Array.from(memory.keys())[i]||null,getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>{if(fail)throw new Error('Quota exceeded');memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}};
    const store=new RunStore(config,'learner',storage);await store.begin(a.id);fail=true;await expect(store.submit(a.id,s.id,validDraft(s))).rejects.toThrow('Quota');expect(store.getSnapshot().run.sessions[a.id].submitted).toEqual({});expect(store.getSnapshot().saveStatus).toBe('Not saved');
    fail=false;await store.submit(a.id,s.id,validDraft(s));expect(store.getSnapshot().run.sessions[a.id].submitted[s.id]).toBeDefined();
  });
  it('preserves malformed storage for recovery',()=>{const key=new RunStore(config,'learner').key;localStorage.setItem(key,'{unreadable');const store=new RunStore(config,'learner');expect(store.getSnapshot().fatal).toBe(true);expect(localStorage.getItem(key)).toBe('{unreadable');});
  it('exports only submitted snapshots with confidence, timestamps and sources',async()=>{const store=new RunStore(config,'learner');const b=config.assessments[2];await store.begin(b.id);const draft=validDraft(b.stages[0]);await store.submit(b.id,b.stages[0].id,draft);const exported=store.exportSession(b.id);expect(exported.assessments[0].submittedAnswers.B1_predict.sourceLog).toBe(draft.answers.sources);expect(exported.assessments[0].submittedAnswers.B1_predict.answers['primary.confidence']).toBe('High');expect(exported.mode).toBe('learner');});
});
