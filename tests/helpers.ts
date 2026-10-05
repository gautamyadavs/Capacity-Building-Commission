import data from "../public/content/assessments.json" with { type: "json" };
import {
  ConfigSchema,
  beginCase,
  createRun,
  emptyDraft,
  submitPhase,
  type Draft,
  type ReviewRecord,
  type Run,
} from "../src/model";
export const config = ConfigSchema.parse(data);
export class MemoryStorage implements Storage {
  data = new Map<string, string>();
  fail = false;
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] || null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.fail) throw new Error("Storage unavailable");
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}
export function response(
  run: Run,
  id: string,
  phaseId: string,
  value = "A defensible response with reasons",
): Draft {
  const phase = run.config.cases
    .find((a) => a.id === id)!
    .phases.find((p) => p.id === phaseId)!;
  return {
    ...emptyDraft(phase),
    answers: Object.fromEntries(phase.prompts.map((p) => [p.id, value])),
  };
}
export function completeRun(value = "A defensible response with reasons") {
  let run = createRun(config);
  for (const a of config.cases) {
    run = beginCase(run, a.id);
    for (const p of a.phases)
      run = submitPhase(run, a.id, p.id, response(run, a.id, p.id, value));
  }
  return run;
}
export function reviewRecord(
  run: Run,
  caseId = "A1",
  criterionId = "A-R1",
): ReviewRecord {
  const c = run.config.criteria.find((c) => c.id === criterionId)!;
  return {
    id: crypto.randomUUID(),
    caseId,
    criterionId,
    reviewer: "Human rater 1",
    reviewedAt: new Date().toISOString(),
    packageVersion: run.config.packageVersion,
    taskVersion: run.config.taskVersion,
    rubricVersion: run.config.rubricVersion,
    supersedes: null,
    primary: {
      judgement: "Emerging",
      reviewStatus: "Reviewed",
      evidence: [
        {
          phaseId: c.primaryPhase,
          promptId: c.primaryPrompts[0],
          location: "Whole submitted response",
          excerpt:
            run.sessions[caseId].submitted[c.primaryPhase]?.answers[
              c.primaryPrompts[0]
            ] || "",
        },
      ],
      rationale:
        "Relevant reasons are present, but a material consequence remains unresolved under the captured descriptor.",
      strengthOrGap:
        "The comparison is stated; the longer horizon requires further explanation.",
      nextOpportunity:
        "In a fresh elicitation, explain the consequence that changes the preference.",
      competingInterpretations: "",
    },
    comparisonEvidence: c.comparisonPrompts.length
      ? [
          {
            phaseId: `${caseId[0]}.I`,
            promptId: c.comparisonPrompts[0],
            location: "Whole prior response",
            excerpt: "",
          },
        ]
      : [],
    supplementary: [],
  };
}
