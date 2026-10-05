# Bharat KALP developmental diagnostic

KALP-ALIGN-04 implements four fictional cases: A1 flood response, A2 LPG continuity, B1 air quality and B2 grievance reform. Both sets form one developmental diagnostic occasion under open-book and generative-AI-permitted conditions. Eight objectives map to ten descriptive criteria; there is no automated scorer, total, numeric conversion, programme weighting or pass/fail result.

The six existing [live Drive originals](https://drive.google.com/drive/folders/1pqGVTy0J5DPEv6u8Uvk9fWY0vCff9rtc) remain the design authority. They were read through the connector on 2026-10-04 before implementation. Source identities, titles, links and observed document revision IDs are recorded in application content. Focused Framework V5 is retained. Repository content is an implementation transcription, not a replacement design source. Read the originals again before changing diagnostic content; do not run the historical extractor.

## Run and verify

Use Node >=22.12 and npm.

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
BASE_PATH=/Capacity-Building-Commission/ npm run build
BASE_PATH=/Capacity-Building-Commission/ npm run preview
```

The production browser suite uses the actual Pages subpath. Set `BROWSER_EXECUTABLE` to an installed Chrome executable if needed. The default-branch workflow deploys to Pages; implementation and review belong on a branch and pull request. The workflow and Vite base-path behavior remain in place.

Routes: `#/learner`, `#/learner/review`, `#/learner/files`, and `#/reviewer`. Hash routing avoids server rewrite requirements. Assets use `import.meta.env.BASE_URL`.

## Officer flow

The proposed starting order is A1, A2, B1, B2, with actual case starts, phase reveals and submissions recorded. Each case has two phases. Set A elicits A.P1-A.P4 initially and A.P5-A.P6 after the update. Set B elicits B.P1-B.P2 initially and B.P3-B.P4 after results. B.P4 updates the supplied intervention against the original account/prediction; no separate prior officer-authored plan is required.

Initial submissions persist before update facts appear. Updates have separate snapshots; earlier facts, prompts and exact submissions remain accessible while writing. Drafts can be paused and recovered. Concise responses, bullets and long responses are accepted. Blank fields stay blank and do not become Developing. There are no confidence/source logs, MCQs, timers, word ceilings, required amendments, mandatory practice or AI-use penalties.

The officer may explicitly end early. Available submissions and recovery drafts are retained, and unfinished or unrevealed prompt opportunities are recorded. Drafts are not submitted evidence. Substantive coaching, case-specific feedback and authored examples are absent from active learner phases. Completion or explicit end releases the record for review. Without actual human-review records, the view says Awaiting review.

## Human review and file transfer

1. The officer exports an ended session from Submissions and human review.
2. A reviewer opens the separate local reviewer workspace and explicitly imports that session. Active sessions are rejected.
3. The reviewer reads captured facts, exact responses, descriptors and evidence rules, then records each case/criterion judgement. Each record includes reviewer, versions, prompt/phase, an exact excerpt or precise location, rationale, supported strength/gap or limitation, and a relevant next opportunity where available. Update criteria also locate the preserved prior reasoning. Relevant evidence elsewhere in the same phase can contribute.
4. Initial primary judgements and later supplementary evidence remain distinct. Insufficient evidence and Not elicited are evidence statuses; Uncertain is a separate review status requiring competing interpretations and further review. Missing evidence requires an elicitation opportunity. These are not numeric levels.
5. The reviewer exports saved reviews; the officer imports that file. A SHA-256 consistency binding rejects a different run, changed evidence record, captured task/rubric or version. Records merge by immutable IDs. Revisions identify and retain their earlier record; independent rater records and disagreements remain visible. No averaging or adjudication is automatic.

Reviewer drafts save locally. Switching criterion/revision targets archives the previous draft for recovery. A workspace-and-draft export can be restored through the reviewer backup import. Recovery downloads also preserve archived raw workspace records. Independent raters can use separate browser profiles, export their original judgements, then import records for comparison. This supports calibration work; it does not establish rater reliability.

The thirty fragments in the reviewer reference are authored illustrations with intended interpretations, not empirical anchors or automatically personalised feedback. Reference material is loaded on request after an ended-session import and checked against captured source revisions. Example review and calibration remain pending before operational interpretation. Practice, related task authoring, P7 delivery and D15 stay optional and pending; there is no placeholder practice task.

## Saving, versions and recovery

Every schema-3 run captures the entire task/rubric implementation content, source metadata, phase versions and support notes. Loading newer release content does not replace an existing run's facts, prompts or descriptors. A new run is required to use revised content. Review records are stored separately, leaving the ended session immutable.

Local keys are scoped by deployment base path and workspace. Draft journals write synchronously and flush after 500 ms, on blur/navigation and when the page hides. Web Locks serialize learner transactions where supported; storage events and transaction checks prevent stale submissions or old runs from being revived. Reviewer writes detect a changed workspace rather than overwriting another tab. Storage failures show Not saved, keep available in-memory work, and offer export/retry paths.

Existing v1/v2 pilot keys, journals and backups are left intact. They are available as original key/value strings in the browser recovery download and are never reinterpreted under the new diagnostic. Reset/import archives the previous saved schema-3 run first; unreadable storage is preserved before explicit recovery. Clearing browser data can remove all these records, so exported backups matter.

This is a static React/Vite prototype with no backend, authentication, telemetry, cross-device synchronization or secure concealment. Client-side route gates provide the intended sequence; shipped content can be inspected outside that sequence. Review bindings check file consistency, not reviewer identity or authenticity.

## Verification and remaining evidence

See [diagnostic verification](docs/diagnostic-verification.md) for D01-D14 and D16-D20 evidence, observed paths, content provenance, and the distinction between software checks and pending human evidence. D15 is deferred.

Subject-matter review, representative-officer initial/update responses, authored-example review and independent-rater calibration remain pending before operational interpretation. Actual teaching exposure and further evidence are required for programme-learning claims. Passing software checks establishes neither CBC approval, reliability, learning gains nor full WCAG conformance.

Historical pilot documentation and fixtures are retained for context and raw-data recovery. Their tasks, scoring assumptions and transfer proposals do not govern KALP-ALIGN-04.
