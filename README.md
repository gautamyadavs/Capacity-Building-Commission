# Bharat KALP learner pilot

A static React/Vite assessment with four fictional cases, saved initial/update responses and human-reviewed feedback.

Assessment alignment, LOs, rubric definitions and the facilitator think-aloud protocol live in the [Assessment Alignment and Learner Pilot Guide](https://docs.google.com/document/d/1u8TM_kfP42SZXbzc2SRCZb-6ZSb45gtyiRUpERB227Q/edit). The six original Drive sources remain supporting design authorities. Repository JSON is the executable transcription; re-read the sources before substantive assessment changes.

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

Facilitator tools have no links in learner screens. After the learner completes or ends the session, the facilitator exports the session from Files, imports it into the reviewer workspace, records actual feedback, exports reviews and imports that file through Files in the participant's browser. The learner then returns to completion and feedback. The guide contains the full pilot procedure.

Direct routes provide interface separation, without authentication. Data stays in browser storage until explicitly exported; there is no backend or telemetry. Use a separate browser profile or a deliberate facilitator reset for each participant. Clearing browser data removes local work.

## Deploy

`.github/workflows/pages.yml` checks types, unit/component tests and production browser flows on pushes and pull requests. Successful default-branch builds deploy through GitHub Pages. Develop on a branch and review the PR before merging to `master`.

Keep `BASE_PATH` and hash routing: Pages does not require server rewrites, and assets use `import.meta.env.BASE_URL`.

## Compatibility

Schema 3, stable IDs, storage keys, captured task/rubric content and review-file consistency bindings remain unchanged. Older captured sessions keep their progression and facts. Learner labels translate internal review references for display; stored answers, exact quotations and review records are preserved. Superseded reviews remain in facilitator history, and independent current reviews appear separately to learners. No automatic score or adjudication is added.
