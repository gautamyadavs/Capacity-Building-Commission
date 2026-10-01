# Bharat KALP assessment

A browser-based learner experience for four simulated governance cases. Learners complete the cases in order: Flash Flood and Transport Disruption → LPG Supply Disruption → optional break → Air Quality Emergency → Public Grievance Reform → final review.

## Run and verify

Use Node >=22.12 and npm.

```sh
npm ci
npm run dev
npm run check       # TypeScript and content/model/persistence/component tests
npm run build       # Production static build
npm run preview
npx playwright install chromium
npm run test:e2e    # Production browser flows under a project subpath
```

There is no separate lint command configured. Browser tests use isolated profiles and run accessibility checks with axe. If needed, use an installed Chrome executable with `BROWSER_EXECUTABLE` when running `npm run test:e2e`.

## Learner flow

The landing page presents the four cases and saved progress. Only the next available case can be started. Submitting each stage locks its exact response before revealing the next stage. Earlier responses remain readable. Prediction stages use two identical cards; confidence, comparison classifications, and position choices are unscored metadata.

After Case 2, learners can continue immediately or return to the home page and resume later. Case-completion screens contain a neutral acknowledgement. Evidence-check choices lock on submission, with all seven results and explanations deferred until all four cases are fully submitted. The final review contains four collapsible response trails, a brief reasoning-process note, and one optional reflection capped at 150 words. The reflection autosaves and can be submitted and locked. No assessment scores or automated evaluation of open responses are generated.

The learner deployment has no reviewer toggle, preview workspace, or public reviewer content. Old pairwise debrief URLs redirect to the final review, which still checks full completion. The previous reviewer route redirects to the learner home.

## Content and architecture

`public/content/assessments.json` is the current content source. It contains the supplied scenario facts, staged prompts, word maxima, times, prerequisite references, per-assessment prediction configuration, evidence checks with stable option IDs and deferred feedback, and final review copy. Zod validates it when the app loads. Stage presentation and progression use content configuration rather than case-ID branches.

`src/model.ts` provides the configuration and state schemas, field expansion, validators, sequential case/stage availability, intermission eligibility, final-review eligibility, and immutable submission snapshots. `src/persistence.ts` manages browser saves and cross-tab synchronization. `src/components/Assessment.tsx` presents stage forms; `src/components/Debrief.tsx` now presents the single final review.

The historical `docs/source-specification.md` and `scripts/extract_spec.py` describe the previous content version. The original importer does not generate the revised design and would overwrite the current JSON; do not run it to update this version. Edit the current configuration and its contract tests together.

## Local state

The state schema is version 2. Storage keys are scoped by deployment base path, schema version, and mode. Drafts update immediately, autosave after 500 ms, and flush on blur, navigation, page hiding, and tab closure. Synchronous, run-scoped journals retain the latest text and choices when reload happens before the debounce.

Submitted answers are deep-copied and persisted before navigation advances. Web Locks serialize saves across tabs where supported; storage events update other tabs. Stale drafts cannot overwrite locked submissions, and stale tabs cannot revive a reset run. Failed writes keep the current stage open and display a retryable error. Malformed current storage is preserved for download and explicit recovery.

The old version-1 questions have different response structures, so their submissions are incompatible. On upgrade, the new assessment begins safely and the old version-1 storage remains intact. For subsequent content changes, each case has its own content version: compatible completed cases are retained, while the changed case and any dependent later progress restart. A backup preserves the original version-2 data. Changes to prompts, fields, prerequisites, or answer options must increment the affected case's `contentVersion` and the overall content version.

The saved run includes all four sessions, drafts and locked snapshots, selected choices, predictions and confidence, comparisons, intermission state, and the separate optional reflection. A downloadable JSON copy is available on the final review page. Responses stay in this browser unless the learner downloads and shares them. Clearing browser data removes local progress; there is no cross-device synchronization, backend, authentication, analytics, or AI scoring.

Client-side locks provide the staged experience; the static content file can still be inspected outside normal learner navigation.

## Accessibility

Forms use associated labels, radio fieldsets and legends, live accessible word counters, field-linked validation, visible focus, and a keyboard-accessible native confirmation dialog. Locked responses use text rather than editable controls. Progress and save states have text labels. Pages adapt to laptop, tablet, and narrow screens; suggested times have no countdown or automatic submission.

## GitHub Pages

The existing `.github/workflows/pages.yml` workflow and Vite base-path configuration are unchanged. The workflow verifies types and tests, runs browser flows under a project subpath, builds the static site, and deploys the default branch through GitHub Pages. Hash routing avoids server-side path rewrites; assets and content load relative to `import.meta.env.BASE_URL`.

Learner route: [Bharat KALP assessment](https://gautamyadavs.github.io/Capacity-Building-Commission/#/learner).

For a local check of the deployment path:

```sh
BASE_PATH=/Capacity-Building-Commission/ npm run build
BASE_PATH=/Capacity-Building-Commission/ npm run preview
```

Open `/Capacity-Building-Commission/#/learner`. The final review is at `#/learner/review` and is accessible only after all required submissions.
