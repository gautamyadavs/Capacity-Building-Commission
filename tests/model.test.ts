import { describe, it, expect } from "vitest";
import {
  ConfigSchema,
  beginCase,
  caseAvailable,
  createRun,
  resumePath,
  emptyReviewBundle,
  endRun,
  evidenceAvailability,
  mergeReviews,
  parseReviewBundle,
  parseRun,
  runBinding,
  submitPhase,
  validateReviewRecord,
} from "../src/model";
import { config, completeRun, response, reviewRecord } from "./helpers";
describe("two-phase diagnostic evidence", () => {
  it("D01/D02 captures four cases, eight objectives and ten criterion mappings", () => {
    expect(config.cases.map((a) => a.id)).toEqual(["A1", "A2", "B1", "B2"]);
    expect(config.objectives).toHaveLength(8);
    expect(config.criteria).toHaveLength(10);
    expect(
      config.cases.map((a) => a.phases.map((p) => p.prompts.length)),
    ).toEqual([
      [4, 2],
      [4, 2],
      [2, 2],
      [2, 2],
    ]);
    const wrong = structuredClone(config);
    wrong.criteria[9].comparisonPrompts = ["B.P4"];
    expect(() => ConfigSchema.parse(wrong)).toThrow();
  });
  it("D08/D09 prevents update submission before initial preservation and preserves exact records", () => {
    let run = beginCase(createRun(config), "A1");
    const original = structuredClone(run);
    expect(() =>
      submitPhase(run, "A1", "A.U", response(run, "A1", "A.U")),
    ).toThrow();
    const draft = response(
      run,
      "A1",
      "A.I",
      "• First choice\n  Prior reasons.",
    );
    run = submitPhase(run, "A1", "A.I", draft);
    draft.answers["A.P1"] = "Tamper";
    expect(original.sessions.A1.submitted).toEqual({});
    expect(run.sessions.A1.submitted["A.I"].answers["A.P1"]).toBe(
      "• First choice\n  Prior reasons.",
    );
    expect(run.sessions.A1.revealedAt["A.U"]).toBe(
      run.sessions.A1.submitted["A.I"].submittedAt,
    );
    const next = submitPhase(
      run,
      "A1",
      "A.U",
      response(run, "A1", "A.U", "Retain with reasons"),
    );
    expect(next.sessions.A1.submitted["A.I"]).toEqual(
      run.sessions.A1.submitted["A.I"],
    );
    expect(() =>
      submitPhase(next, "A1", "A.U", response(next, "A1", "A.U")),
    ).toThrow();
    expect(parseRun(JSON.stringify(next))).toEqual(next);
  });
  it("records actual starts and all eight submissions without premature completion", () => {
    let run = createRun(config);
    expect(caseAvailable(run, "A2")).toBe(true);
    expect(caseAvailable(run, "B1")).toBe(true);
    for (const a of config.cases) {
      run = beginCase(run, a.id);
      for (const p of a.phases) {
        run = submitPhase(run, a.id, p.id, response(run, a.id, p.id));
        if (a.id !== "B2" || p.kind !== "update") expect(run.end).toBeNull();
      }
    }
    expect(run.actualSequence).toEqual(["A1", "A2", "B1", "B2"]);
    expect(run.submissionSequence).toHaveLength(8);
    expect(run.end?.kind).toBe("complete");
    expect(parseRun(JSON.stringify(run))).toEqual(run);
  });
  it("D06/D07 accepts a concise narrative, bullets and a very long response without word or vocabulary rules", () => {
    for (const value of [
      "Reason.",
      "• Retain\n• Investigate",
      "reason ".repeat(7000),
    ]) {
      const run = beginCase(createRun(config), "A1");
      expect(
        submitPhase(run, "A1", "A.I", response(run, "A1", "A.I", value))
          .sessions.A1.submitted["A.I"].answers["A.P1"],
      ).toBe(value);
    }
  });
  it("D10 preserves blanks and early-end drafts and identifies unrevealed opportunities", () => {
    let run = beginCase(createRun(config), "A1");
    run.sessions.A1.draft!.answers["A.P1"] = "Unsubmitted draft";
    run = endRun(run, "Technical interruption");
    expect(run.sessions.A1.draft!.answers["A.P1"]).toBe("Unsubmitted draft");
    expect(
      run.end?.incomplete.find(
        (m) => m.promptId === "A.P1" && m.caseId === "A1",
      )?.opportunity,
    ).toBe("Unsubmitted");
    expect(
      run.end?.incomplete.find(
        (m) => m.promptId === "A.P5" && m.caseId === "A1",
      )?.opportunity,
    ).toBe("Not elicited");
    expect(evidenceAvailability(run, "A1", config.criteria[0])).toBe(
      "Insufficient evidence",
    );
    expect(() =>
      submitPhase(run, "A1", "A.I", response(run, "A1", "A.I")),
    ).toThrow();
    expect(parseRun(JSON.stringify(run))).toEqual(run);
    const blank = completeRun("");
    expect(blank.end?.incomplete).toHaveLength(20);
    expect(evidenceAvailability(blank, "A1", config.criteria[0])).toBe(
      "Insufficient evidence",
    );
  });
  it("D20 validates saved graph, phase versions, sequence and incomplete records", () => {
    const valid = completeRun();
    for (const mutate of [
      (r: typeof valid) => {
        delete r.sessions.A1.submitted["A.I"];
      },
      (r: typeof valid) => {
        r.sessions.A1.submitted["A.U"].phaseVersion = "wrong";
      },
      (r: typeof valid) => {
        r.actualSequence.push("A1");
      },
      (r: typeof valid) => {
        r.end!.incomplete.push({
          caseId: "B1",
          phaseId: "B.U",
          promptId: "B.P3",
          opportunity: "Not elicited",
        });
      },
    ]) {
      const r = structuredClone(valid);
      mutate(r);
      expect(() => parseRun(JSON.stringify(r))).toThrow();
    }
  });
  it("D20 captures facts and rubric content by value", () => {
    const c = structuredClone(config),
      run = createRun(c);
    c.cases[0].phases[0].facts[0] = "new facts";
    c.criteria[0].descriptors.Proficient = "new rubric";
    expect(run.config).toEqual(config);
    expect(parseRun(JSON.stringify(run)).config).toEqual(config);
  });
});
describe("real human review contract", () => {
  it("requires identifiable prior reasoning for update performance, with same-phase cross-field evidence allowed", () => {
    const run = completeRun();
    const r = reviewRecord(run, "B2", "B-R4");
    r.comparisonEvidence = [];
    expect(() => validateReviewRecord(r, run)).toThrow(
      "preserved prior reasoning",
    );
    r.comparisonEvidence = [
      {
        phaseId: "B.I",
        promptId: "B.P2",
        location: "Second initial prompt",
        excerpt: "",
      },
    ];
    expect(() => validateReviewRecord(r, run)).not.toThrow();
    run.sessions.B2.submitted["B.I"].answers = { "B.P1": "", "B.P2": "" };
    expect(() => validateReviewRecord(r, run)).toThrow(
      "prior evidence is unavailable",
    );
    r.primary.judgement = "Insufficient evidence";
    expect(() => validateReviewRecord(r, run)).not.toThrow();
    expect(evidenceAvailability(run, "B2", config.criteria[9])).toBe(
      "Insufficient evidence",
    );
  });
  it("D11/D12 refuses review before end and creates no automatic ratings", async () => {
    await expect(emptyReviewBundle(createRun(config))).rejects.toThrow("End");
    const b = await emptyReviewBundle(completeRun());
    expect(b.records).toEqual([]);
  });
  it("D12/D13 binds feedback to the exact run, response record and versions", async () => {
    const run = completeRun(),
      bundle = await emptyReviewBundle(run);
    bundle.records = [reviewRecord(run)];
    expect(await parseReviewBundle(JSON.stringify(bundle), run)).toEqual(
      bundle,
    );
    await expect(
      parseReviewBundle(JSON.stringify(bundle), completeRun()),
    ).rejects.toThrow("different");
    const changed = structuredClone(run);
    changed.sessions.A1.submitted["A.I"].answers["A.P1"] = "Changed";
    await expect(
      parseReviewBundle(JSON.stringify(bundle), changed),
    ).rejects.toThrow("different");
    expect(await runBinding(changed)).not.toBe(bundle.binding);
  });
  it("D14 rejects invented excerpts and phase misattribution", () => {
    const run = completeRun(),
      r = reviewRecord(run);
    r.primary.evidence[0].excerpt = "Invented quotation";
    expect(() => validateReviewRecord(r, run)).toThrow("excerpt");
    r.primary.evidence[0].excerpt = "";
    r.primary.evidence[0].phaseId = "A.U";
    r.primary.evidence[0].promptId = "A.P5";
    expect(() => validateReviewRecord(r, run)).toThrow("actual prompt");
  });
  it("D10/D14 accepts relevant evidence elsewhere in the same phase, never blank-only Developing", () => {
    const run = completeRun(""),
      r = reviewRecord(run);
    r.primary.judgement = "Developing";
    r.primary.evidence[0].excerpt = "";
    expect(() => validateReviewRecord(r, run)).toThrow("blank");
    run.sessions.A1.submitted["A.I"].answers["A.P3"] =
      "Comparison reasoning located in another initial prompt";
    r.primary.evidence[0].promptId = "A.P3";
    expect(() => validateReviewRecord(r, run)).not.toThrow();
  });
  it("D14 retains initial primary judgement alongside later supplementary evidence", () => {
    const run = completeRun(),
      r = reviewRecord(run);
    r.supplementary = [
      {
        ...structuredClone(r.primary),
        judgement: "Proficient",
        evidence: [
          {
            phaseId: "A.U",
            promptId: "A.P6",
            location: "First paragraph",
            excerpt: "",
          },
        ],
        rationale:
          "Later reasoning repairs the comparison; initial judgement remains unchanged.",
      },
    ];
    validateReviewRecord(r, run);
    expect(r.primary.judgement).toBe("Emerging");
    expect(r.supplementary[0].judgement).toBe("Proficient");
    const b = reviewRecord(run, "B1", "B-R1");
    b.supplementary = r.supplementary;
    expect(() => validateReviewRecord(b, run)).toThrow("no supplementary");
  });
  it("D13 distinguishes evidence statuses and Uncertain and requires further elicitation/review", () => {
    const run = completeRun(""),
      r = reviewRecord(run);
    r.primary.judgement = "Insufficient evidence";
    r.primary.evidence[0].excerpt = "";
    expect(() => validateReviewRecord(r, run)).not.toThrow();
    r.primary.judgement = null;
    r.primary.reviewStatus = "Uncertain";
    expect(() => validateReviewRecord(r, run)).toThrow("competing");
    r.primary.competingInterpretations =
      "One rater sees a relationship; another sees only assertion. Seek independent review.";
    expect(() => validateReviewRecord(r, run)).not.toThrow();
    r.primary.nextOpportunity = "";
    expect(() => validateReviewRecord(r, run)).toThrow("further review");
  });
  it("B-R4 judges the supplied intervention against captured initial account/prediction", () => {
    const run = completeRun(),
      r = reviewRecord(run, "B2", "B-R4");
    expect(config.criteria[9].comparisonPrompts).toEqual(["B.P1", "B.P2"]);
    expect(config.cases[3].phases[1].prompts[1].text).toContain(
      "proposed intervention",
    );
    expect(() => validateReviewRecord(r, run)).not.toThrow();
  });
  it("preserves independent judgements and immutable revision histories", async () => {
    const run = completeRun(),
      bundle = await emptyReviewBundle(run),
      first = reviewRecord(run),
      second = {
        ...structuredClone(first),
        id: crypto.randomUUID(),
        reviewer: "Rater 2",
      };
    bundle.records = mergeReviews([first], [second]);
    expect(bundle.records).toHaveLength(2);
    expect(mergeReviews(bundle.records, [first])).toHaveLength(2);
    const tampered = { ...first, reviewer: "Changed rater" };
    expect(() => mergeReviews(bundle.records, [tampered])).toThrow(
      "overwritten",
    );
    const revised = {
      ...structuredClone(first),
      id: crypto.randomUUID(),
      supersedes: first.id,
    };
    bundle.records.push(revised);
    expect(
      (await parseReviewBundle(JSON.stringify(bundle), run)).records,
    ).toHaveLength(3);
    bundle.records = [revised];
    await expect(
      parseReviewBundle(JSON.stringify(bundle), run),
    ).rejects.toThrow("earlier");
  });
});

describe("free case order and captured-session compatibility", () => {
  it("starts B2 first, interleaves case phases and keeps exact submissions", () => {
    let run = beginCase(createRun(config), "B2");
    run = submitPhase(run, "B2", "B.I", response(run, "B2", "B.I", "B2 first"));
    run = beginCase(run, "A2");
    run = submitPhase(run, "A2", "A.I", response(run, "A2", "A.I", "A2 next"));
    run = submitPhase(
      run,
      "B2",
      "B.U",
      response(run, "B2", "B.U", "B2 update"),
    );
    run = beginCase(run, "B1");
    run = beginCase(run, "A1");
    for (const id of ["B1", "A1", "A2"]) {
      const a = config.cases.find((a) => a.id === id)!;
      for (const p of a.phases)
        if (!run.sessions[id].submitted[p.id])
          run = submitPhase(run, id, p.id, response(run, id, p.id));
    }
    expect(run.actualSequence).toEqual(["B2", "A2", "B1", "A1"]);
    expect(
      run.submissionSequence.slice(0, 3).map((r) => `${r.caseId}/${r.phaseId}`),
    ).toEqual(["B2/B.I", "A2/A.I", "B2/B.U"]);
    expect(run.sessions.B2.submitted["B.I"].answers["B.P1"]).toBe("B2 first");
    expect(run.end?.kind).toBe("complete");
    expect(parseRun(JSON.stringify(run))).toEqual(run);
    for (const corrupt of [
      (r: typeof run) => {
        r.actualSequence.push("B2");
      },
      (r: typeof run) => {
        r.submissionSequence[0] = r.submissionSequence[2];
      },
      (r: typeof run) => {
        r.submissionSequence.splice(0, 1);
      },
      (r: typeof run) => {
        delete r.sessions.B2.revealedAt["B.U"];
      },
    ]) {
      const invalid = structuredClone(run);
      corrupt(invalid);
      expect(() => parseRun(JSON.stringify(invalid))).toThrow();
    }
  });
  it("resumes the latest unfinished activity and uses suggested order for ties", () => {
    const created = createRun(config);
    const firstAt = new Date(
      Date.parse(created.createdAt) + 1000,
    ).toISOString();
    const laterAt = new Date(Date.parse(firstAt) + 1000).toISOString();
    let run = beginCase(beginCase(created, "B2", firstAt), "A1", firstAt);
    // Draft creation time must not obscure the intentional equal activity timestamps.
    run.sessions.B2.draft!.updatedAt = firstAt;
    run.sessions.A1.draft!.updatedAt = firstAt;
    expect(resumePath(run)).toContain("A1/stage/A.I");
    run = beginCase(run, "B2", laterAt);
    expect(resumePath(run)).toContain("B2/stage/B.I");
    expect(parseRun(JSON.stringify(run))).toEqual(run);
  });
});

it("keeps KALP-ALIGN-04 captured content and fixed progression when policy and blocks are absent", async () => {
  const { default: captured } = await import("./fixtures/kalp-align-04.json");
  const old = ConfigSchema.parse(captured);
  let run = createRun(old);
  expect(caseAvailable(run, "B2")).toBe(false);
  expect(() => beginCase(run, "B2")).toThrow();
  run = beginCase(run, "A1");
  expect(parseRun(JSON.stringify(run)).config).toEqual(old);
  expect(run.config.packageVersion).toBe("KALP-ALIGN-04");
  expect(resumePath(run)).toContain("A1/stage/A.I");
  for (const a of old.cases) {
    run = beginCase(run, a.id);
    for (const phase of a.phases)
      run = submitPhase(run, a.id, phase.id, response(run, a.id, phase.id));
  }
  const oldDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(run)),
  );
  const oldBinding = Array.from(new Uint8Array(oldDigest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  expect(await runBinding(run)).toBe(oldBinding);
  expect(await runBinding(parseRun(JSON.stringify(run)))).toBe(oldBinding);
});
