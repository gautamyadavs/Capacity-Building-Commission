# Bharat KALP assessment prototype

A complete, asynchronous design-review prototype for India's Capacity Building Commission. It implements two Progressive Decision Simulations and two Predict–Observe–Explain–Revise assessments from the [CBC interaction specification](https://docs.google.com/document/d/1mzUrzMVI76GCWrWZDQud1zUF3KwtNDkSZcj0TiffTUc/edit).

This is a working design, not an approved Bharat KALP assessment. Case facts are simulated; suggested timings and limits are prototype assumptions. No assessment scores, model answers, or AI feedback are generated.

## Run locally

Use Node 24 LTS (Node >=22.12 is required) and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173`. No environment secrets or services are required.

```sh
npm run check       # TypeScript + unit/component/content checks
npm run build       # Static dist/ artifact
npm run preview    # Preview the production build
npx playwright install chromium
npm run test:e2e    # Browser tests against a production build under /bharat-kalp/
```

If the browser download is unavailable, use an installed Chrome executable:

```sh
BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

Tests launch isolated browser profiles; they do not use a personal browser session. CI installs Chromium and its Linux dependencies.

## Experiences

| Format | Assessments | Submissions |
|---|---|---|
| A — Progressive Decision Simulation | `A1_FLOOD`, `A2_LPG` | Initial decision → New information and update → Decision challenge |
| B — POE-R | `B1_AIR_POE`, `B2_GRIEVANCE_POE` | Predict → Observe and compare → Explain → Revise |

Learners can choose any of the four demos. Within a case, each submission locks before the next information or response stage becomes available. Stage names may be visible in navigation; future content is absent from the learner DOM. Earlier submissions render as read-only text, never editable fields.

Format A's debrief requires both A1 and A2. Format B's combined Prediction Trail and debrief require both B1 and B2. There is no interim coaching, model answer, or score. Developmental reflections are optional and stored separately. Confidence is unscored metadata.

Reviewer mode is visibly marked and has two functions:

- **Preview:** every stage, intended-evidence note, debrief structure, and design note is available without changing progression or fabricating responses.
- **Sandbox:** the same staged forms use independent reviewer progress. Resetting the reviewer sandbox leaves learner data alone.

The reviewer workspace also provides read-only inspection/export of learner submissions. The only learner reset available there is an explicitly labelled, confirmed recovery action for unreadable learner storage. Normal learner reset is available on assessment completion and clears all four learner cases and reflections.

## Content and configuration

`public/content/assessments.json` contains assessment wording, information, prompts, limits, timings, prerequisite IDs, prior-response references, prediction cards, debriefs, and reviewer notes. It is runtime-loaded relative to Vite's base URL and validated with Zod. React components contain presentation logic, not the assessment prose.

`docs/source-specification.md` is the full source export retrieved on 30 September 2026. Its SHA-256 is recorded in the content configuration. The Google Doc remains authoritative. Source-fidelity tests check wording, complete case-information sets, explicit limits, and developmental prompts against this export.

`scripts/extract_spec.py` is the deterministic import used to transcribe the original document. It regenerates the JSON and overwrites subsequent JSON edits; do not run it casually. To adopt a revised specification, export it again, review the changes, update/reimport the configuration, bump `contentVersion`, and rerun fidelity tests. Pure presentation grouping must not rewrite facts.

Prediction-card text fields have no maximum specified in the source, so no extra caps are imposed. The critical-assumption field is capped at 100 words; comparison evidence notes at 60 words each. All other explicit maxima are enforced individually. Counts use trimmed whitespace-separated tokens without changing the actual saved text. Over-limit drafts are retained, but cannot be submitted. There are no minimum word targets or correctness checks.

The shared external-source rule is applied to every written stage, even where individual stage lists do not repeat it. Optional source entries accept URLs plus explanatory notes. No source counting or URL-fetching occurs.

## State and guarantees

`src/model.ts` defines configuration schemas, the assessment state machine, validators, eligibility, and immutable snapshot creation. `src/persistence.ts` manages browser persistence. The two format-specific presentations share these mechanics.

- Keys are namespaced by application, deployment base path, schema version, and mode.
- Every run has a random demo participant ID, run ID, content version, and separate assessment sessions.
- Drafts update in memory immediately, autosave after 500 ms, and flush on blur/navigation/page hiding. A synchronous, run-scoped draft journal protects the latest keystrokes against immediate refresh or tab closure.
- Submission validates and deep-copies answers, order, source logs, and timestamp into a separate snapshot. The whole transition is persisted before advancing.
- Web Locks serialize persistence across tabs in supported HTTPS/localhost browsers. Storage events rehydrate other tabs. On browsers without Web Locks, normal single-tab use is supported; no secure multi-tab assessment guarantee is claimed.
- Autosave merges only into the current stage. A stale draft or tab cannot overwrite a submitted snapshot or resurrect an earlier run after reset.
- Routes never determine edit rights. Refresh, history navigation, and direct links are checked against saved submissions.
- Malformed/incompatible storage is preserved for export and explicit recovery, not silently reset. Failed writes do not advance the learner or claim a successful save.
- A session export includes submitted answers, selections, confidence, card order, timestamps, sources, mode, versions, and separate developmental reflections. Draft answers are not represented as submissions.

There is no authentication, backend, database, analytics, AI scoring, video, recording, plagiarism/AI detection, or iGOT integration. Responses stay in this browser unless the user downloads and shares an export. Clearing browser data removes local progress; there is no cross-device sync.

Client-side locking and mode separation are for demonstration, not security. Future content exists in the static bundle/configuration and can be inspected outside the learner UI. Production assessment delivery would need trusted server-side controls.

## Accessibility and layout

The interface supports keyboard navigation, labelled inputs, live counters, field-linked validation, an accessible native confirmation dialog, visible focus, and text labels for lock/progress states. Card reordering uses buttons, so dragging is not required. Laptop, tablet, and narrow-screen layouts retain the complete case and response text. Suggested durations are displayed without countdowns or auto-submission.

## GitHub Pages deployment

The repo has no configured GitHub remote. To publish:

1. Choose/create the destination repository and push the code to its default branch.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Run the **Verify and deploy prototype** workflow or push to the default branch.
4. The workflow type-checks and tests, runs browser flows on a project subpath, builds `dist`, and deploys through the `github-pages` environment.

Pull requests and non-default branches run checks without deploying. The deployment base comes from `actions/configure-pages`, covering a project repository or root/custom domain. Hash routes such as `#/learner/assessment/A1_FLOOD/stage/A1_stage1` need no 404 rewrite. Assets and configuration are resolved with `import.meta.env.BASE_URL`.

For a local deployment-path check:

```sh
BASE_PATH=/your-repository/ npm run build
BASE_PATH=/your-repository/ npm run preview
```

Then open `/your-repository/#/learner`. Each base path has its own saved demo state. There are no deployment secrets to enter beyond the workflow's scoped GitHub token permissions.

## Verification coverage

- Complete sequential flows for all four cases, including every lock and reveal boundary.
- Exact response snapshots, word boundaries, required fields, optional fields, card order, and source logs.
- Pairwise debrief eligibility in both completion orders; unscored confidence and optional reflections.
- Refresh before autosave, close/reopen recovery, history/direct links, stale tabs, reset isolation, failed writes, and incompatible data.
- Reviewer previews and read-only learner inspection; session export.
- Production-build routing under `/bharat-kalp/`, responsive overflow checks, keyboard confirmation, and automated WCAG accessibility checks.

Automated checks complement manual visual/keyboard review; they are not a formal accessibility certification or psychometric validation.
