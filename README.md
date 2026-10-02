# Bharat KALP learning assessment

A two-episode learning pilot for mixed-experience civil servants: Flash Flood and Transport Disruption → guided review and amendment → pause/continue → Air Quality Emergency → guided review and amendment → final review.

## Run and verify

Use Node >=22.12 and npm.

```sh
npm ci
npm run dev
npm run check       # TypeScript and content/model/persistence/component tests
npx playwright install chromium
npm run test:e2e    # Production browser flows under a project subpath
BASE_PATH=/Capacity-Building-Commission/ npm run build
npm run preview
```

There is no separate lint command configured. Browser tests use isolated profiles and run accessibility checks with axe. An installed Chrome can be selected with `BROWSER_EXECUTABLE` when running `npm run test:e2e`.

## Learner flow

The compact workspace explains the learning purpose, presents both episodes and saved progress, and offers a single start/resume action. Learners may pause at any stage and resume their saved draft on the same browser. Provisional times include review; existing response maxima are retained. Writing guidance is stated once. Ordinary browser spellcheck is allowed.

Flash Flood retains initial judgement, execution, new information and a decision challenge. Air Quality retains two prediction cards, comparison with simulated outcomes, explanation, revision of the supplied 48-hour package, and three existing evidence checks. The package and outcomes are directly available at revision; full earlier briefings and locked responses are expandable references. Timelines and neutral resource tables retain the scenario facts, numbers, uncertainty and competing demands.

Submitting a stage locks the exact response before later information appears. Each case ends with **Review your reasoning**: original submissions, case-specific commentary with two defensible approaches and different trade-offs, and one required, unscored amendment capped at 100 words. Commentary is general guidance, not an automatic evaluation of the learner's individual response. The amendment is a separate immutable snapshot; it never overwrites the originals.

Flood's amendment unlocks the pause/continue boundary. Continuing unlocks Air Quality. Air Quality's three existing selected-response explanations appear in its guided review only after all open reasoning and selected responses are locked. The final review requires both amendments and contains those three results exactly once, two response trails including the amendments, and the separate optional 150-word reflection. No automated scoring or feedback service is used.

The learner deployment has no reviewer toggle, preview workspace or public reviewer content. Existing pairwise debrief URLs redirect to the gated final review; the former reviewer route redirects to the learner home.

## Content and architecture

`public/content/assessments.json` is the current source. It defines two cases, tasks, stage rationale, facts, timelines, table row labels, focused references, prompts, word maxima, prerequisites, prediction cards, review commentary and selected-response feedback. Zod validates it on load. Case counts and continuation labels come from configuration. The stage model includes `review`; review must be final, require every preceding stage, and contain exactly one required, unscored, 100-word amendment.

`src/model.ts` handles schemas, field expansion, sequential gates, per-case feedback availability, completion and immutable snapshots. `src/persistence.ts` retains the existing browser saves, journals and cross-tab synchronization. `src/components/Assessment.tsx` presents the workspace and guided reviews. `src/components/Feedback.tsx` shares the guarded feedback renderer with the final review.

`tests/fixtures/four-case-v2.json` preserves the previous release for migration tests and exact scenario-fact and MCQ invariance checks. The historical `docs/source-specification.md` and `scripts/extract_spec.py` describe earlier content. Do not run the importer to update this pilot: it would overwrite the revised configuration. Edit current content and its contract tests together.

The stage-by-stage rationale and human pilot protocol are in [docs/learning-pilot.md](docs/learning-pilot.md), with provisional matched pre/post tasks in [docs/pilot-transfer-tasks.md](docs/pilot-transfer-tasks.md). These are hypotheses requiring pilot validation, not a claim that the experience has demonstrated learning or leadership development.

## Local state and migration

The state schema remains version 2. Keys remain scoped by deployment base path, schema version and mode. Drafts update immediately, autosave after 500 ms and flush on blur, navigation, page hiding and tab closure. Synchronous, run-scoped journals preserve edits when reload beats the debounce. Amendments reuse this same mechanism.

Submissions are deep-copied and persisted before navigation. Web Locks serialize saves where supported; storage events synchronize other tabs. Stale drafts cannot overwrite locked originals or amendments, and stale tabs cannot revive a reset run. Failed writes keep the response open with a retryable error. Malformed current storage is preserved for download and explicit recovery.

The overall content version is `learning-pilot-2026-10-01-v3`; both changed case versions advance from `four-cases-v2` to `four-cases-v3`. Old four-case progress is incompatible because both retained cases have revised prompts, context and review stages, so both restart. Existing dependency migration removes obsolete LPG and Grievance sessions, resets the intermission and reflection, and preserves the original run in the existing local backup. Incompatible or obsolete draft journals and the old reflection journal are also backed up before removal, preventing them from repopulating restarted stages. Compatible earlier case progress remains supported for later content-only upgrades. Version-1 storage remains intact under its original key.

A saved pilot run contains the two sessions, drafts, locked originals and amendments, predictions and confidence, comparisons, choices, pause/continue state and optional reflection. A JSON download is available in the final review. Data stays in this browser unless the learner downloads and shares it. Clearing browser data removes local progress. There is no cross-device synchronization, backend, authentication, telemetry, external writing assistance or AI scoring.

Client-side gates provide the staged experience; static content can still be inspected outside normal navigation.

## Accessibility and deployment

Forms have associated labels, radio fieldsets, accessible word counters, field-linked errors, visible focus and a keyboard-accessible confirmation dialog. Locked responses are text. Tables have captions and row/column headers. The compact task header is sticky on sufficiently large desktop screens; forms remain in the page flow and mobile has one reading flow without competing scroll areas. There is no countdown or automatic submission.

The existing `.github/workflows/pages.yml` and Vite base configuration remain unchanged. The workflow verifies types/tests, runs browser flows under a project subpath, builds and deploys the default branch through GitHub Pages. Hash routing avoids server-side rewrites; assets and content use `import.meta.env.BASE_URL`.

Learner route: [Bharat KALP learning pilot](https://gautamyadavs.github.io/Capacity-Building-Commission/#/learner).

For a local check of the deployment path:

```sh
BASE_PATH=/Capacity-Building-Commission/ npm run build
BASE_PATH=/Capacity-Building-Commission/ npm run preview
```

Open `/Capacity-Building-Commission/#/learner`. Final review is at `#/learner/review`, after both episodes and their amendments.
