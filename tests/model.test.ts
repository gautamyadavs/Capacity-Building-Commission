import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ConfigSchema, createRun, debriefEligible, fieldsFor, parseRun, stageStatus, submitStage, validate, wordCount } from '../src/model';
import { config,started,validDraft,complete } from './helpers';

describe('source fidelity',()=>{
  const raw=readFileSync('docs/source-specification.md','utf8');
  const normalized=raw.split('\n').map(l=>l.trim().replace(/^(?:\*\s+)?#{1,6}\s*|^\*\s+/,'').replace(/\\([\\`*_{}\[\]()#+\-.!>])/g,'$1')).join('\n');
  it('pins the actual source document',()=>expect(createHash('sha256').update(raw).digest('hex')).toBe(config.source.sha256));
  for(const a of config.assessments)it(`${a.id}: preserves all assessment prose, facts and prompts`,()=>{
    const text=[...a.instructions,...a.reviewerNotes,...a.stages.flatMap(s=>[...s.information,...s.note,...s.groups.flatMap(g=>g.paragraphs),...s.reviewerNotes,...s.fields.filter(f=>f.type==='text').map(f=>f.prompt)])];
    for(const p of text)expect(normalized,`Missing source text: ${p}`).toContain(p);
    // Compare the complete learner information block, rather than only checking
    // that the selected configuration sentences happen to exist in the source.
    for(const s of a.stages) {
      const start=normalized.indexOf(s.sourceSection);const following=normalized.slice(start+s.sourceSection.length).search(/\n[AB][12] Stage [0-4] - /);const next=following<0?-1:start+s.sourceSection.length+following;
      let part=normalized.slice(start,next<0?undefined:next);
      const info=part.match(/Learner sees: [^\n]+\n([\s\S]*?)(?:Prototype presentation|Learner enters)/)?.[1].trim().split(/\n+/).filter(Boolean)||[];
      expect([...s.information,...s.groups.flatMap(g=>g.paragraphs)].sort()).toEqual(info.sort());
    }
  });
  it('preserves shared instructions and developmental prompts',()=>{
    for(const p of [config.confirmation,...config.openBook,...config.cards.flatMap(c=>[c.label,c.prompt]),...config.formats.flatMap(f=>[...f.debrief.information,...f.debrief.fields.flatMap(v=>[v.label,v.prompt])])])expect(normalized).toContain(p);
  });
  it('enforces exactly the documented per-field limits',()=>{
    expect(config.assessments.map(a=>a.stages.map(s=>s.fields.filter(f=>f.type==='text').map(f=>f.maxWords)))).toEqual([
      [[120,260,180,120,100],[180,80,90],[180,80,80]],[[120,260,180,100,100],[170,80,100],[180,80,80]],
      [[100],[],[160,160,100,100],[180,100,120]],[[100],[],[160,160,100,100],[180,100,120]],
    ]);
    expect(config.cardFields.every(f=>!f.maxWords)).toBe(true);
  });
});
describe('assessment state machine',()=>{
  for(const a of config.assessments)it(`${a.id}: locks each snapshot before the next stage`,()=>{
    let run=started(a);
    for(const [i,s] of a.stages.entries()) {
      expect(stageStatus(a,run.sessions[a.id],s)).toBe('current');
      for(const next of a.stages.slice(i+1))expect(stageStatus(a,run.sessions[a.id],next)).toBe('notYetAvailable');
      const draft=validDraft(s);const original=structuredClone(draft);run=submitStage(config,run,a.id,s.id,draft);
      draft.answers.field1='Changed after submission';draft.cardOrder.reverse();
      expect(run.sessions[a.id].submitted[s.id].answers).toEqual(original.answers);
      expect(run.sessions[a.id].submitted[s.id].cardOrder).toEqual(original.cardOrder);
      expect(()=>submitStage(config,run,a.id,s.id,draft)).toThrow('no longer editable');
      expect(parseRun(JSON.stringify(run),config,'learner')).toEqual(run);
    }
  });
  it('blocks submission before begin and stage skipping',()=>{
    const a=config.assessments[0];expect(()=>submitStage(config,createRun(config,'learner'),a.id,a.stages[0].id,validDraft(a.stages[0]))).toThrow();
    expect(()=>submitStage(config,started(a),a.id,a.stages[1].id,validDraft(a.stages[1]))).toThrow();
  });
  for(const fid of ['A','B'] as const)for(const reverse of [false,true])it(`${fid}: debrief requires both cases, reverse=${reverse}`,()=>{
    const cases=config.assessments.filter(a=>a.format===fid);if(reverse)cases.reverse();let run=createRun(config,'learner');
    expect(debriefEligible(config,run,fid)).toBe(false);run=complete(cases[0],run);expect(debriefEligible(config,run,fid)).toBe(false);run=complete(cases[1],run);expect(debriefEligible(config,run,fid)).toBe(true);
    expect(debriefEligible(config,run,fid==='A'?'B':'A')).toBe(false);
  });
  it('rejects corrupt, incompatible and out-of-sequence data',()=>{
    const a=config.assessments[0];const run=started(a);run.contentVersion='old';expect(()=>parseRun(JSON.stringify(run),config,'learner')).toThrow();
    expect(()=>parseRun('{bad',config,'learner')).toThrow();let done=complete(a,started(a));delete done.sessions[a.id].submitted[a.stages[0].id];expect(()=>parseRun(JSON.stringify(done),config,'learner')).toThrow();
  });
  it('validates the configuration graph',()=>{const invalid=structuredClone(config);invalid.assessments[0].stages[0].requires=['future'];expect(ConfigSchema.safeParse(invalid).success).toBe(false);});
});
describe('validation',()=>{
  it('counts whitespace consistently without changing the response',()=>{expect(wordCount('  one\n two\tthree  ')).toBe(3);expect(wordCount(' \n ')).toBe(0);});
  for(const a of config.assessments)for(const s of a.stages)it(`${s.id}: validates every required field and word boundary`,()=>{
    const draft=validDraft(s);expect(validate(config,s,draft)).toEqual({});
    for(const f of fieldsFor(config,s)) {
      const edited=structuredClone(draft);edited.answers[f.id]=' \n ';
      expect(!!validate(config,s,edited)[f.id]).toBe(f.required);
      if(f.maxWords){edited.answers[f.id]=Array(f.maxWords).fill('word').join(' ');expect(validate(config,s,edited)[f.id]).toBeUndefined();edited.answers[f.id]+=' word';expect(validate(config,s,edited)[f.id]).toContain(`${f.maxWords} words or fewer`);}
    }
  });
  it('captures confidence as unscored metadata with no scores',()=>{expect(config.cardFields.find(f=>f.id==='confidence')?.unscored).toBe(true);expect(JSON.stringify(createRun(config,'learner'))).not.toContain('score');});
});
