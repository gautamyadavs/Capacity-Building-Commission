"""One-time, deterministic transcription of the supplied Doc export.

The JSON is the editable runtime configuration. Re-run only when intentionally
reimporting the source; this replaces content edits. No assessment prose is generated.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
raw = (ROOT / 'docs/source-specification.md').read_text()
lines = []
for line in raw.splitlines():
    line = re.sub(r'^(?:\*\s+)?#{1,6}\s*|^\*\s+', '', line.strip())
    line = re.sub(r'\\([\\`*_{}\[\]()#+\-.!>])', r'\1', line)
    if line.strip():
        lines.append(line.strip())

def section(start, end=None, data=lines):
    i = next(i for i, line in enumerate(data) if line.startswith(start))
    j = next((j for j in range(i + 1, len(data)) if end and data[j].startswith(end)), len(data))
    return data[i+1:j]

def between(data, start, stops):
    if not any(line.startswith(start) for line in data):
        return []
    i = next(i for i, line in enumerate(data) if line.startswith(start))
    j = next((j for j in range(i+1, len(data)) if any(data[j].startswith(s) for s in stops)), len(data))
    return data[i+1:j]

cards = []
common_cards = section('4.4 Common prediction-card structure', '4.5 Assessment')
for idx, role in enumerate(['primary', 'system', 'secondary']):
    i = next(i for i, line in enumerate(common_cards) if line.startswith(f'Prediction Card {idx+1}'))
    cards.append({'id': role, 'label': common_cards[i], 'prompt': common_cards[i+1]})
card_fields = []
for key, start in [('prediction','Prediction:'),('why','Why:'),('confidence','Confidence:'),('weaken','What would reduce your confidence?:')]:
    line = next(line for line in common_cards if line.startswith(start))
    label, prompt = line.split(':', 1)
    card_fields.append({'id':key, 'label':label, 'prompt':prompt.strip(), 'type':'choice' if key=='confidence' else 'text', 'required':True,
                        **({'options':['High','Medium','Low'], 'unscored':True} if key=='confidence' else {})})

cases = []
for short, aid, start, end in [
    ('A1','A1_FLOOD','3.4 Assessment A1','3.5 Assessment'),
    ('A2','A2_LPG','3.5 Assessment A2','3.6 Developmental'),
    ('B1','B1_AIR_POE','4.5 Assessment B1','4.6 Assessment'),
    ('B2','B2_GRIEVANCE_POE','4.6 Assessment B2','4.7 Developmental'),
]:
    data = section(start, end)
    heading = next(line for line in lines if line.startswith(start))
    intro = section(f'{short} Stage 0', f'{short} Stage 1', data)
    instructions = between(intro, 'Learner sees', ['System behavior'])
    stages=[]
    for num, kind in enumerate(['decision','update','challenge'] if short[0]=='A' else ['predict','compare','explain','revise'], 1):
        stage_heading = next(line for line in data if line.startswith(f'{short} Stage {num}'))
        st = section(f'{short} Stage {num}', f'{short} Stage {num+1}', data)
        inputs = between(st, 'Learner enters', ['Submission behavior','Intended evidence'])
        fields=[]
        if kind=='challenge':
            selector = next(line for line in inputs if line.startswith('Decision selector'))
            fields.append({'id':'decision','label':'Decision selector','prompt':selector.split(' - ',1)[1], 'type':'choice','required':True,'options':['Maintain','Modify','Reverse']})
        for i, line in enumerate(inputs):
            m = re.match(r'Field (\d+) - (.+) \(maximum (\d+) words\)', line)
            if m:
                fields.append({'id':f'field{m[1]}','label':m[2], 'prompt':inputs[i+1], 'maxWords':int(m[3]),'type':'text','required':True})
        info = between(st, 'Learner sees:', ['Prototype presentation','Learner enters'])
        note = between(st, 'Case information needed', ['Learner sees:'])
        reviewer = between(st, 'Intended evidence - reviewer only', [])
        if note:
            reviewer += [p for p in note if p.startswith('This note is included')]
            note = [p for p in note if not p.startswith('This note is included')]
        groups=[]
        if short=='A1' and num==1:
            for title, indices in [('People and essential services',[2,3,4]),('Transport capacity',[1,5,6]),('Infrastructure',[10]),('Information environment',[7,8,9]),('Weather',[11])]:
                groups.append({'title':title,'paragraphs':[info[i] for i in indices]})
            info = [info[0],info[-1]]
        if short=='A2' and num==1:
            for title, indices in [('Stock and distribution',[1,2,3]),('Demand',[4,9,10]),('Supply options',[5,6,7]),('Logistics',[8]),('Public pressure',[11,12])]:
                groups.append({'title':title,'paragraphs':[info[i] for i in indices]})
            info = [info[0]]
        sid=f'{short}_stage{num}' if short[0]=='A' else f'{short}_{kind}'
        timing= ['35 minutes','15 minutes','approximately 8 to 10 minutes'][num-1] if short[0]=='A' else ['approximately 12 to 15 minutes','approximately 6 to 8 minutes','approximately 12 to 15 minutes','approximately 10 minutes'][num-1]
        stages.append({'id':sid,'title':stage_heading.split(' - ',1)[1], 'kind':kind, 'suggestedTime':timing,
          'sourceSection':stage_heading,'information':info,'groups':groups,'note':note,'fields':fields,
          'requires':[] if not stages else [stages[-1]['id']], 'priorResponses':[s['id'] for s in stages],
          'reviewerNotes':reviewer,'sourcesEnabled':True})
    cases.append({'id':aid,'shortId':short,'format':short[0],'title':heading.split(' - ',1)[1], 'instructions':instructions,
                  'reviewerNotes':data[:2], 'sourceSection':heading, 'stages':stages})

formats=[]
for fid,start,end in [('A','3.6 Developmental debrief','4. Format B'),('B','4.7 Developmental debrief','5. Evidence map')]:
    data = section(start,end)
    reflections = between(data,'Learner reflects',['Prototype behavior'])
    fields=[]
    for i,line in enumerate(reflections):
        if line.startswith('Reflection '):
            fields.append({'id':f'reflection{len(fields)+1}','label':line,'prompt':reflections[i+1],'type':'text','required':False})
    formats.append({'id':fid,'title':'Progressive Decision Simulation' if fid=='A' else 'Predict-Observe-Explain-Revise',
        'description':section('Format A -','Format B -')[0] if fid=='A' else section('Format B -','2. Shared')[0],
        'assessmentIds':[c['id'] for c in cases if c['format']==fid],
        'debrief':{'information':between(data,'Learner sees',['Learner reflects']), 'fields':fields, 'button':f'Complete Format {fid}'},
        'reviewerNotes': section('3.1 What this format','3.3 Common learner') if fid=='A' else section('4.1 What this format','4.3 Common flow')})

out={'schemaVersion':1, 'contentVersion':'2026-09-30.1',
     'source':{'url':'https://docs.google.com/document/d/1mzUrzMVI76GCWrWZDQud1zUF3KwtNDkSZcj0TiffTUc/edit','sha256':hashlib.sha256(raw.encode()).hexdigest(),'retrievedOn':'2026-09-30'},
     'confirmation':next(line for line in lines if line.startswith('Once you continue, this response')),
     'openBook':section('2.5 Open-book','2.6 What')[:2],
     'notAssessed':section('2.6 What','2.7 Suggested'),
     'status':next(line for line in lines if line.startswith('Status:')),
     'sourcePrompt':'If an external source materially influenced the response, the learner can paste the URL and briefly state what it informed. The number of sources is not itself scored.',
     'cards':cards, 'cardFields':card_fields,
     'comparisonOptions':['Supported','Partly supported','Not supported','Insufficient evidence'],
     'comparisonPrompt':'For each classification, add a brief evidence note identifying the observation(s) that led to the classification. Maximum 60 words per prediction.',
     'formats':formats,'assessments':cases,
     'reviewerSections':[{'title':s,'paragraphs':section(s,e)} for s,e in [('5. Evidence map','6. Prototype implementation'),('7. What the prototype','8. Design notes'),('8. Design notes',None)]]}
(ROOT/'public/content/assessments.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Extracted:',[(c['id'],len(c['stages'])) for c in cases])
