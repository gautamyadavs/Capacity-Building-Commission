# Bharat KALP Assessment Prototype \- Detailed Interaction Specification

## Working draft for CBC review | Two candidate formats | Two assessment items per format

Purpose: document exactly how four prototype assessments could work from the learner's point of view and give a future Codex implementation enough detail to build a clickable GitHub prototype without inventing assessment logic.  
Status: working design, not an approved Bharat KALP assessment. Scenario facts are simulated for prototyping and should be reviewed for realism by CBC and relevant subject matter experts before any pilot. Suggested timings and word limits are placeholders to test burden and usability, not validated cutoffs.  
Assessment architecture note: this specification does not assume whether these items belong within the SJT, another existing assessment component, or a separate readiness diagnostic. CBC can decide that after reviewing the formats.

# 1\. What this prototype is meant to compare

The prototype compares two ways of eliciting evidence that is difficult to obtain from recall-oriented multiple-choice questions or a single polished written report.

## Format A \- Progressive Decision Simulation (Asynchronous)

The learner makes a decision in writing, receives material new information that changes the situation, updates the decision, and then responds to a fixed decision challenge. This format is designed to make decision logic, trade-offs, adaptation, and defensibility observable in a fully asynchronous flow.

## Format B \- Predict-Observe-Explain-Revise (POE-R)

The learner commits to predictions about how a governance system will respond, then sees a simulated outcome, explains where the prediction did or did not hold, and revises the mental model and proposed action. This format is designed to make causal reasoning, systems thinking, evidence interpretation, and learning from mismatch observable.  
The fourth step, Revise, is an intentional extension of classic Predict-Observe-Explain. For Bharat KALP, explanation alone is not enough; the assessment should also show whether the officer converts learning into a better decision.

# 2\. Shared learner experience and prototype rules

## 2.1 One stage at a time

The learner sees only the information for the current stage. Future injects, simulated outcomes, reviewer notes, and assessor prompts are not visible until the relevant stage is unlocked.  
A progress indicator may show stage names such as Initial Response, New Information, Update, and Decision Challenge, but it must not preview the content of later stages.

## 2.2 Autosave while a stage is open

All current-stage inputs autosave as drafts. The interface shows a small status indicator such as Saved. The learner may edit freely while the stage is still open.  
Refreshing the browser or closing and reopening the prototype should restore the current draft and the most recently unlocked stage.

## 2.3 Submit means lock

Every stage that captures a substantive response ends with a button labelled Submit and continue.  
Before locking, show this confirmation:  
Once you continue, this response will be locked and cannot be edited. New case information may be revealed after submission. You will still be able to view your submitted response.  
Buttons: Cancel | Submit and lock  
After confirmation, the stage is stored as a submitted version with a timestamp and becomes read-only. Later screens may display it in a Submitted and locked panel, but the learner cannot edit it.  
Reason for the lock: the assessment depends on comparing what the learner thought before seeing later information with how the learner responds afterward. Allowing back-editing would introduce hindsight and make evidence of adaptation or learning much less interpretable.

## 2.4 Back navigation is read-only

The learner may return to earlier stages to read submitted case information and their own response. Previous input controls must render as read-only text rather than editable fields.  
Browser back, direct URL navigation, or page refresh must not restore edit access to a submitted stage. For the prototype this can be enforced in application state; a real deployment would require server-side enforcement.

## 2.5 Open-book use of resources

The cases are designed as open-book reasoning tasks. The learner may consult notes or online sources unless CBC later specifies a different policy.  
All facts supplied inside the case are the controlling facts for the simulated scenario. External research should not be necessary to understand the task and should not override the stated case facts.  
Each written stage includes a small optional field: External sources used. If an external source materially influenced the response, the learner can paste the URL and briefly state what it informed. The number of sources is not itself scored.  
The prototype should not add AI-specific restrictions, detection, or penalties unless CBC adopts an explicit policy. The construct is the quality of reasoning and judgement demonstrated in the submitted work.

## 2.6 What is not being assessed

* Writing polish, grammar, accent, or presentation style are not target constructs.  
* Recall of named leadership frameworks or Indian Knowledge Systems terminology is not required unless a task explicitly asks for it.  
* Sector-specific knowledge that is not supplied in the case should not determine the score.  
* There is no single hidden policy answer. Different decisions may be strong if the reasoning, evidence use, trade-offs, and implementation logic are defensible.  
* The fixed decision challenge is not a writing-style test. Learners may refer to the case facts and their submitted responses; scoring should focus on the reasoning demonstrated.

## 2.7 Suggested timing behavior

The timings below are prototype assumptions that should be piloted. The clickable prototype should display the suggested time for each stage but should not auto-submit when time expires, so CBC reviewers can explore the flow without being locked out. A future production version can make timing hard or soft through configuration.

* Format A Stage 1 initial response: 35 minutes.  
* Format A Stage 2 update after new information: 15 minutes.  
* Format A Stage 3 decision challenge: approximately 8 to 10 minutes.  
* Format B Predict: approximately 12 to 15 minutes.  
* Format B Observe and compare: approximately 6 to 8 minutes.  
* Format B Explain: approximately 12 to 15 minutes.  
* Format B Revise: approximately 10 minutes.

## 2.8 Reviewer mode

The prototype should support a Reviewer mode in addition to Learner mode. Learner mode shows only what an officer would see. Reviewer mode may show the hidden rationale for each stage, intended evidence, later injects, scoring notes, and the complete flow.  
Reviewer mode is for CBC design review only and is not part of the learner experience.

# 3\. Format A \- Progressive Decision Simulation (Asynchronous)

## 3.1 What this format is trying to elicit

# A single written response can show problem framing, analysis, prioritisation, and a proposed course of action. This format adds two further evidence points without requiring synchronous administration. First, a material information update tests whether the learner can revise rather than simply defend the original plan. Second, a fixed decision challenge tests whether the learner can engage a credible counterargument, make the decision again under pressure, and state what would make them change course.

# The learner therefore experiences a sequence closer to real governance work: decide, commit, receive new information, update, face a challenge, and defend or reconsider the decision.

# The format is fully asynchronous. Every learner receives the same case information, update, and decision challenge. Previous responses are locked before later information is revealed.

## 3.2 Evidence architecture across the two items

# Both items should provide evidence for the same five common dimensions so that performance can be compared across different governance contexts:

* # Problem framing and systems diagnosis.

* # Evidence use and critical analysis.

* # Strategic prioritisation.

* # Decision quality and trade-off reasoning.

* # Adaptation under uncertainty.

# Each case also provides stronger secondary evidence in a different area. A1 Flash Flood is designed to provide additional evidence about institutional execution and delegation. A2 LPG Supply Disruption is designed to provide additional evidence about ethical and citizen-centred judgement.

# Stakeholder alignment may appear in either response, but these individual asynchronous tasks should not be treated as direct evidence of actual influence, collaborative learning, or observed team leadership.

# Scoring principle: use the same five common-dimension rubric anchors across both items. Do not require every case to provide equally strong evidence for every leadership capability.

## 3.3 Common learner flow

# Stage 0: learner instructions.

# Stage 1 \- Initial decision: the learner receives the initial case and submits a structured written response. Submit and lock.

# Stage 2 \- Respond to change: material new information is revealed. The learner sees the Stage 1 response read-only and submits an update. Submit and lock.

# Stage 3 \- Decision challenge: the learner receives a fixed counterargument or pressure that challenges the current position. The learner chooses Maintain, Modify, or Reverse and explains the decision, trade-off, and change condition. Submit and lock.

# No model answer, score, or coaching is shown between A1 and A2. After both Format A items are complete, the learner receives a developmental debrief described in Section 3.6.

## 3.4 Assessment A1 \- Flash Flood and Transport Disruption

# Purpose of variation: high-uncertainty crisis requiring cross-agency prioritisation, resource allocation, institutional execution, communication, and rapid adaptation.

# Scenario setting: fictional metropolitan region. No knowledge of a real city's emergency protocol is assumed.

### A1 Stage 0 \- Learner instructions

#### Learner sees

# You are acting as the Secretary-level lead for a multi-agency transport and continuity response in a large metropolitan region. Use the facts supplied in the case as authoritative. You may consult external resources if useful, but you are not expected to know local emergency procedures.

# You will first submit an initial response. Once submitted, that version will be locked. You will then receive new information and be asked to update your response. A final decision challenge will ask you to defend, modify, or reverse your current approach.

# Bullets are welcome. The word limits are maximums, not targets. Writing style is not assessed.

#### System behavior

# Button: Begin assessment. No case facts are visible until the learner begins.

### A1 Stage 1 \- Initial decision

#### Learner sees: situation

# It is 07:00 after seven hours of intense rainfall. You have been asked to lead the next 6 hours of emergency transport coordination and set direction for the following 72 hours.

* # 22 metro stations are inaccessible, three bus depots are affected, two intercity rail terminals have restricted access, and 18 major arterial roads are closed or intermittently passable.

* # Approximately 140,000 commuters are displaced from their normal routes.

* # About 11,000 residents in low-lying wards are under evacuation advisory.

* # Two major public hospitals are operating on backup power. Current fuel is estimated to support approximately eight more hours of backup generation.

* # There are 600 buses available for emergency redeployment. The rail authority requests 260 buses for stranded passengers. District administrations collectively request 420 buses for evacuation and movement to shelters.

* # Police can secure only a limited number of priority road corridors at one time.

* # Mobile connectivity is degraded in roughly 40 percent of the affected area.

* # A false social-media message claiming an upstream dam has failed is spreading quickly. There is currently no evidence of a dam failure.

* # Different agencies have issued inconsistent public messages about when transport services may reopen.

* # Drainage pumps are functioning intermittently because of power instability. Structural inspections of some flooded metro assets are incomplete.

* # The weather service estimates a 60 percent chance of another 90 to 130 mm of rain over the next 12 hours.

# Your immediate objective is to protect life and maintain essential movement over the next 6 hours while establishing a credible 72-hour continuity plan.

#### Prototype presentation

# To reduce reading burden without reducing complexity, group the facts visually under expandable or clearly labelled blocks such as People and essential services, Transport capacity, Infrastructure, Information environment, and Weather. The learner should still receive the complete common information set.

#### Learner enters

# Field 1 \- Situation assessment (maximum 120 words)

# What is the central problem you are trying to manage, and what matters most in deciding how to respond?

# Field 2 \- Recommended response and rationale (maximum 260 words)

# What would you do over the next 6 hours? State your priorities and explain the reasoning behind them.

# Field 3 \- Implementation (maximum 180 words)

# How should the response be carried out across the relevant agencies, people, and constrained resources?

# Field 4 \- 72-hour direction (maximum 120 words)

# What should the system be trying to achieve after the immediate 6-hour response?

# Field 5 \- Risks, uncertainty, and evidence needs (maximum 100 words)

# What uncertainty or risk most affects your plan, and what information would you want next?

# Optional field \- External sources used.

#### Submission behavior

# The learner may edit all fields until selecting Submit and continue. The confirmation modal explains that the initial response will be locked before any new information is shown. On submission, store all fields together as A1\_stage1 with submittedAt timestamp and display them read-only in later stages.

#### Intended evidence \- reviewer only

* # Whether the learner identifies the central system problem without being told how to decompose it.

* # Whether life safety, essential mobility, information integrity, infrastructure constraints, and restoration are integrated rather than treated as independent checklist items.

* # Whether scarce transport is prioritised using a defensible principle rather than first-come or equal splitting.

* # Whether implementation includes credible ownership, coordination, decision rights, or escalation without requiring the learner to use those exact terms.

* # Whether the learner distinguishes immediate response from the 72-hour direction.

* # Whether uncertainty is connected to information needs rather than ignored.

### A1 Stage 2 \- New information and update

#### Learner sees: new information

# Three hours later, the following developments are confirmed:

* # A structural inspection confirms major water ingress in one central metro tunnel. It will not reopen today.

* # A substation failure has stopped several drainage pumps. Estimated restoration time is four hours.

* # The weather forecast improves. There is now a 35 percent chance of 60 to 90 mm of additional rain over the next 12 hours.

* # The largest shelter district reports that current shelter capacity will be reached in approximately two hours unless additional space is opened.

* # The rail authority now says it needs only 180 of the 260 buses originally requested because special trains have been added at an unaffected terminal.

* # Major media outlets are asking the government to announce a single citywide reopening time within the next 30 minutes.

# Your Stage 1 response is shown in a read-only panel beside the new information.

#### Learner enters

# Field 1 \- Update (maximum 180 words)

# What would you change in your response now, and why?

# Field 2 \- Retain (maximum 80 words)

# What important part of your original response should remain unchanged, and why?

# Field 3 \- Immediate priority and next evidence (maximum 90 words)

# What is now your most important immediate priority, and what evidence would you watch most closely next?

# Optional field \- External sources used.

#### Submission behavior

# Stage 1 remains visible but cannot be edited. Stage 2 is locked on submission as A1\_stage2. Only then is the fixed decision challenge revealed.

#### Intended evidence \- reviewer only

* # Whether the learner updates proportionately rather than treating all new information as equally important.

* # Whether the reduced rail bus requirement changes resource use when appropriate.

* # Whether the tunnel finding, pump failure, and shelter constraint alter the operating plan where relevant.

* # Whether improved weather probability is treated as changed risk rather than certainty.

* # Whether sound parts of the original plan are retained rather than changing everything merely because circumstances changed.

### A1 Stage 3 \- Decision challenge

#### Learner sees: challenge

# At the next coordination review, a senior official argues that the improved rainfall forecast and the addition of special trains mean the government should now redirect most emergency bus capacity toward restoring normal commuter movement. The official also argues for announcing a single citywide reopening target to reassure the public and reduce economic disruption.

# Your Stage 1 and Stage 2 responses remain visible and read-only.

#### Learner enters

# Decision selector \- Maintain / Modify / Reverse my current approach

# Field 1 \- Response to the challenge (maximum 180 words)

# How would you respond to this argument? Explain why your selected course is preferable now.

# Field 2 \- Trade-off accepted (maximum 80 words)

# What important cost, risk, or competing objective are you accepting with this decision?

# Field 3 \- Change condition (maximum 80 words)

# What specific new evidence or change in conditions would make you choose differently?

#### Submission behavior

# Submission stores the decision selection and written fields as A1\_stage3. All three stages are then read-only.

#### Intended evidence \- reviewer only

* # Whether the learner engages the strongest part of the challenge rather than dismissing it.

* # Whether the final decision is consistent with the available evidence and prior reasoning, or whether any change is explicitly justified.

* # Whether the learner names a real trade-off rather than presenting the decision as cost-free.

* # Whether the change condition is specific enough to guide a future decision.

## 3.5 Assessment A2 \- LPG Supply Disruption

# Purpose of variation: national-level scarcity management requiring allocation principles, demand management, public trust, logistics, and defensible burden sharing.

# Scenario setting: fictional national supply disruption. No knowledge of current geopolitical events or actual LPG policy is assumed.

### A2 Stage 0 \- Learner instructions

#### Learner sees

# You are acting as the Secretary-level lead for a 30-day national continuity response to a temporary LPG supply disruption. Use the case facts as authoritative. Your task is not to predict the actual market or recall existing rationing rules. It is to make and justify a workable continuity strategy under uncertainty.

# Your initial response will be locked before later developments are revealed. You will then update your approach and respond to a fixed decision challenge.

# Bullets are welcome. The word limits are maximums, not targets. Writing style is not assessed.

### A2 Stage 1 \- Initial decision

#### Learner sees: situation

# A shipping disruption is expected to constrain LPG imports for an uncertain period estimated at two to five weeks.

* # National usable LPG inventory in the distribution system is equivalent to approximately 18 days of current consumption.

* # Seven states hold only 9 to 12 days of distributor inventory. Most other states hold more than 20 days.

* # A centrally controlled buffer, additional to the 18 days above, is equivalent to about five days of national consumption. Releasing and moving it is logistically uneven.

* # Current LPG use is estimated as 71 percent households, 17 percent commercial users, 5 percent essential services, and 7 percent industrial users.

* # Some commercial and industrial users can switch to alternative fuels, but conversion takes roughly three to seven days and raises operating costs.

* # Domestic production could increase by about 5 percent within 10 days.

* # An alternative import cargo equivalent to approximately two days of national consumption could arrive in six to nine days at higher cost.

* # Interstate transfers generally take two to five days.

* # New household bookings are 22 percent above normal. Duplicate or unusually early bookings are estimated to be 18 percent above normal.

* # Visible queues have formed in several cities, but there is no national stockout.

* # Hospitals and large community kitchens are asking for guaranteed allocations.

* # There is strong pressure to announce immediate uniform national rationing.

#### Prototype presentation

# Group the case information visually under headings such as Stock and distribution, Demand, Supply options, Logistics, and Public pressure. Do not hide any of the common information set.

#### Learner enters

# Field 1 \- Situation assessment (maximum 120 words)

# What is the central problem you are trying to manage, and what matters most in deciding how to respond?

# Field 2 \- Recommended response and rationale (maximum 260 words)

# What would you do over the next 30 days? State your priorities and explain the reasoning behind them.

# Field 3 \- Implementation (maximum 180 words)

# How should the response be carried out across supply, distribution, and the relevant institutions or user groups?

# Field 4 \- Public communication (maximum 100 words)

# What would you communicate publicly at this point?

# Field 5 \- Risks, uncertainty, and evidence needs (maximum 100 words)

# What uncertainty or risk most affects your plan, and what information would you want next?

# Optional field \- External sources used.

#### Submission behavior

# All fields remain editable until Submit and continue. Submission locks A2\_stage1 before the Day 4 information is revealed.

#### Intended evidence \- reviewer only

* # Whether the learner independently distinguishes overall stock, regional distribution risk, demand behavior, and public confidence where relevant.

* # Whether allocation or conservation choices follow a defensible principle rather than an unexplained uniform rule.

* # Whether essential services, households, and users with feasible alternatives are weighed without being explicitly cued in the prompt.

* # Whether logistics lead times affect the plan rather than being treated as instantaneous.

* # Whether communication reduces avoidable panic without making guarantees unsupported by the evidence.

* # Whether the learner identifies the information most important to deciding whether restrictions should be targeted, tightened, or relaxed.

### A2 Stage 2 \- Day 4 disruption

#### Learner sees: new information

# On Day 4, the situation changes:

* # An unexpected bottling-plant outage reduces national dispatch capacity by approximately 8 percent for five days.

* # A false viral message claims that household LPG will run out nationwide within 72 hours.

* # Household bookings rise a further 19 percent within 24 hours.

* # Two rural districts now report less than five days of distributor stock.

* # Guaranteed allocations to hospitals and community kitchens are currently being met.

* # The alternative import cargo is now expected in seven days, with approximately 70 percent confidence.

# Your Stage 1 response appears in a read-only panel.

#### Learner enters

# Field 1 \- Update (maximum 170 words)

# What would you materially change in your response now, and why?

# Field 2 \- Retain (maximum 80 words)

# What important part of your original response should remain unchanged, and why?

# Field 3 \- Immediate priority and next evidence (maximum 100 words)

# What is now your most important immediate priority, and what evidence would you watch most closely next?

# Optional field \- External sources used.

#### Submission behavior

# Stage 1 remains visible but cannot be edited. Submission locks A2\_stage2. Only then is the fixed decision challenge revealed.

#### Intended evidence \- reviewer only

* # Whether the learner distinguishes a temporary dispatch shock from the wider supply and distribution problem.

* # Whether a demand spike caused by misinformation changes communication or demand-management actions without being mistaken automatically for equivalent growth in actual consumption.

* # Whether the two low-stock rural districts receive proportionate attention without assuming the whole country is in the same position.

* # Whether the learner updates while preserving priorities that remain supported by the evidence.

* # Whether the learner identifies a useful next trigger rather than responding only to public pressure.

### A2 Stage 3 \- Decision challenge

#### Learner sees: challenge

# A coalition of higher-stock states argues that any release from the central buffer should be distributed proportionately across all states rather than targeted toward the lowest-stock areas. They argue that equal treatment is necessary to maintain trust and avoid political conflict.

# Your Stage 1 and Stage 2 responses remain visible and read-only.

#### Learner enters

# Decision selector \- Maintain / Modify / Reverse my current approach

# Field 1 \- Response to the challenge (maximum 180 words)

# How would you respond to this argument? Explain why your selected course is preferable now.

# Field 2 \- Trade-off accepted (maximum 80 words)

# What important cost, risk, or competing objective are you accepting with this decision?

# Field 3 \- Change condition (maximum 80 words)

# What specific new evidence or change in conditions would make you choose differently?

#### Submission behavior

# Submission stores the decision selection and written fields as A2\_stage3. All three stages are then read-only. If A1 is also complete, unlock the Format A developmental debrief.

#### Intended evidence \- reviewer only

* # Whether the learner can defend or revise an allocation principle under stakeholder pressure.

* # Whether equal treatment is distinguished from equitable treatment where the evidence supports different levels of need.

* # Whether the learner acknowledges the political and trust trade-off rather than treating targeted allocation as cost-free.

* # Whether the stated change condition could genuinely alter the allocation decision.

## 3.6 Developmental debrief after both Format A items

# The debrief is part of the learn-by-doing experience, but it must not coach performance on the second item. It remains locked until both A1 and A2 are complete.

#### Learner sees

# You have completed two progressive decision simulations. These activities were designed to exercise how you frame complex problems, use evidence, prioritise, justify trade-offs, and adapt when circumstances change.

# There is no single model answer shown. The purpose of this debrief is to help you examine how your own decisions evolved across the two situations.

# Your submitted Decision Trail for A1 and A2 is displayed read-only, showing Stage 1, Stage 2, and Stage 3 side by side or sequentially.

#### Learner reflects

# Reflection 1 \- What changed?

# Across the two cases, where did new information most materially change your reasoning?

# Reflection 2 \- What stayed?

# Where did you deliberately keep part of your original approach despite pressure to change it? Why?

# Reflection 3 \- Assumptions

# Which assumption in either case turned out to matter most to your decision?

# Reflection 4 \- Next practice

# If you faced another unfamiliar governance problem tomorrow, what would you do differently in how you frame, test, or revise your decision?

#### Prototype behavior

# The reflections may be optional and unscored in the first prototype. If captured, store them separately from assessment scores so developmental reflection is not mistaken for evidence from the two scored decision simulations.

# Button: Complete Format A.

# 4\. Format B \- Predict-Observe-Explain-Revise (POE-R)

## 4.1 What this format is trying to elicit

# POE-R is designed to make the learner's causal model visible before the outcome is known. The learner predicts what will happen and why, commits to that prediction, then sees a simulated outcome. The assessment is not about guessing the exact future. Strong evidence comes from the quality of the reasoning behind the prediction, how the learner interprets what the new evidence does and does not support, and whether the learner updates the mental model and action proportionately.

# Observe is evidence, not an answer key. A simulated outcome may support more than one explanation, and the learner should not be rewarded simply for matching the scenario writer's intended story.

# The format is fully asynchronous. Previous responses are locked before later information is revealed.

## 4.2 Evidence architecture across the two items

# Both POE-R items use the same four common scored dimensions:

* # Systems diagnosis: identifies interactions, dependencies, and consequences rather than treating outcomes in isolation.

* # Evidence use and critical analysis: distinguishes what the observed evidence supports from what it only suggests; considers competing explanations.

* # Decision quality after new evidence: revises action in a way that follows from the evidence, uncertainty, and trade-offs.

* # Adaptation under uncertainty: updates proportionately rather than clinging to the original view or abandoning it merely because the headline result changed.

# Causal reasoning is the mechanism through which these dimensions are elicited, not a new standalone Bharat KALP competency. The tasks can provide supporting evidence relevant to Learning Agility, but one simulated update should not be treated as proof of the broader Learning Agility construct.

# B1 Air Quality provides additional evidence about strategic and system-level prioritisation and citizen impact. B2 Public Grievance Reform provides additional evidence about institutional awareness, incentives, execution, and citizen-centred service quality.

# Confidence ratings are captured as unscored metadata in the first prototype. They help make uncertainty visible but should not affect the readiness score unless later pilot evidence supports a defensible interpretation.

## 4.3 Common flow

# Stage 0: instructions.

# Stage 1 \- Predict: the learner receives the initial situation and intervention. The learner completes three common prediction cards plus one assumption/dependency field. Each prediction includes rationale, confidence, and evidence that would reduce confidence. Submit and lock.

# Stage 2 \- Observe and compare: the simulated outcome is revealed. The learner's predictions remain visible and read-only. For each prediction, the learner classifies the new evidence as Supported, Partly supported, Not supported, or Insufficient evidence. These classifications are submitted and locked.

# Stage 3 \- Explain: the learner identifies the most important mismatch, proposes the strongest explanation, names a plausible alternative, and identifies evidence that would help distinguish between them. Submit and lock.

# Stage 4 \- Revise: the learner converts the new understanding into a revised course of action, states what should be retained, and defines the next monitoring or decision trigger. Submit and lock.

# Critical validity rule: the Observe data must not become accessible until Predict is submitted and locked. No model answer, coaching, or explanatory feedback is shown after B1. The developmental debrief remains locked until both B1 and B2 are complete.

## 4.4 Common prediction-card structure

# Both B1 and B2 use the same three prediction-card roles so that the learner must reason across more than one part of the system without being told the specific mechanism to identify.

# Prediction Card 1 \- Primary outcome

# What important outcome do you expect the intervention to produce?

# Prediction Card 2 \- System response

# What important response do you expect elsewhere in the system?

# Prediction Card 3 \- Secondary consequence

# What other consequence do you think will matter for the decision?

# Each card contains four inputs:

* # Prediction: state the expected direction or pattern. An exact number is not required unless the learner chooses to provide one.

* # Why: explain the causal reasoning behind the prediction.

* # Confidence: High, Medium, or Low. This is not scored in the first prototype.

* # What would reduce your confidence?: state one observation that would materially weaken the prediction.

# After the three cards, both cases ask: What assumption, dependency, or interaction is most important to whether your predictions hold?

# Prototype behavior: the learner may edit and reorder cards until submitting. Submit and lock stores an immutable prediction set. Later stages display the predictions exactly as submitted.

## 4.5 Assessment B1 \- Air Quality Emergency: Predicting System Effects

# Purpose of variation: complex physical and institutional system with uncertain causal contribution, time lags, health consequences, capacity constraints, and distributional costs.

# Scenario setting: fictional metropolitan region, deliberately not tied to a named real-world emergency framework.

### B1 Stage 0 \- Learner instructions

#### Learner sees

# In this assessment, you are not being asked to guess the correct future. You are being asked to make your reasoning visible before you know the outcome.

# You will first predict how a 48-hour response package is likely to affect the system and explain why. Your predictions will then be locked. You will see a simulated outcome, compare it with your predictions, explain what the evidence may mean, and revise your response.

# A prediction that turns out to be wrong can still provide strong evidence if it was well reasoned and you update appropriately when better evidence appears.

# Bullets are welcome. Writing style is not assessed.

### B1 Stage 1 \- Predict

#### Case information needed for fair reasoning

# Use the following information as part of the simulated case: citywide air-quality readings can change because of both emissions and atmospheric conditions. Changes in exposure may not immediately appear in health-service data. Source-contribution estimates are uncertain and may change as additional evidence becomes available.

# This note is included to reduce dependence on prior environmental-policy expertise. It does not identify which explanation will best fit the later evidence.

#### Learner sees: situation

# You are the Secretary-level chair of a 14-day intergovernmental response group in a fictional metropolitan region experiencing severe air pollution.

* # Air Quality Index has ranged from 430 to 490 for the last 72 hours and is currently 462\.

* # Respiratory emergency-department visits are 31 percent above the recent baseline; paediatric respiratory visits are 42 percent above baseline.

* # High-filtration mask stocks available to public facilities are estimated to last nine days at current distribution rates.

* # Source Model A estimates contribution as road transport 28 percent, construction and dust 22 percent, industry 16 percent, regional or upwind sources 26 percent, and other sources 8 percent.

* # Source Model B estimates regional or upwind contribution at 41 percent and correspondingly lower local contributions. Both models have material uncertainty.

* # Stricter construction restrictions would affect a large daily-wage workforce.

* # School attendance is 18 percent below normal. Approximately 68 percent of households report reliable access for remote learning.

* # Bus ridership is already 17 percent above normal and the system is close to peak operating capacity.

* # Registered large construction sites are estimated to be 76 percent compliant with current controls. Informal-site compliance is unknown.

# The response group adopts the following 48-hour package:

* # Intensify enforcement at registered large construction sites.

* # Restrict heavy goods vehicles in the central zone during daytime hours.

* # Add approximately 20 percent bus capacity where vehicles and staff can be redeployed.

* # Prioritise high-filtration masks for clinics, schools, and high-exposure public workers.

* # Request neighbouring jurisdictions to reduce major point-source emissions, but no binding regional action has yet been agreed.

#### Learner enters

# Complete the three common prediction cards defined in Section 4.4.

# Field 4 \- Critical assumption or dependency (maximum 100 words)

# What assumption, dependency, or interaction is most important to whether your predictions hold?

# Optional field \- External sources used.

#### Submission behavior

# Submit and lock stores the prediction cards and dependency field as B1\_predict. Only then is the simulated outcome revealed.

#### Intended evidence \- reviewer only

* # Whether predictions follow from an explicit causal model rather than generic optimism or pessimism.

* # Whether the learner reasons across more than one part of the system rather than selecting three versions of the same outcome.

* # Whether uncertainty in source estimates, time lags, capacity constraints, or distributional effects is incorporated where relevant.

* # Whether the learner can name an observation that would materially weaken each prediction.

* # Confidence level itself is not scored.

### B1 Stage 2 \- Observe and compare

#### Learner sees: simulated outcome after 48 hours

* # Registered construction-site compliance rises from 76 percent to 91 percent.

* # Heavy goods traffic in the central zone falls by approximately 14 percent during restriction hours.

* # At selected roadside monitoring sites in the central zone, pollution readings improve modestly, but the improvement is not consistent across the metropolitan region.

* # Bus ridership rises a further 9 percent.

* # Citywide Air Quality Index remains between 455 and 480 and does not show a sustained improvement.

* # Respiratory emergency-department visits are now 39 percent above the recent baseline.

* # A revised source analysis estimates regional or upwind contribution at approximately 45 to 50 percent, with moderate confidence.

* # Neighbouring jurisdictions have not yet adopted comparable controls.

* # Labour officials report significant income distress among casual workers affected by the construction restrictions.

* # Atmospheric dispersion remained unfavorable during much of the 48-hour period. The weather service now says stronger dispersion may occur in the next 36 to 48 hours, with moderate confidence.

# The learner's original predictions remain visible and read-only.

#### Learner enters

# For each prediction card, choose one evidence classification:

* # Supported

* # Partly supported

* # Not supported

* # Insufficient evidence

# For each classification, add a brief evidence note identifying the observation(s) that led to the classification. Maximum 60 words per prediction.

#### Submission behavior

# Store the three classifications and evidence notes as B1\_compare. Submit and lock before opening Explain.

#### Intended evidence \- reviewer only

* # Whether the learner evaluates each prior prediction against the actual evidence rather than rewriting the prediction retrospectively.

* # Whether mixed local and citywide indicators are interpreted without collapsing them into a simple worked/did-not-work conclusion.

* # Whether lack of immediate improvement is distinguished from evidence that an intervention had zero effect.

* # Whether Insufficient evidence is used appropriately when the observations cannot resolve the prediction.

### B1 Stage 3 \- Explain

#### Learner enters

# Field 1 \- Most important mismatch (maximum 160 words)

# What is the most important difference between what you expected and what you observed?

# Field 2 \- Strongest explanation (maximum 160 words)

# What is your strongest explanation for that pattern? Identify the evidence that supports it.

# Field 3 \- Plausible alternative (maximum 100 words)

# What other plausible explanation should remain under consideration?

# Field 4 \- Discriminating evidence (maximum 100 words)

# What additional evidence would most help distinguish between your leading explanation and the alternative?

# Optional field \- External sources used.

#### Submission behavior

# Lock the explanation as B1\_explain before opening Revise.

#### Intended evidence \- reviewer only

* # Whether the learner separates observed changes in implementation or local indicators from the broader system outcome.

* # Whether the strongest explanation is supported by the evidence rather than asserted as certain.

* # Whether revised regional contribution, atmospheric conditions, time lag, and incomplete regional coordination are weighed rather than cherry-picked.

* # Whether a genuinely plausible alternative is retained where the evidence is not decisive.

* # Whether the proposed additional evidence could actually discriminate between explanations.

### B1 Stage 4 \- Revise

#### Learner enters

# Field 1 \- Change (maximum 180 words)

# What would you change in the response for the next 72 hours based on what you now know?

# Field 2 \- Retain (maximum 100 words)

# What would you retain from the current response, and why?

# Field 3 \- Monitor and trigger (maximum 120 words)

# What would you monitor next, and what result would cause another material change in strategy?

#### Intended evidence \- reviewer only

# Strong responses should update proportionately. Changing nothing despite material evidence is weak, but changing every action merely because the headline outcome did not improve is also weak. Look for a revised causal model, targeted action, attention to citizen consequences, and explicit monitoring.

## 4.6 Assessment B2 \- Public Grievance Reform: Predicting Institutional Response

# Purpose of variation: non-crisis governance problem focused on institutional incentives, implementation behavior, measurement, citizen outcomes, and unintended effects of performance management.

# Scenario setting: fictional cross-government service-delivery reform. All information required for the task is supplied.

### B2 Stage 0 \- Learner instructions

#### Learner sees

# This assessment uses the same Predict-Observe-Explain-Revise structure as the previous POE-R item, but the system is institutional rather than physical. You will predict how a reform may affect the service system, commit to those predictions, inspect a simulated outcome, explain what may have produced it, and revise the reform.

# You are not expected to know a particular grievance platform or existing government procedure. Use the supplied case facts as authoritative.

# Bullets are welcome. Writing style is not assessed.

### B2 Stage 1 \- Predict

#### Learner sees: situation

# You are the Secretary responsible for a 90-day cross-department initiative to reduce a large public-grievance backlog while improving the quality of resolution.

* # There are 180,000 open grievances across 12 departments.

* # Twenty-four percent of open grievances are older than 90 days.

* # Median time to closure is 23 days.

* # Citizen satisfaction with closed cases is 56 percent.

* # Seventeen percent of cases are reopened within 30 days of closure.

* # Sixty-one percent of all grievances come from four high-volume departments.

* # Twelve percent require action from more than one department.

* # No additional staffing is approved for the first 90 days.

# A reform package is proposed:

* # Publish a department-level dashboard showing backlog, closure time, and age of open cases.

* # Set a 15-day closure target.

* # Automatically escalate unresolved cases after Day 10\.

* # Use dashboard measures in regular senior performance reviews.

* # Use standard closure categories across departments.

* # Require senior review of cases open more than 30 days.

#### Learner enters

# Complete the same three common prediction cards defined in Section 4.4.

# Field 4 \- Critical assumption or dependency (maximum 100 words)

# What assumption, dependency, or interaction is most important to whether your predictions hold?

# Optional field \- External sources used.

#### Submission behavior

# Submit and lock stores the prediction cards and dependency field as B2\_predict. Only then is the 30-day simulated outcome revealed.

#### Intended evidence \- reviewer only

* # Whether the learner predicts effects beyond the intended headline metric.

* # Whether the learner reasons about relationships among throughput, resolution quality, staff behavior, complex cases, and citizen experience without being told which mechanism to identify.

* # Whether the learner identifies a meaningful assumption or dependency rather than simply restating a policy feature.

* # Whether the learner can name evidence that would weaken each prediction.

* # Confidence level itself is not scored.

### B2 Stage 2 \- Observe and compare

#### Learner sees: simulated outcome after 30 days

* # The number of cases closed per month increases by 38 percent.

* # Median closure time falls from 23 days to 14 days.

* # The 30-day reopen rate rises from 17 percent to 22 percent.

* # Citizen satisfaction with closed cases falls from 56 percent to 52 percent.

* # Twenty-two percent of closures use generic categories such as information provided or outside jurisdiction.

* # Transfers of cases between departments increase by 26 percent.

* # The number of cross-department cases open for more than 30 days increases by 18 percent.

* # The oldest 10 percent of cases show little improvement.

* # Closure volume rises noticeably in the final two working days before scheduled senior performance reviews.

* # One department adds a local quality-review step before closure. Its median closure time is 15 days and citizen satisfaction rises to 63 percent.

# The learner's original predictions remain visible and read-only.

#### Learner enters

# For each prediction card, choose one evidence classification:

* # Supported

* # Partly supported

* # Not supported

* # Insufficient evidence

# For each classification, add a brief evidence note identifying the observation(s) that led to the classification. Maximum 60 words per prediction.

#### Submission behavior

# Store the three classifications and evidence notes as B2\_compare. Submit and lock before opening Explain.

#### Intended evidence \- reviewer only

* # Whether the learner recognizes that faster closure and higher volume are real changes without treating them automatically as proof of better service.

* # Whether behavioral traces are interpreted as evidence to explain rather than as a stated causal mechanism.

* # Whether cross-department and older complex cases are incorporated where relevant.

* # Whether the quality-review department is treated as useful comparative evidence without assuming that one comparison proves causality.

### B2 Stage 3 \- Explain

#### Learner enters

# Field 1 \- Most important mismatch (maximum 160 words)

# What is the most important difference between what you expected and what you observed?

# Field 2 \- Strongest explanation (maximum 160 words)

# What is your strongest explanation for that pattern? Identify the evidence that supports it.

# Field 3 \- Plausible alternative (maximum 100 words)

# What other plausible explanation should remain under consideration?

# Field 4 \- Discriminating evidence (maximum 100 words)

# What additional evidence would most help distinguish between your leading explanation and the alternative?

# Optional field \- External sources used.

#### Submission behavior

# Lock the explanation as B2\_explain before opening Revise.

#### Intended evidence \- reviewer only

* # Whether the learner distinguishes outputs such as closure speed from citizen outcomes such as durable resolution and satisfaction.

* # Whether the learner can infer plausible incentive, workflow, capacity, or case-mix mechanisms without assuming malicious intent.

* # Whether the explanation accounts for more than one observed pattern instead of fitting a single statistic.

* # Whether an alternative explanation remains plausible where the available evidence is insufficient.

* # Whether the proposed next evidence would help distinguish among competing mechanisms.

### B2 Stage 4 \- Revise

#### Learner enters

# Field 1 \- Change (maximum 180 words)

# What would you change in the reform for the next 60 days based on what you now know?

# Field 2 \- Retain (maximum 100 words)

# What would you retain from the current reform, and why?

# Field 3 \- Monitor and trigger (maximum 120 words)

# What would you monitor next, and what result would cause another material change in the reform?

#### Intended evidence \- reviewer only

# Look for a proportionate revision that preserves useful accountability while responding to evidence about quality, incentives, complex cases, and citizen outcomes. Do not require any one mechanism or preferred policy design.

## 4.7 Developmental debrief after both POE-R items

# The debrief is part of the learn-by-doing experience but remains locked until both B1 and B2 are complete. No explanatory feedback or model answer is shown after B1 alone.

#### Learner sees

# You have completed two Predict-Observe-Explain-Revise activities. The purpose of this debrief is to examine how your expectations, explanations, and decisions changed when the system behaved differently from what you anticipated.

# For B1 and B2, display a read-only Prediction Trail:

# Prediction \-\> Observed evidence \-\> Evidence classification \-\> Explanation \-\> Revised action

# Do not label any prediction as correct or incorrect beyond the learner's own submitted evidence classification. Do not display a model causal explanation.

#### Learner reflects

# Reflection 1 \- Surprise

# Where were you most surprised by the observed evidence, and what assumption did that reveal?

# Reflection 2 \- Updating

# In which case did you change your view most, and what evidence caused the change?

# Reflection 3 \- Unresolved uncertainty

# Where did the evidence remain insufficient to choose confidently between explanations?

# Reflection 4 \- Future practice

# The next time you make a prediction about a complex governance system, what will you do differently in how you frame assumptions, look for evidence, or revise your decision?

#### Prototype behavior

# The reflections may be optional and unscored in the first prototype. If captured, store them separately from assessment scores so developmental reflection is not mistaken for evidence from the two scored POE-R items.

# Button: Complete Format B.

# 5\. Evidence map across the four prototype items

## A1 Flash Flood and Transport Disruption

Primary evidence: problem framing and systems diagnosis; strategic prioritisation; decision quality and trade-offs; stakeholder alignment strategy; institutional execution and delegation; adaptation under uncertainty.  
Secondary evidence: evidence use; ethical and citizen-centred judgement.

## A2 LPG Supply Disruption

Primary evidence: evidence use; prioritisation; trade-off reasoning; ethical and citizen-centred judgement; institutional execution; adaptation.  
Secondary evidence: systems diagnosis; stakeholder communication and alignment strategy.

## B1 Air Quality POE-R

Primary evidence: systems diagnosis; evidence use and critical analysis; decision quality after new evidence; adaptation under uncertainty. Causal reasoning is the elicitation mechanism rather than a separate scored competency.  
Secondary evidence: strategic and system-level prioritisation; citizen impact.

## B2 Public Grievance Reform POE-R

Primary evidence: systems diagnosis; evidence use and critical analysis; decision quality after new evidence; adaptation under uncertainty.  
Secondary evidence: institutional awareness; incentives and execution; citizen-centred service quality.

## Interpretation boundary

These are prospective simulations. They can provide evidence about judgement demonstrated in the task, but they do not prove how the officer behaves in the workplace. In particular, simulated stakeholder planning should not be treated as direct observation of actual influence, collaboration, or team leadership.

# 6\. Prototype implementation contract for Codex

## 6.1 Scope of the first GitHub prototype

The purpose of the first implementation is design review, not secure assessment delivery. It should let CBC reviewers experience the learner flow, compare the two formats, and see exactly when information is revealed and responses are locked.  
Implement four selectable demo assessments with stable IDs:

* A1\_FLOOD \- Progressive Decision Simulation.  
* A2\_LPG \- Progressive Decision Simulation.  
* B1\_AIR\_POE \- Predict-Observe-Explain-Revise.  
* B2\_GRIEVANCE\_POE \- Predict-Observe-Explain-Revise.

## 6.2 Recommended screens

* Landing page: short explanation of the two formats and cards for all four assessments.  
* Assessment intro screen: learner role, approximate time, open-book note, and stage sequence.  
* Stage screen: current case information on the left or top; current response form on the right or below.  
* Read-only prior-response panel on every post-submission stage.  
* Submission confirmation modal with the exact locking language defined in Section 2.3.  
* Completion screen summarising which stages were submitted and offering a session export for prototype testing. Show the Format A developmental debrief only after both A1 and A2 are complete, and the POE-R Prediction Trail only after both B1 and B2 are complete.  
* Reviewer-mode overlay or side panel showing intended evidence and hidden future stages.

## 6.3 State model

Each assessment session should maintain at minimum:

* assessmentId  
* demoParticipantId  
* mode: learner or reviewer  
* currentStage  
* stageStatus for every stage: locked, current, submitted, or notYetAvailable  
* draftAnswers for the current stage  
* submittedAnswers as immutable snapshots  
* submittedAt timestamp for every locked stage  
* sourceLog for each applicable stage  
* suggestedTimer value and elapsed time if displayed  
* Format completion status so each developmental debrief unlocks only after both items in that format are complete.

In the demo, application state may be stored in localStorage so a refresh does not erase progress. Add a visible Reset demo action only in Reviewer mode or on the completion page.

## 6.4 Locking logic

The user interface must never call an update handler for a submitted stage. Submitted answers should be copied into a separate immutable submittedAnswers object rather than continuing to reference the editable draft object.  
When Submit and lock is confirmed:  
1\. Validate required fields and word limits.  
2\. Copy the current draft into submittedAnswers.  
3\. Store submittedAt.  
4\. Mark current stage submitted.  
5\. Mark the next stage current.  
6\. Persist state.  
7\. Render the prior stage as read-only.  
For a production assessment, the same transition would need to happen on a trusted server. Client-side locking is sufficient only for the demonstration prototype.

## 6.5 Information reveal rules

Format A: Stage 2 case injects must not display until Stage 1 is submitted. The fixed Stage 3 decision challenge must not display until Stage 2 is submitted. The developmental debrief must remain locked until both A1 and A2 are complete.  
Format B: simulated Observe data must not display until Predict is submitted. Evidence classifications must be submitted before Explain becomes editable. Explain must be submitted before Revise becomes editable. The POE-R developmental debrief must remain locked until both B1 and B2 are complete.  
For the demo, future content may exist in the application bundle because this is not a security test. For a real assessment, unrevealed information should be delivered from a backend only after the relevant submission event.

## 6.6 Form behavior

* Show a live word count beside every text area with a stated limit.  
* Prevent submission when a required field is empty or over the limit.  
* Autosave current drafts after short pauses and on field blur.  
* Use explicit labels rather than placeholder-only instructions.  
* Confidence in POE-R uses a three-option control: High, Medium, Low. Capture confidence as unscored metadata in the first prototype. The Observe-and-compare step uses a four-option control: Supported, Partly supported, Not supported, or Insufficient evidence.  
* On later stages, show the learner's earlier submitted text exactly as submitted, not a summary generated by the application.  
* External sources used is optional in the prototype and accepts URLs plus a short note.  
* Do not score spelling, grammar, or response length beyond enforcing reasonable limits.

## 6.7 Decision challenge and developmental debrief behavior

Format A is fully asynchronous in the first prototype. Stage 3 demonstrates reasoning under challenge through a fixed counterargument rather than a live assessor interaction.  
Learner mode: after Stage 2 is submitted, reveal the case-specific decision challenge, the Maintain / Modify / Reverse selector, and the associated justification fields.  
Reviewer mode: allow reviewers to preview the hidden decision challenge and intended evidence for each stage without unlocking it for the learner session.  
After both A1 and A2 are complete, unlock the Format A developmental debrief. Do not show a model answer or coaching after A1 alone, because that could change performance on A2.  
After both B1 and B2 are complete, unlock the POE-R Prediction Trail and developmental reflection. Do not show a model causal explanation or explanatory coaching after B1 alone, because that could change performance on B2.

## 6.8 Suggested configuration structure

Keep case content and interaction logic separate. Each assessment should be represented by a configuration object containing title, format, learner role, stages, visible case facts, input fields, word limits, reviewer-only rationale, and next-stage rules.  
This will let CBC change case wording, timings, or injects without rebuilding the entire interface.

## 6.9 Accessibility and usability requirements

* Responsive layout that works on laptop and tablet widths.  
* Keyboard-accessible forms, confirmation modal, and navigation.  
* Clear focus state and error messages tied to the relevant field.  
* Do not rely on color alone to indicate draft versus submitted state.  
* Use readable line length for long case facts.  
* Keep the Submitted and locked state visually obvious.  
* Provide a simple progress indicator but avoid showing future case information.

## 6.10 Prototype features intentionally out of scope

* Real participant authentication.  
* Secure server-side exam controls.  
* Automated scoring or AI-generated feedback.  
* Video-conferencing integration.  
* Camera recording.  
* Plagiarism or AI detection.  
* Final psychometric scoring thresholds.  
* Integration with iGOT.  
* Production data retention or consent workflow.

## 6.11 Optional demo export

At the end of an assessment, Reviewer mode may offer Download session JSON. The exported file should contain the stage IDs, submitted responses, confidence selections, timestamps, and source logs. This makes it easy to inspect whether the locking and reveal logic worked without building a backend.

# 7\. What the prototype should help CBC decide

The first review should stay focused on a small number of design decisions rather than asking CBC to approve every wording detail.

* Does either assessment format match the kind of evidence CBC wants from the problem-based assessments?  
* Does the fixed asynchronous decision challenge add useful evidence beyond the initial response and information-update stages?  
* Does POE-R add useful evidence about systems thinking and learning agility while remaining practical enough to administer asynchronously?  
* Which case types feel most authentic for the target officers, and where would CBC want subject matter review before piloting?

# 8\. Design notes before any pilot

Case facts and simulated outcomes should receive subject matter review for plausibility. That review should confirm realism without turning the case into a domain-knowledge test.  
Timing and word limits should be tested with a small set of representative users. They are not psychometric standards at this stage.  
Raters for Format A need common rubric anchors and calibration examples so the same written evidence is interpreted consistently across A1 and A2.  
Pilot responses should be used to refine rubric anchors and identify whether any prompt unintentionally cues the desired reasoning.  
If both formats are retained, they should be treated as complementary sources of evidence rather than assumed to be interchangeable or equated without data.