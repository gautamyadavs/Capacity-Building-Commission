# Bharat KALP diagnostic assessment

A static React/Vite assessment with four fictional cases, saved initial/update responses and human-reviewed feedback.

The [compact CBC document](https://docs.google.com/document/d/1u8TM_kfP42SZXbzc2SRCZb-6ZSb45gtyiRUpERB227Q/edit) is the entry point for Uma S and S. Radha Chauhan. The six original Drive sources retain framework, objective, task, rubric, illustration and delivery details. Repository JSON is the executable transcription; re-read the sources before substantive assessment changes.

KALP-ALIGN-06 samples aspects of ten of 28 framework metrics through eight objectives. Four curriculum links match declared outcomes; four are partial readiness probes. Course descriptions and related session transcripts do not establish delivered lessons, practice or participant exposure. The [coverage demonstration](https://gautamyadavs.github.io/Capacity-Building-Commission/#/coverage) connects each framework target to its course/outcome locator, exact questions and current rubric descriptors, names the 18 metrics without a separate diagnostic rating, and exports the crosswalk. Actual teaching must be confirmed before programme-learning claims.

Use the supplied fictional facts, with notes, online resources and generative AI permitted. There is no timer, word ceiling, total score, pass/fail or think-aloud protocol. Preserve initial responses before updates; give evidence-linked human feedback after completion or explicit early end. Subject-matter review, representative-officer evidence and rater calibration remain pending; practice and D15 are deferred.

## Run

Use Node >=22.12 and npm.

```sh
npm ci
npm run dev
```

## Verify the production build

```sh
npm run check
npx playwright install chromium
npm run test:e2e
BASE_PATH=/Capacity-Building-Commission/ npm run build
BASE_PATH=/Capacity-Building-Commission/ npm run preview
```

The browser suite builds and serves the actual Pages subpath. `BROWSER_EXECUTABLE` can point to an installed Chrome executable. See [verification coverage](docs/diagnostic-verification.md). Screenshots and failure traces are written to ignored `test-results/`.

## Routes and facilitator handover

- Learner entry: `#/learner`; completion and feedback: `#/learner/review`.
- Facilitator files, support notes, reset and recovery: `#/learner/files`.
- Human-review workspace: `#/reviewer`.
- Current teaching/framework coverage and crosswalk export: `#/coverage`.

Facilitator tools have no links in learner screens. After the learner completes or ends the session, the facilitator exports the session from Files, imports it into the reviewer workspace, records actual feedback, exports reviews and imports that file through Files in the participant's browser. The learner then returns to completion and feedback. The compact document explains this demonstration.

Direct routes provide interface separation, without authentication. Data stays in browser storage until explicitly exported; there is no backend or telemetry. Use a separate browser profile or a deliberate facilitator reset for each participant. Clearing browser data removes local work.

## Deploy

`.github/workflows/pages.yml` checks types, unit/component tests and production browser flows on pushes and pull requests. Successful `master` builds deploy through GitHub Pages. Changes may be committed directly to `master`, as authorised for this project.

Keep `BASE_PATH` and hash routing: Pages does not require server rewrites, and assets use `import.meta.env.BASE_URL`.

## Compatibility

Schema 3, stable IDs, storage keys, captured task/rubric content and review-file consistency bindings remain unchanged. Older captured sessions keep their progression and facts. Learner labels translate internal review references for display; stored answers, exact quotations and review records are preserved. Superseded reviews remain in facilitator history, and independent current reviews appear separately to learners. No automatic score or adjudication is added.
