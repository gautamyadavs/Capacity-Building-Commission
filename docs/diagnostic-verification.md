# Learner pilot verification

The [master guide](https://docs.google.com/document/d/1u8TM_kfP42SZXbzc2SRCZb-6ZSb45gtyiRUpERB227Q/edit) owns assessment mappings, rubric interpretation and the human pilot protocol. This file describes software checks.

Run `npm run check` and `npm run test:e2e` from the project root. The browser suite builds with `/Capacity-Building-Commission/` as its production base path.

| Area | Coverage |
| --- | --- |
| Content | Unchanged source-projection digests for facts, question wording, eight objectives, ten criteria and phase mappings. |
| Learner interface | No global navigation, facilitator links, file inputs, source/version sections or internal IDs in interface labels. Plain case titles and question labels; one pending-feedback message and no empty criterion profiles. |
| Assessment flow | All four cases/eight submissions; arbitrary order and interleaved drafts; exact initial response preserved before case-local update reveal; no coaching before completion/early end. |
| Feedback | All twenty criterion records, partial reviews, first reviewed case opened, initial/later distinctions, missing evidence and uncertainty, separate independent reviews, visible disagreement and current revisions with stored history retained. |
| File transfer | Ended-session import and review export/import through facilitator tools; captured run/content/version binding and immutable review records; mismatch rejection in model/persistence checks. |
| Saving and recovery | Journal/refresh restoration, failure/retry, cross-tab safeguards, early-end drafts and incomplete opportunities, backup/restore cancellation, archived reset and corrupt/legacy storage preservation. |
| Access | Keyboard submit/cancel, reference dialog focus and writing position, accessible names, axe on selected paths and reflow at 320/390/1440 CSS pixels. |
| Compatibility | Captured earlier sessions retain fixed progression, paragraph facts and review binding; schemas and content files remain unchanged. |

Automated verification uses synthetic responses/review records. Passing it does not establish assessment validity, rater reliability, learning gains or full accessibility conformance. Observe assessment comprehension, intended evidence elicitation and feedback interpretation with representative learners using the guide. Practice and D15 remain deferred.
