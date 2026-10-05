import { describe, it, expect, vi, afterEach } from "vitest";
import { RunStore } from "../src/persistence";
import { ReviewerStore } from "../src/reviewer";
import { emptyReviewBundle } from "../src/model";
import { config, MemoryStorage, completeRun, reviewRecord } from "./helpers";
afterEach(() => vi.useRealTimers());
describe("local run durability", () => {
  it("D18 journals a draft before debounce and restores it after reopen", async () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage(),
      store = new RunStore(config, storage, "/test/");
    await store.begin("A1");
    const draft = store.getSnapshot().run.sessions.A1.draft!;
    store.edit("A1", {
      ...draft,
      answers: { ...draft.answers, "A.P1": "Exact draft" },
    });
    const restored = new RunStore(config, storage, "/test/");
    expect(restored.getSnapshot().run.sessions.A1.draft?.answers["A.P1"]).toBe(
      "Exact draft",
    );
    await restored.flush();
    expect(restored.getSnapshot().saveStatus).toBe("Saved");
  });
  it("D08/D19 persists initial before revealing update, with repeated submission rejected", async () => {
    const s = new RunStore(config, new MemoryStorage(), "/");
    await s.begin("A1");
    const draft = s.getSnapshot().run.sessions.A1.draft!;
    s.edit("A1", {
      ...draft,
      answers: { ...draft.answers, "A.P1": "Initial" },
    });
    await s.flush();
    const response = s.getSnapshot().run.sessions.A1.draft!;
    await s.submit("A1", "A.I", response);
    expect(
      s.getSnapshot().run.sessions.A1.submitted["A.I"].answers["A.P1"],
    ).toBe("Initial");
    await expect(s.submit("A1", "A.I", response)).rejects.toThrow();
    expect(s.getSnapshot().run.submissionSequence).toHaveLength(1);
  });
  it("D18 retains in-memory draft on failed saving and retries without reveal", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/");
    await s.begin("A1");
    storage.fail = true;
    const d = s.getSnapshot().run.sessions.A1.draft!;
    s.edit("A1", {
      ...d,
      answers: { ...d.answers, "A.P1": "Unsaved but recoverable" },
    });
    await expect(s.flush()).rejects.toThrow();
    expect(s.getSnapshot().saveStatus).toBe("Not saved");
    expect(s.exportSession().sessions.A1.draft?.answers["A.P1"]).toBe(
      "Unsaved but recoverable",
    );
    expect(s.getSnapshot().run.sessions.A1.revealedAt["A.U"]).toBeUndefined();
    storage.fail = false;
    await s.flush();
    expect(s.getSnapshot().saveStatus).toBe("Saved");
  });
  it("failed submission retains current phase and no update reveal", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/");
    await s.begin("A1");
    storage.fail = true;
    await expect(
      s.submit("A1", "A.I", s.getSnapshot().run.sessions.A1.draft!),
    ).rejects.toThrow();
    expect(s.getSnapshot().run.sessions.A1.submitted).toEqual({});
    expect(s.getSnapshot().run.sessions.A1.revealedAt["A.U"]).toBeUndefined();
  });
  it("cross-tab original submissions and reset run cannot be revived by stale drafts", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/");
    await s.begin("A1");
    const old = new RunStore(config, storage, "/"),
      draft = old.getSnapshot().run.sessions.A1.draft!;
    await s.submit("A1", "A.I", s.getSnapshot().run.sessions.A1.draft!);
    old.edit("A1", {
      ...draft,
      answers: { ...draft.answers, "A.P1": "Stale" },
    });
    await old.flush();
    expect(
      old.getSnapshot().run.sessions.A1.submitted["A.I"].answers["A.P1"],
    ).toBe("");
    await s.reset(config);
    old.edit("A1", draft);
    await old.flush();
    expect(old.getSnapshot().run.runId).toBe(s.getSnapshot().run.runId);
    expect(old.getSnapshot().run.sessions.A1.startedAt).toBeNull();
  });
  it("D20 restores captured tasks and rubric rather than current release content", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/");
    await s.begin("A1");
    const later = structuredClone(config);
    later.packageVersion = "KALP-ALIGN-05";
    later.cases[0].phases[0].facts[0] = "Later facts";
    later.criteria[0].descriptors.Proficient = "Later descriptor";
    const restored = new RunStore(later, storage, "/");
    expect(restored.getSnapshot().run.config).toEqual(config);
    expect(restored.getSnapshot().notice).toContain("captured");
  });
  it("preserves old pilot keys, journals, archives and malformed current raw data", async () => {
    const storage = new MemoryStorage();
    storage.setItem("bharat-kalp:/:v2:learner", "old pilot raw");
    storage.setItem("bharat-kalp:/:v2:learner:draft:old:A1", "old draft");
    const s = new RunStore(config, storage, "/");
    expect(s.legacyData()).toHaveLength(2);
    await s.begin("A1");
    await s.reset(config);
    expect(Object.values(s.recoveryData())).toContain("old pilot raw");
    expect(Object.values(s.recoveryData())).toContain("old draft");
    storage.setItem(s.key, "malformed");
    const broken = new RunStore(config, storage, "/");
    expect(broken.getSnapshot().fatal).toBe(true);
    expect(storage.getItem(s.key)).toBe("malformed");
    await broken.recoverNew(config);
    expect(Object.values(broken.recoveryData())).toContain("malformed");
    expect(broken.getSnapshot().fatal).toBe(false);
  });
  it("archives session before import and rejects legacy evidence without changing current run", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/");
    await s.begin("A1");
    const before = s.exportSession();
    await expect(s.importSession('{"schemaVersion":2}')).rejects.toThrow();
    expect(s.exportSession()).toEqual(before);
    await s.importSession(JSON.stringify(completeRun()));
    expect(Object.values(s.recoveryData())).toContain(JSON.stringify(before));
  });
  it("separates reviews from immutable run, merges safely and restores feedback after refresh", async () => {
    const storage = new MemoryStorage(),
      s = new RunStore(config, storage, "/"),
      run = completeRun();
    await s.importSession(JSON.stringify(run));
    const bundle = await emptyReviewBundle(run);
    bundle.records = [reviewRecord(run)];
    await s.importReviews(JSON.stringify(bundle));
    expect(s.exportSession()).toEqual(run);
    const again = new RunStore(config, storage, "/");
    await again.loadReviews();
    expect(again.getSnapshot().reviews?.records).toHaveLength(1);
    await again.importReviews(JSON.stringify(bundle));
    expect(again.getSnapshot().reviews?.records).toHaveLength(1);
  });
  it("keeps deployment base paths independent", async () => {
    const storage = new MemoryStorage(),
      a = new RunStore(config, storage, "/a/"),
      b = new RunStore(config, storage, "/b/");
    await a.begin("A1");
    expect(b.getSnapshot().run.sessions.A1.startedAt).toBeNull();
  });
});
describe("reviewer workspace", () => {
  it("preserves a replaced review draft and restores an exported workspace with its captured run", async () => {
    const storage = new MemoryStorage(),
      s = new ReviewerStore(storage, "/");
    await s.load();
    const run = completeRun(),
      r = reviewRecord(run);
    await s.importSession(JSON.stringify(run));
    const draft = {
      caseId: r.caseId,
      criterionId: r.criterionId,
      reviewer: r.reviewer,
      primary: r.primary,
      comparisonEvidence: r.comparisonEvidence,
      supplementary: r.supplementary,
      supersedes: r.supersedes,
    };
    s.edit(draft);
    const backup = JSON.stringify(s.workspaceData());
    s.edit({ ...draft, caseId: "A2" });
    expect(Object.values(s.recoveryData().stored)).toContain(backup);
    await s.restoreWorkspace(backup);
    expect(s.getSnapshot().run).toEqual(run);
    expect(s.getSnapshot().draft).toEqual(draft);
    const restored = new ReviewerStore(storage, "/");
    await restored.load();
    expect(restored.workspaceData()).toEqual(JSON.parse(backup));
    const invalid = JSON.parse(backup);
    invalid.draft.caseId = "Unknown";
    await expect(s.restoreWorkspace(JSON.stringify(invalid))).rejects.toThrow(
      "Invalid reviewer draft target",
    );
    expect(s.workspaceData()).toEqual(JSON.parse(backup));
  });
  it("only accepts ended sessions and journals reviewer drafts, preserving pre-revision records", async () => {
    const storage = new MemoryStorage(),
      s = new ReviewerStore(storage, "/");
    await s.load();
    const learner = new RunStore(config, new MemoryStorage(), "/");
    await expect(
      s.importSession(JSON.stringify(learner.exportSession())),
    ).rejects.toThrow("End");
    const run = completeRun();
    await s.importSession(JSON.stringify(run));
    const r = reviewRecord(run);
    const draft = {
      caseId: r.caseId,
      criterionId: r.criterionId,
      reviewer: r.reviewer,
      primary: r.primary,
      comparisonEvidence: r.comparisonEvidence,
      supplementary: r.supplementary,
      supersedes: r.supersedes,
    };
    s.edit(draft);
    const restored = new ReviewerStore(storage, "/");
    await restored.load();
    expect(restored.getSnapshot().draft).toEqual(draft);
    await restored.save();
    expect(restored.getSnapshot().bundle?.records).toHaveLength(1);
    expect(restored.getSnapshot().draft).toBeNull();
  });
  it("failed review save keeps draft recoverable; stale reviewer tab cannot overwrite saved workspace", async () => {
    const storage = new MemoryStorage(),
      s = new ReviewerStore(storage, "/");
    await s.load();
    const run = completeRun();
    await s.importSession(JSON.stringify(run));
    const old = new ReviewerStore(storage, "/");
    await old.load();
    const r = reviewRecord(run),
      draft = {
        caseId: r.caseId,
        criterionId: r.criterionId,
        reviewer: r.reviewer,
        primary: r.primary,
        comparisonEvidence: r.comparisonEvidence,
        supplementary: [],
        supersedes: null,
      };
    s.edit(draft);
    old.edit({ ...draft, reviewer: "Stale" });
    expect(old.getSnapshot().error).toContain("another tab");
    expect(JSON.parse(storage.getItem(s.key)!).draft.reviewer).toBe(
      "Human rater 1",
    );
    storage.fail = true;
    await expect(s.save()).rejects.toThrow();
    expect(s.getSnapshot().draft).toEqual(draft);
    expect(s.getSnapshot().status).toBe("Not saved");
  });
});
