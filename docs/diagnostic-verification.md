# Diagnostic verification

The [compact CBC document](https://docs.google.com/document/d/1u8TM_kfP42SZXbzc2SRCZb-6ZSb45gtyiRUpERB227Q/edit) links the six technical design authorities and explains the diagnostic demonstration. No think-aloud protocol is required. This file records software checks separately from teaching and human assessment evidence.

KALP-ALIGN-06 updates coverage and navigation. Task/rubric versions remain KALP-ALIGN-05:03/04 because exact assessment demands are unchanged. Live readback after the source edits matched eight objective statements, 20 question occurrences, 30 descriptors, ten judgement boundaries and 133 briefing elements. The framework crosswalk retains objective, metric and criterion mappings; its curriculum column now distinguishes four declared matches and four partial readiness probes. Earlier revision notes and archived proposals describe their original scope.

Run `npm run check` and `npm run test:e2e` from the project root. The browser suite builds with `/Capacity-Building-Commission/` as its production base path.

Verified on 2026-10-05 UTC (October 4 in the working timezone): TypeScript and 53 unit/component checks passed; all 14 production browser scenarios passed using installed Chrome. The coverage export contained all eight objectives/current descriptors and excluded seeded participant responses. Its domain filter, source links, exact questions, selected axe checks and mobile reflow passed. The compact native CBC document's three-page PDF and the native framework crosswalk were visually inspected.

| Area | Coverage |
| --- | --- |
| Content | Unchanged source-projection digests for facts, question wording, eight objectives, ten criteria and phase mappings. |
| Coverage | Current release binding, eight unique objective links, ten sampled metrics plus 18 excluded metrics, partial-link disclosure, framework-domain filtering, source links, exact primary/supplementary/comparison questions and rubric descriptors, JSON export without participant data. |
| Learner interface | No global navigation, facilitator links, file inputs, source/version sections or internal IDs in interface labels. Plain case titles and question labels; one pending-feedback message and no empty criterion profiles. |
| Assessment flow | All four cases/eight submissions; arbitrary order and interleaved drafts; exact initial response preserved before case-local update reveal; no coaching before completion/early end. |
| Feedback | All twenty criterion records, partial reviews, first reviewed case opened, initial/later distinctions, missing evidence and uncertainty, separate independent reviews, visible disagreement and current revisions with stored history retained. |
| File transfer | Ended-session import and review export/import through facilitator tools; captured run/content/version binding and immutable review records; mismatch rejection in model/persistence checks. |
| Saving and recovery | Journal/refresh restoration, failure/retry, cross-tab safeguards, early-end drafts and incomplete opportunities, backup/restore cancellation, archived reset and corrupt/legacy storage preservation. |
| Access | Keyboard submit/cancel, reference dialog focus and writing position, accessible names, axe on selected paths and reflow at 320/390/1440 CSS pixels. |
| Compatibility | Captured earlier sessions retain their progression, facts and review binding; schema 3 and task/rubric content remain unchanged. Coverage describes the current release and does not reinterpret captured sessions. |

Automated verification uses synthetic responses/review records. Passing it does not establish delivered teaching, participant exposure, assessment validity, rater reliability, learning gains or full accessibility conformance. Confirm actual lessons/examples/practice/exposure for each objective and collect representative responses plus independent rater review before operational interpretation. The partial links A-LO3, A-LO4, B-LO2 and B-LO4 remain disclosed readiness probes until teaching is confirmed. Practice and D15 remain deferred.

Trial-flow update (2026-10-05): learner controls retry a case, either set, or the complete diagnostic, including after completion/early end. A saved archive retains the exact previous responses, unfinished drafts and feedback; the new session identity prevents feedback or stale draft journals from attaching to a retry. Case/set retries preserve untouched work and captured content; fixed-order sessions restart the required suffix. The entry has no instruction block before case choice. Writing/resource help sits beside the response fields, and submission guidance sits at submission. Exact facts, prompts, objectives, criteria, versions and schema remain unchanged. Added checks cover retries, failed archive/replacement, cancellation, refresh, stale tabs, previous feedback and 320-pixel reflow. Repeated trials are not separate baseline measurements.

Verification for this update: TypeScript and 58 unit/component checks passed; all 16 production browser scenarios passed using installed Chrome. Retry scenarios cover heading focus, archive feedback, resource disclosure, mobile axe/reflow, and retry after early end. History is restricted to the current trial so a facilitator reset/import does not expose unrelated participant archives in the learner interface.
