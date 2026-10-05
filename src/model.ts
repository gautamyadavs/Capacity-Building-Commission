import { z } from "zod";

export const levels = ["Developing", "Emerging", "Proficient"] as const;
export const evidenceStatuses = [
  "Insufficient evidence",
  "Not elicited",
] as const;
const Nonempty = z
  .string()
  .refine((value) => value.trim().length > 0, "Required text");
const Time = z.iso.datetime();
const PromptSchema = z.strictObject({
  id: Nonempty,
  label: Nonempty,
  text: Nonempty,
});
const BriefingBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("paragraph"),
    text: Nonempty,
    heading: Nonempty.optional(),
  }),
  z
    .strictObject({
      type: z.literal("table"),
      caption: Nonempty,
      columns: z.array(Nonempty).min(2),
      rows: z.array(z.array(Nonempty)).min(1),
      notes: z.array(Nonempty),
    })
    .superRefine((table, ctx) => {
      if (table.rows.some((row) => row.length !== table.columns.length))
        ctx.addIssue({
          code: "custom",
          message: "Table rows must match the columns",
        });
    }),
]);
const PhaseSchema = z.strictObject({
  id: Nonempty,
  kind: z.enum(["initial", "update"]),
  title: Nonempty,
  version: Nonempty,
  facts: z.array(Nonempty).min(1),
  briefingBlocks: z.array(BriefingBlockSchema).min(1).optional(),
  task: Nonempty,
  prompts: z.array(PromptSchema).min(1),
});
const CaseSchema = z.strictObject({
  id: z.enum(["A1", "A2", "B1", "B2"]),
  set: z.enum(["A", "B"]),
  title: Nonempty,
  taskVersion: Nonempty,
  phases: z.array(PhaseSchema).length(2),
});
const CriterionSchema = z.strictObject({
  id: Nonempty,
  objectiveId: Nonempty,
  title: Nonempty,
  primaryPhase: Nonempty,
  primaryPrompts: z.array(Nonempty).min(1),
  supplementaryPrompts: z.array(Nonempty),
  comparisonPrompts: z.array(Nonempty),
  alignment: Nonempty,
  descriptors: z.strictObject({
    Developing: Nonempty,
    Emerging: Nonempty,
    Proficient: Nonempty,
  }),
  boundary: Nonempty,
});
export const ConfigSchema = z
  .strictObject({
    schemaVersion: z.literal(3),
    caseOrderPolicy: z.enum(["fixed", "free"]).optional(),
    packageVersion: Nonempty,
    frameworkVersion: Nonempty,
    taskVersion: Nonempty,
    rubricVersion: Nonempty,
    sourceReadDate: Nonempty,
    sources: z
      .array(
        z.strictObject({
          id: Nonempty,
          title: Nonempty,
          url: z.url(),
          revision: Nonempty,
        }),
      )
      .length(6),
    instructions: z.array(Nonempty),
    objectives: z
      .array(
        z.strictObject({
          id: Nonempty,
          title: Nonempty,
          text: Nonempty,
          metrics: Nonempty,
          evidence: Nonempty,
          mapping: Nonempty,
          boundary: Nonempty,
        }),
      )
      .length(8),
    criteria: z.array(CriterionSchema).length(10),
    rubricRules: z.array(Nonempty),
    feedbackRule: Nonempty,
    cases: z.array(CaseSchema).length(4),
  })
  .superRefine((c, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (c.cases.map((a) => a.id).join(",") !== "A1,A2,B1,B2")
      fail("Expected proposed case sequence A1, A2, B1, B2");
    const expected = [
      ["A-R1", "A-LO1", "A.I", "A.P1", "A.P5", ""],
      ["A-R2", "A-LO2", "A.I", "A.P2", "A.P6", ""],
      ["A-R3", "A-LO2", "A.I", "A.P2", "A.P6", ""],
      ["A-R4", "A-LO3", "A.I", "A.P3", "A.P6", ""],
      ["A-R5", "A-LO4", "A.I", "A.P4", "A.P5", ""],
      ["A-R6", "A-LO4", "A.U", "A.P5,A.P6", "", "A.P1,A.P2,A.P3,A.P4"],
      ["B-R1", "B-LO1", "B.I", "B.P1", "", ""],
      ["B-R2", "B-LO2", "B.I", "B.P2", "", ""],
      ["B-R3", "B-LO3", "B.U", "B.P3", "", "B.P2"],
      ["B-R4", "B-LO4", "B.U", "B.P4", "", "B.P1,B.P2"],
    ];
    if (
      c.objectives.map((o) => o.id).join(",") !==
      "A-LO1,A-LO2,A-LO3,A-LO4,B-LO1,B-LO2,B-LO3,B-LO4"
    )
      fail("Invalid objective IDs");
    if (
      c.criteria.some(
        (r, i) =>
          [
            r.id,
            r.objectiveId,
            r.primaryPhase,
            r.primaryPrompts.join(","),
            r.supplementaryPrompts.join(","),
            r.comparisonPrompts.join(","),
          ].join("|") !== expected[i].join("|"),
      )
    )
      fail("Invalid criterion crosswalk");
    for (const a of c.cases) {
      if (a.set !== a.id[0] || a.taskVersion !== c.taskVersion)
        fail("Inconsistent case version/set");
      const ids =
        a.set === "A"
          ? [
              ["A.P1", "A.P2", "A.P3", "A.P4"],
              ["A.P5", "A.P6"],
            ]
          : [
              ["B.P1", "B.P2"],
              ["B.P3", "B.P4"],
            ];
      a.phases.forEach((p, i) => {
        if (
          p.id !== `${a.set}.${i ? "U" : "I"}` ||
          p.kind !== (i ? "update" : "initial") ||
          p.prompts.map((f) => f.id).join(",") !== ids[i].join(",")
        )
          fail("Invalid two-phase prompt structure");
      });
    }
  });
export type Config = z.infer<typeof ConfigSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type CaseId = Case["id"];
export const DraftSchema = z.strictObject({
  phaseId: Nonempty,
  answers: z.record(z.string(), z.string()),
  updatedAt: Time,
});
const SnapshotSchema = z.strictObject({
  phaseId: Nonempty,
  phaseVersion: Nonempty,
  taskVersion: Nonempty,
  rubricVersion: Nonempty,
  answers: z.record(z.string(), z.string()),
  submittedAt: Time,
});
const MissingSchema = z.strictObject({
  caseId: Nonempty,
  phaseId: Nonempty,
  promptId: Nonempty,
  opportunity: z.enum(["Not elicited", "Unsubmitted", "Submitted blank"]),
});
const RunSchema = z.strictObject({
  schemaVersion: z.literal(3),
  runId: Nonempty,
  createdAt: Time,
  config: ConfigSchema,
  supportNotes: z.string(),
  actualSequence: z.array(z.string()),
  submissionSequence: z.array(
    z.strictObject({ caseId: Nonempty, phaseId: Nonempty, submittedAt: Time }),
  ),
  sessions: z.record(
    z.string(),
    z.strictObject({
      startedAt: Time.nullable(),
      lastActivityAt: Time.optional(),
      revealedAt: z.record(z.string(), Time),
      draft: DraftSchema.nullable(),
      submitted: z.record(z.string(), SnapshotSchema),
    }),
  ),
  end: z
    .strictObject({
      kind: z.enum(["complete", "early"]),
      at: Time,
      reason: z.string(),
      incomplete: z.array(MissingSchema),
    })
    .nullable(),
});
export type Run = z.infer<typeof RunSchema>;
export type Draft = z.infer<typeof DraftSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type Session = Run["sessions"][string];
const now = () => new Date().toISOString();
export function createRun(config: Config): Run {
  return {
    schemaVersion: 3,
    runId: crypto.randomUUID(),
    createdAt: now(),
    config: structuredClone(config),
    supportNotes: "",
    actualSequence: [],
    submissionSequence: [],
    sessions: Object.fromEntries(
      config.cases.map((a) => [
        a.id,
        { startedAt: null, revealedAt: {}, draft: null, submitted: {} },
      ]),
    ),
    end: null,
  };
}
export function emptyDraft(phase: Phase): Draft {
  return {
    phaseId: phase.id,
    answers: Object.fromEntries(phase.prompts.map((p) => [p.id, ""])),
    updatedAt: now(),
  };
}
export function currentPhase(a: Case, s: Session) {
  return s.startedAt ? a.phases.find((p) => !s.submitted[p.id]) : undefined;
}
export function caseComplete(a: Case, s: Session) {
  return a.phases.every((p) => !!s.submitted[p.id]);
}
export function diagnosticComplete(run: Run) {
  return run.config.cases.every((a) => caseComplete(a, run.sessions[a.id]));
}
export function caseAvailable(run: Run, id: string) {
  const i = run.config.cases.findIndex((a) => a.id === id);
  return (
    i >= 0 &&
    (run.config.caseOrderPolicy === "free" ||
      run.config.cases
        .slice(0, i)
        .every((a) => caseComplete(a, run.sessions[a.id])))
  );
}
export function casePath(run: Run, id: string) {
  const a = run.config.cases.find((a) => a.id === id)!;
  const p = currentPhase(a, run.sessions[id]);
  if (caseComplete(a, run.sessions[id]))
    return `/learner/assessment/${id}/complete`;
  return `/learner/assessment/${id}${p ? `/stage/${p.id}` : ""}`;
}
export function resumePath(run: Run) {
  if (run.end) return "/learner/review";
  const unfinished = run.config.cases.filter(
    (a) => !caseComplete(a, run.sessions[a.id]),
  );
  if (run.config.caseOrderPolicy === "free") {
    const active = unfinished.filter((a) => run.sessions[a.id].startedAt);
    // Stable sort keeps the suggested case order for equal activity times.
    active.sort((a, b) => {
      const activity = (id: string) => {
        const s = run.sessions[id];
        return Math.max(
          ...[
            s.lastActivityAt,
            s.startedAt,
            s.draft?.updatedAt,
            ...Object.values(s.revealedAt),
          ]
            .filter((x): x is string => !!x)
            .map((x) => Date.parse(x)),
        );
      };
      return activity(b.id) - activity(a.id);
    });
    return active.length ? casePath(run, active[0].id) : "/learner";
  }
  return unfinished.length ? casePath(run, unfinished[0].id) : "/learner";
}
export function validAnswers(phase: Phase, answers: Record<string, string>) {
  return (
    Object.keys(answers).length === phase.prompts.length &&
    phase.prompts.every((p) => typeof answers[p.id] === "string") &&
    Object.keys(answers).every((id) => phase.prompts.some((p) => p.id === id))
  );
}
export function beginCase(run: Run, id: string, at = now()): Run {
  if (run.end || !caseAvailable(run, id))
    throw new Error("This case cannot be started.");
  const n = structuredClone(run),
    a = n.config.cases.find((a) => a.id === id)!,
    s = n.sessions[id];
  if (!s.startedAt) {
    s.startedAt = at;
    s.revealedAt[a.phases[0].id] = at;
    s.draft = emptyDraft(a.phases[0]);
    n.actualSequence.push(id);
  }
  if (n.config.caseOrderPolicy === "free") s.lastActivityAt = at;
  return n;
}
export function incompleteOpportunities(run: Run) {
  return run.config.cases.flatMap((a) =>
    a.phases.flatMap((p) =>
      p.prompts
        .filter(
          (f) => !run.sessions[a.id].submitted[p.id]?.answers[f.id].trim(),
        )
        .map((f) => ({
          caseId: a.id,
          phaseId: p.id,
          promptId: f.id,
          opportunity: run.sessions[a.id].submitted[p.id]
            ? ("Submitted blank" as const)
            : run.sessions[a.id].revealedAt[p.id]
              ? ("Unsubmitted" as const)
              : ("Not elicited" as const),
        })),
    ),
  );
}
export function endRun(run: Run, reason: string, at = now()): Run {
  if (run.end) throw new Error("This diagnostic has already ended.");
  const n = structuredClone(run);
  n.end = {
    kind: diagnosticComplete(n) ? "complete" : "early",
    at,
    reason,
    incomplete: incompleteOpportunities(n),
  };
  return n;
}
export function submitPhase(
  run: Run,
  id: string,
  phaseId: string,
  draft: Draft,
  at = now(),
): Run {
  const a = run.config.cases.find((a) => a.id === id),
    s = run.sessions[id];
  if (
    run.end ||
    !a ||
    !caseAvailable(run, id) ||
    currentPhase(a, s)?.id !== phaseId ||
    draft.phaseId !== phaseId
  )
    throw new Error(
      "This phase is no longer editable. Your original submissions are preserved.",
    );
  const p = a.phases.find((p) => p.id === phaseId)!;
  if (!validAnswers(p, draft.answers))
    throw new Error("Response fields do not match the captured task.");
  const n = structuredClone(run);
  if (n.config.caseOrderPolicy === "free") n.sessions[id].lastActivityAt = at;
  n.sessions[id].submitted[phaseId] = {
    phaseId,
    phaseVersion: p.version,
    taskVersion: n.config.taskVersion,
    rubricVersion: n.config.rubricVersion,
    answers: structuredClone(draft.answers),
    submittedAt: at,
  };
  n.submissionSequence.push({ caseId: id, phaseId, submittedAt: at });
  const next = a.phases[a.phases.indexOf(p) + 1];
  n.sessions[id].draft = next ? emptyDraft(next) : null;
  if (next) n.sessions[id].revealedAt[next.id] = at;
  return diagnosticComplete(n) ? endRun(n, "All four cases submitted", at) : n;
}
export function parseRun(raw: string): Run {
  const run = RunSchema.parse(JSON.parse(raw));
  if (Object.keys(run.sessions).sort().join(",") !== "A1,A2,B1,B2")
    throw new Error("Invalid case record.");
  const starts: string[] = [],
    sequence: Run["submissionSequence"] = [];
  let blocked = false;
  for (const a of run.config.cases) {
    const s = run.sessions[a.id];
    if (s.startedAt) {
      if (blocked && run.config.caseOrderPolicy !== "free")
        throw new Error("Invalid case sequence.");
      starts.push(a.id);
    }
    if (s.startedAt !== (s.revealedAt[a.phases[0].id] || null))
      throw new Error("Invalid initial reveal.");
    let gap = false;
    for (const [i, p] of a.phases.entries()) {
      const snap = s.submitted[p.id];
      if (
        i === 1 &&
        s.revealedAt[p.id] !== s.submitted[a.phases[0].id]?.submittedAt
      )
        throw new Error("Update reveal requires preserved initial submission.");
      if (snap) {
        if (
          gap ||
          !s.startedAt ||
          !s.revealedAt[p.id] ||
          snap.phaseId !== p.id ||
          snap.phaseVersion !== p.version ||
          snap.taskVersion !== run.config.taskVersion ||
          snap.rubricVersion !== run.config.rubricVersion ||
          !validAnswers(p, snap.answers)
        )
          throw new Error("Invalid submission record.");
        sequence.push({
          caseId: a.id,
          phaseId: p.id,
          submittedAt: snap.submittedAt,
        });
      } else gap = true;
    }
    if (
      Object.keys(s.submitted).some(
        (id) => !a.phases.some((p) => p.id === id),
      ) ||
      Object.keys(s.revealedAt).some((id) => !a.phases.some((p) => p.id === id))
    )
      throw new Error("Unknown phase record.");
    const current = currentPhase(a, s);
    if (
      s.draft &&
      (!current ||
        s.draft.phaseId !== current.id ||
        !validAnswers(current, s.draft.answers))
    )
      throw new Error("Invalid draft.");
    if (s.startedAt && current && !s.draft)
      throw new Error("Missing current draft.");
    blocked ||= !caseComplete(a, s);
  }
  if (run.config.caseOrderPolicy === "free") {
    if (
      new Set(run.actualSequence).size !== starts.length ||
      run.actualSequence.length !== starts.length ||
      run.actualSequence.some((id) => !starts.includes(id))
    )
      throw new Error("Invalid recorded start sequence.");
    let lastStart = run.createdAt;
    for (const id of run.actualSequence) {
      const at = run.sessions[id].startedAt!;
      if (at < lastStart) throw new Error("Invalid start chronology.");
      lastStart = at;
    }
    const remaining = new Map(
      sequence.map((r) => [`${r.caseId}/${r.phaseId}`, r]),
    );
    let lastSubmission = run.createdAt;
    const seen = new Set<string>();
    for (const r of run.submissionSequence) {
      const key = `${r.caseId}/${r.phaseId}`;
      const recorded = remaining.get(key);
      const a = run.config.cases.find((a) => a.id === r.caseId);
      if (
        !recorded ||
        !a ||
        JSON.stringify(recorded) !== JSON.stringify(r) ||
        r.submittedAt < lastSubmission ||
        r.submittedAt < run.sessions[r.caseId].revealedAt[r.phaseId] ||
        (r.phaseId === a.phases[1].id &&
          !seen.has(`${r.caseId}/${a.phases[0].id}`))
      )
        throw new Error("Invalid recorded submission sequence.");
      remaining.delete(key);
      seen.add(key);
      lastSubmission = r.submittedAt;
    }
    if (remaining.size) throw new Error("Missing recorded submission.");
  } else if (
    JSON.stringify(starts) !== JSON.stringify(run.actualSequence) ||
    JSON.stringify(sequence) !== JSON.stringify(run.submissionSequence)
  ) {
    throw new Error("Invalid recorded sequence.");
  }
  if (
    (diagnosticComplete(run) && !run.end) ||
    (run.end && (run.end.kind === "complete") !== diagnosticComplete(run))
  )
    throw new Error("Invalid diagnostic end.");
  if (
    run.end &&
    JSON.stringify(run.end.incomplete) !==
      JSON.stringify(incompleteOpportunities(run))
  )
    throw new Error("Invalid incomplete opportunities.");
  return run;
}
export function criteriaFor(run: Run, caseId: string) {
  return run.config.criteria.filter((c) => c.id.startsWith(caseId[0]));
}
// Availability alone never assigns a performance level. Submitted evidence needs human review.
export function evidenceAvailability(run: Run, caseId: string, c: Criterion) {
  const s = run.sessions[caseId],
    primary = s.submitted[c.primaryPhase];
  if (!s.revealedAt[c.primaryPhase]) return "Not elicited";
  if (
    !primary ||
    !Object.values(primary.answers).some((x) => x.trim()) ||
    (c.comparisonPrompts.length > 0 &&
      !Object.values(s.submitted[`${caseId[0]}.I`]?.answers || {}).some((x) =>
        x.trim(),
      ))
  )
    return "Insufficient evidence";
  return "Awaiting review";
}

const EvidenceSchema = z.strictObject({
  phaseId: Nonempty,
  promptId: Nonempty,
  location: Nonempty,
  excerpt: z.string(),
});
const JudgementSchema = z.strictObject({
  judgement: z.enum([...levels, ...evidenceStatuses]).nullable(),
  reviewStatus: z.enum(["Reviewed", "Uncertain"]),
  evidence: z.array(EvidenceSchema).min(1),
  rationale: Nonempty,
  strengthOrGap: Nonempty,
  nextOpportunity: z.string(),
  competingInterpretations: z.string(),
});
export const ReviewRecordSchema = z.strictObject({
  id: Nonempty,
  caseId: Nonempty,
  criterionId: Nonempty,
  reviewer: Nonempty,
  reviewedAt: Time,
  packageVersion: Nonempty,
  taskVersion: Nonempty,
  rubricVersion: Nonempty,
  primary: JudgementSchema,
  comparisonEvidence: z.array(EvidenceSchema),
  supplementary: z.array(JudgementSchema),
  supersedes: z.string().nullable(),
});
export const ReviewBundleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: Nonempty,
  binding: Nonempty,
  packageVersion: Nonempty,
  taskVersion: Nonempty,
  rubricVersion: Nonempty,
  records: z.array(ReviewRecordSchema),
});
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Judgement = z.infer<typeof JudgementSchema>;
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;
export type ReviewBundle = z.infer<typeof ReviewBundleSchema>;
// A consistency binding, not a signature, identity check, authentication or concealment mechanism.
export async function runBinding(run: Run) {
  const bytes = new TextEncoder().encode(JSON.stringify(RunSchema.parse(run)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function emptyReviewBundle(run: Run): Promise<ReviewBundle> {
  if (!run.end) throw new Error("End the diagnostic before review.");
  return {
    schemaVersion: 1,
    runId: run.runId,
    binding: await runBinding(run),
    packageVersion: run.config.packageVersion,
    taskVersion: run.config.taskVersion,
    rubricVersion: run.config.rubricVersion,
    records: [],
  };
}
export function validateReviewRecord(record: ReviewRecord, run: Run) {
  ReviewRecordSchema.parse(record);
  if (!run.end) throw new Error("Feedback is withheld until diagnostic end.");
  const a = run.config.cases.find((a) => a.id === record.caseId),
    c = run.config.criteria.find((c) => c.id === record.criterionId);
  if (
    !a ||
    !c ||
    !c.id.startsWith(a.set) ||
    record.packageVersion !== run.config.packageVersion ||
    record.taskVersion !== run.config.taskVersion ||
    record.rubricVersion !== run.config.rubricVersion
  )
    throw new Error(
      "Review case, criterion or versions do not match this session.",
    );
  for (const [i, j] of [record.primary, ...record.supplementary].entries()) {
    const expected = i === 0 ? c.primaryPhase : `${a.set}.U`;
    if (i > 0 && !c.supplementaryPrompts.length)
      throw new Error("This criterion has no supplementary phase.");
    if (j.reviewStatus === "Uncertain" && !j.competingInterpretations.trim())
      throw new Error(
        "Uncertain review requires competing interpretations and further review.",
      );
    if (
      j.reviewStatus === "Reviewed" &&
      (j.judgement === null || j.competingInterpretations.trim())
    )
      throw new Error(
        "Choose a descriptive judgement or evidence status; use Uncertain for unresolved interpretations.",
      );
    if (
      (j.judgement === "Insufficient evidence" ||
        j.judgement === "Not elicited" ||
        j.reviewStatus === "Uncertain") &&
      !j.nextOpportunity.trim()
    )
      throw new Error(
        "Record an elicitation opportunity or further review for missing/uncertain evidence.",
      );
    for (const e of j.evidence) {
      const p = a.phases.find((p) => p.id === e.phaseId);
      if (
        e.phaseId !== expected ||
        !p?.prompts.some((f) => f.id === e.promptId)
      )
        throw new Error(
          "Evidence must retain its actual prompt and primary/supplementary phase.",
        );
      const response =
        run.sessions[a.id].submitted[e.phaseId]?.answers[e.promptId];
      if (e.excerpt && (!response || !response.includes(e.excerpt)))
        throw new Error(
          "The excerpt must occur exactly in the submitted response.",
        );
    }
    if (
      j.judgement &&
      (levels as readonly string[]).includes(j.judgement) &&
      !j.evidence.some((e) =>
        run.sessions[a.id].submitted[e.phaseId]?.answers[e.promptId]?.trim(),
      )
    )
      throw new Error(
        "A performance level requires submitted response evidence; a blank alone is not Developing.",
      );
  }
  if (!c.comparisonPrompts.length && record.comparisonEvidence.length)
    throw new Error(
      "This criterion has no separate prior comparison evidence.",
    );
  for (const e of record.comparisonEvidence) {
    const initial = a.phases[0];
    if (
      e.phaseId !== initial.id ||
      !initial.prompts.some((p) => p.id === e.promptId)
    )
      throw new Error(
        "Comparison evidence must retain its initial prompt and phase.",
      );
    const response =
      run.sessions[a.id].submitted[e.phaseId]?.answers[e.promptId];
    if (e.excerpt && (!response || !response.includes(e.excerpt)))
      throw new Error(
        "Comparison excerpt must occur exactly in the initial response.",
      );
  }
  if (
    c.comparisonPrompts.length &&
    record.primary.judgement &&
    (levels as readonly string[]).includes(record.primary.judgement) &&
    !record.comparisonEvidence.some((e) =>
      run.sessions[a.id].submitted[e.phaseId]?.answers[e.promptId]?.trim(),
    )
  )
    throw new Error(
      "An update performance level requires a location for preserved prior reasoning. Use an evidence status when prior evidence is unavailable.",
    );
}
export async function parseReviewBundle(raw: string, run: Run) {
  const bundle = ReviewBundleSchema.parse(JSON.parse(raw));
  if (
    !run.end ||
    bundle.runId !== run.runId ||
    bundle.binding !== (await runBinding(run)) ||
    bundle.packageVersion !== run.config.packageVersion ||
    bundle.taskVersion !== run.config.taskVersion ||
    bundle.rubricVersion !== run.config.rubricVersion
  )
    throw new Error(
      "This review belongs to a different session, response record or design version.",
    );
  const seen = new Map<string, ReviewRecord>();
  for (const r of bundle.records) {
    validateReviewRecord(r, run);
    if (seen.has(r.id)) throw new Error("Duplicate review record.");
    if (r.supersedes) {
      const old = seen.get(r.supersedes);
      if (
        !old ||
        old.caseId !== r.caseId ||
        old.criterionId !== r.criterionId ||
        old.reviewer !== r.reviewer
      )
        throw new Error(
          "A revision must retain and identify the same reviewer’s earlier judgement.",
        );
    }
    seen.set(r.id, r);
  }
  return bundle;
}
export function mergeReviews(
  existing: ReviewRecord[],
  incoming: ReviewRecord[],
) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) {
    const old = byId.get(r.id);
    if (old && JSON.stringify(old) !== JSON.stringify(r))
      throw new Error(
        "An existing review record cannot be overwritten. Export a new revision with a new ID.",
      );
    byId.set(r.id, r);
  }
  return [...byId.values()];
}
