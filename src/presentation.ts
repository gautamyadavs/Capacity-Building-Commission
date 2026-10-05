import type { Config } from "./model";

const criterionLabels: Record<string, string> = {
  "A-R1": "Comparing options",
  "A-R2": "Weighing public duties",
  "A-R3": "Citizen impacts and safeguards",
  "A-R4": "Putting the response into practice",
  "A-R5": "Understanding the challenge",
  "A-R6": "Responding to new information",
  "B-R1": "Explaining the causes",
  "B-R2": "Predicting and testing",
  "B-R3": "Interpreting the evidence",
  "B-R4": "Updating the explanation and action",
};
export function criterionLabel(config: Config, id: string) {
  return criterionLabels[id] || config.criteria.find((c) => c.id === id)!.title;
}
// Translate reviewer references for display only. Never apply this to answers
// or quoted response evidence, and never change the captured record.
export function learnerReviewText(text: string, config: Config) {
  const labels = new Map<string, string>();
  for (const c of config.criteria)
    labels.set(c.id, criterionLabel(config, c.id));
  for (const o of config.objectives) labels.set(o.id, o.title);
  for (const a of config.cases) {
    labels.set(a.id, a.title);
    for (const p of a.phases) {
      labels.set(p.id, p.title);
      for (const f of p.prompts) labels.set(f.id, f.label);
    }
  }
  return text.replace(
    /\b(?:[AB]-LO[1-4]|[AB]-R[1-6]|[AB]\.P[1-6]|[AB]\.[IU]|[AB][12])\b/g,
    (id) => labels.get(id) || id,
  );
}
