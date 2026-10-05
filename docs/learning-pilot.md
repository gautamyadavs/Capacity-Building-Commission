> Historical reference: superseded for the active diagnostic by KALP-ALIGN-04 and the six live Drive originals. These earlier tasks, limits and learning/transfer proposals do not govern current delivery. See [current verification](diagnostic-verification.md). Do not run the historical extractor to replace diagnostic content.

# Two-case learning pilot: rationale and evaluation protocol

## Status and intended use

This release implements the proposed learning flow. The human pilot has not yet been conducted. Timings and response maxima are provisional. The supplied think-aloud transcript is one participant's account: it identifies possible task ambiguity, information-search effort and weak perceived learning value. It does not establish that all civil servants find the cases too difficult, or that staged reasoning is ineffective.

The design retains demanding prioritisation, causal reasoning, uncertainty and counterarguments. It makes the requested task explicit, brings relevant references into the response flow, and gives the learner a chance to apply review to a separate amendment. Reducing effort spent searching for an ambiguous referent is a design hypothesis; scenario complexity itself is not treated as evidence of learning.

The cognitive-load rationale is informed by [Sweller, van Merriënboer and Paas (2019)](https://link.springer.com/article/10.1007/s10648-019-09465-5), which distinguishes task complexity and learner knowledge from demands created by instructional presentation. The review-and-amendment rationale is informed by [How People Learn II, chapter 7 (2018)](https://www.nationalacademies.org/read/24783/chapter/9), which discusses feedback and opportunities to use it. These sources motivate the choices; they do not validate these cases or this implementation.

## Distinct reasoning elicited by each stage

| Episode and stage | Requested reasoning | Design rationale to investigate |
| --- | --- | --- |
| Flood: initial judgement, 200 words | Frame the central problem; justify priorities for the next 6 hours and direction for the following 72 hours. | Makes the initial decision and its grounds visible before later information. |
| Flood: execution, 150 words | Allocate transport capacity and coordinate institutions for the next 6 hours. | Tests whether stated priorities can become an executable response under competing demands. |
| Flood: update, 160 words | Decide what new information materially changes and what remains justified. | Elicits proportionate revision rather than automatic reversal or unexamined persistence. |
| Flood: challenge, position selector and 170 words | Answer a strong counterargument; identify an obligation, accepted trade-off and condition for reconsidering. | Makes value conflicts and the limits of commitment explicit. The position selector is unscored. |
| Flood: guided review, 100-word amendment | Compare original reasoning with commentary and apply one improvement. | Preserves the original attempt and reveals a learner's chosen reasoning change before the second episode. |
| Air Quality: prediction, two cards (35-word prediction and 60-word explanation each), plus 60-word assumption | Predict observable results of the supplied 48-hour package and explain expectations and a critical dependency. | Elicits explicit causal expectations before simulated outcomes are known. Confidence is unscored. |
| Air Quality: comparison, 35-word note per card | Compare each locked prediction with the simulated outcomes at 48 hours. | Separates expectations from outcomes and surfaces mismatch or uncertainty. Classifications are unscored. |
| Air Quality: explanation, 120-word pattern and 150-word account | Describe the pattern, propose a causal account and consider an alternative. | Distinguishes a plausible interpretation from a demonstrated cause. |
| Air Quality: revision, 180 words | Reconsider the supplied 48-hour package for the next 72 hours; state changes, retained elements, trade-off and monitoring condition. | Asks for a response to the supplied policy package, rather than implying that learners previously chose it. |
| Air Quality: three evidence checks | Select the best-supported interpretations of the simulated outcomes. | Checks specific inference limits after open reasoning is locked. Existing items and explanations are unchanged. |
| Air Quality: guided review, 100-word amendment | Use case commentary and selected-response explanations to improve one part of the original reasoning. | Investigates whether the learner can use feedback, without automatically assessing the individual's writing. |

The order is Flood → review/amendment → pause or continue → Air Quality → review/amendment → final review. It allows an insight from the first episode to inform a second attempt. Do not infer transfer from an amendment that directly follows the commentary: the commentary itself may supply the reasoning.

## Content and interface safeguards

All substantive original Flood and Air Quality scenario facts, numbers, uncertainty and competing demands remain. The 07:00 flood timing and air-quality readings are reorganised into timelines; resource paragraphs are retained in neutral tables. Original response maxima and both prediction cards remain. Learner labels consistently call fictional observations “Simulated outcomes.” During review, commentary explains how outcomes support some interpretations while leaving alternatives uncertain.

The supplied 48-hour package and outcomes are visible at Air Quality revision. Full earlier briefings and immutable submissions remain in expandable references. The desktop task header is compact and sticky; the form is not sticky. Mobile uses one page flow. Writing guidance appears once, browser spellcheck remains ordinary, and pause/resume uses local-browser persistence. No speech service, video generation, automated scoring, feedback API or telemetry has been added.

Review commentary offers two defensible approaches with different trade-offs. It is case-specific general guidance and explicitly does not claim to have evaluated the learner's response. Original answers, evidence-check selections and amendments are immutable once submitted. Evidence-check feedback is released only after the Air Quality reasoning and checks are submitted; the final review contains each of the three results once.

## Recruitment and procedure

Recruit a purposive small pilot spanning newer and experienced civil servants, different functions, relevant scenario familiarity, device sizes and accessibility needs. A suggested initial formative sample is 8–12 participants, sufficient to investigate recurring difficulties but not an efficacy trial. Record experience bands without names or identifying office details. Obtain consent for observation, optional recording and sharing response exports; participation and recording should be voluntary and unrelated to employment appraisal.

Use the normal learner route and a fresh local run. Explain that the supplied case facts are sufficient and that the task does not grade writing mechanics. Do not coach case priorities or reveal outcomes before the application does. Ask participants to say what task they think they are answering and explain information searches; log facilitator help. Think-aloud can affect timing and performance, so record whether it was used and avoid combining its timings uncritically with silent runs.

1. Before the pilot, administer one short unfamiliar decision task, described below, without commentary or coaching.
2. Observe Flood through its amendment. Record task interpretation, searches, timings, abandoned or paused stages and the reasoning changed in the amendment.
3. Let the participant choose to pause or continue. If pausing, use a later session on the same browser; distinguish active work from elapsed time and record successful draft recovery.
4. Observe Air Quality through its amendment and final review. Ask which specific idea, if any, from Flood informed this episode. Record the answer, without treating it as demonstrated transfer.
5. Administer the matched unfamiliar post-task without access to case commentary, then conduct a brief interview about perceived usefulness and remaining ambiguities.
6. With consent, collect the JSON export and observation log under a study ID. Store recordings and identifiable consent records separately under the organisation's agreed research process. The application itself collects no analytics.

## Observation log

Use one row per event or stage. Stage times include reading and response work; exclude recorded breaks. Record actual times rather than interpreting suggested times as expected performance.

| Field | Recording guidance |
| --- | --- |
| Participant / session / experience band | Study ID, session number, relevant experience and case familiarity. |
| Stage / device / mode | Stage ID, viewport/device and silent or think-aloud mode. |
| Active start / finish / pause duration | Record active minutes separately from elapsed time across sessions. |
| Task interpretation | Participant's stated decision, referent and time horizon; whether these match the prompt. |
| Misinterpretation and consequence | Ambiguous referent, wrong horizon or mistaken expected response; observable effect. |
| Information search | Facts/reference sought, expansions, backward navigation, repeated searching and time lost. |
| Facilitator intervention | Exact clarification or help; distinguish prompted from independent success. |
| Completion / abandonment | Submitted, saved for later, or stopped; stage and stated reason. Include partial runs in the denominator. |
| Reasoning amendment | Part chosen, change claimed, and human comparison with the original. |
| Technical behaviour | Reload recovery, stale-tab conflict, lost draft, inaccessible control or layout obstruction. |

Optional interview prompts: “What did you think you needed to decide here?”, “Which information did you search for?”, “What did the review help you change?”, and “What would you carry into a different problem?” Keep usability reactions separate from evidence about reasoning.

## Matched unfamiliar tasks and human review

Two provisional forms are supplied in [pilot-transfer-tasks.md](pilot-transfer-tasks.md): delayed household support payments and delayed small-business permit renewals. They are outside Flood and Air Quality and are not validated tasks. Subject-matter reviewers must check clarity, plausibility and form equivalence before recruitment. They match role, competing demands, uncertain information, horizons, resource capacity and response maxima. Avoid reusing distinctive pilot facts or commentary phrases when adapting them.

Each form should collect an initial justified response, then disclose a short update and a counterargument, and collect a revision with a monitoring condition. Keep initial responses unavailable for editing; allow them to be read. Use equal task time and response allowance for both forms. Counterbalance which form is used before and after the pilot. Withhold task feedback until the post-task is finished. Record prior domain familiarity, language/access needs, facilitator intervention and breaks as possible alternative explanations.

Human reviewers should use the following provisional reasoning criteria. Rate each independently as 0 (absent or contradicts supplied facts), 1 (present but weakly connected or incomplete), or 2 (explicit, coherent and supported). Record a short response excerpt or rationale for each rating. This is a research rubric, not an app score or a validated competence scale.

| Criterion | Evidence sought |
| --- | --- |
| Problem and priorities | Identifies the decision and horizon, acknowledges competing demands and justifies priorities. |
| Facts to reasons | Connects specific supplied facts to the proposed response without inventing certainty. |
| Execution | Recognises resource constraints, responsible institutions and workable coordination. |
| Causal account and uncertainty | Explains a plausible mechanism, acknowledges a serious alternative or information limit. |
| Proportionate update | Explains what changed, what remains justified and why. |
| Counterargument and trade-off | Engages the strongest objection and names an accepted cost or obligation. |
| Monitoring condition | States an observable condition that could prompt material reconsideration. |

Use at least two reviewers trained on separate calibration responses. Remove study IDs and pre/post labels where feasible, randomise review order, compare independent ratings and document disagreement before reconciliation. Reviewers may be able to infer task form; report that limitation. Do not reward a particular policy action when a different action is coherently defended within the facts. Do not score grammar or writing polish.

Report criterion-level pre/post changes, disagreements and illustrative reasoning changes, alongside completion, burden and search patterns. A small pilot without a comparison group cannot isolate the learning flow's effect from practice, domain differences, facilitator help or selection. A later study with a comparison condition and delayed unfamiliar task would support stronger investigation of transfer.

## Interpretation and next decision

Improved navigation, lower search effort and higher completion support feasibility. They do not establish learning. Better amendments show use of immediate review; improved reasoning on a fresh task is the relevant transfer signal. Claims about leadership development require further validation beyond this pilot.

After observing both experience bands, decide whether the prompts and supplied-package reference are understood, whether review produces a substantive reasoning change, and whether burden or accessibility prevents completion. Document the evidence and uncertainties before changing content, timings or limits again. This release does not pre-empt those findings.
