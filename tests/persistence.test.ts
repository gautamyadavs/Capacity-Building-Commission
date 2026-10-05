import { describe, it, expect, vi, afterEach } from "vitest";
import { RunStore } from "../src/persistence";
import { ReviewerStore } from "../src/reviewer";
import { beginCase, createRun, emptyReviewBundle, parseRun, submitPhase } from "../src/model";
import { config, MemoryStorage, completeRun, reviewRecord } from "./helpers";
afterEach(() => vi.useRealTimers());
describe("local run durability", () => {
  it("retries a submitted case after completion, preserving other cases and previous feedback", async () => {
    const storage = new MemoryStorage(), store = new RunStore(config, storage, "/");
    const previous = completeRun("Previous exact response"), bundle = await emptyReviewBundle(previous);
    bundle.records = [reviewRecord(previous)];
    await store.importSession(JSON.stringify(previous));
    await store.importReviews(JSON.stringify(bundle));
    await store.retry(["A1"], "A1");
    const next = store.exportSession();
    expect(next.runId).not.toBe(previous.runId);
    expect(next.config).toEqual(previous.config);
    expect(next.end).toBeNull();
    expect(next.sessions.A1.submitted).toEqual({});
    expect(next.sessions.A1.draft?.answers["A.P1"]).toBe("");
    expect(next.sessions.A1.revealedAt["A.U"]).toBeUndefined();
    expect(next.sessions.B2).toEqual(previous.sessions.B2);
    expect(next.submissionSequence).toHaveLength(6);
    expect(parseRun(JSON.stringify(next))).toEqual(next);
    expect(store.getSnapshot().reviews).toBeNull();
    expect(store.previousAttempts().find(r => r.runId === previous.runId)).toEqual(previous);
    expect(await store.reviewsFor(previous)).toEqual(bundle);
    const reopened = new RunStore(config, storage, "/");
    await reopened.loadReviews();
    expect(reopened.exportSession()).toEqual(next);
    expect(reopened.getSnapshot().reviews).toBeNull();
    await expect(reopened.importReviews(JSON.stringify(bundle))).rejects.toThrow("different session");
  });
  it("retries a set after early end, retaining other drafts and preventing stale tabs from restoring old answers", async () => {
    const storage = new MemoryStorage(), store = new RunStore(config, storage, "/");
    await store.begin("A1");
    await store.begin("B2");
    const draft = store.exportSession().sessions.B2.draft!;
    store.edit("B2", {...draft, answers: {...draft.answers, "B.P1": "Keep this other-set draft"}});
    await store.end("Trial ended");
    const previous = store.exportSession(), stale = new RunStore(config, storage, "/");
    await store.retry(["A1", "A2"]);
    const next = store.exportSession();
    expect(next.end).toBeNull();
    expect(next.sessions.A1.startedAt).toBeNull();
    expect(next.sessions.A2.startedAt).toBeNull();
    expect(next.sessions.B2).toEqual(previous.sessions.B2);
    expect(parseRun(JSON.stringify(next))).toEqual(next);
    await expect(stale.begin("A1")).rejects.toThrow("changed in another tab");
    expect(stale.exportSession()).toEqual(next);
  });
  it("preserves a trial attempt if archiving or replacement fails", async () => {
    const storage = new MemoryStorage(), store = new RunStore(config, storage, "/");
    await store.importSession(JSON.stringify(completeRun()));
    const previous = store.exportSession();
    storage.fail = true;
    await expect(store.retry(["A1"])).rejects.toThrow();
    expect(store.exportSession()).toEqual(previous);
    storage.fail = false;
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === store.key) throw new Error("Replacement failed");
      write(key, value);
    };
    await expect(store.retry(["A1"])).rejects.toThrow("Replacement failed");
    expect(store.exportSession()).toEqual(previous);
    expect(JSON.parse(storage.getItem(store.key)!)).toEqual(previous);
    expect(store.previousAttempts()).toEqual([]);
  });
  it("keeps retry history within its trial when a facilitator starts another participant", async () => {
    const store = new RunStore(config, new MemoryStorage(), "/"),
      previous = completeRun("Previous participant response");
    await store.importSession(JSON.stringify(previous));
    await store.retry(["A1"], "A1");
    expect(store.previousAttempts()).toEqual([previous]);
    await store.reset(config);
    expect(store.previousAttempts()).toEqual([]);
    const archivedRuns = Object.values(store.recoveryData()).flatMap((raw) => {
      try { return [parseRun(raw)]; } catch { return []; }
    });
    expect(archivedRuns).toContainEqual(previous);
    await store.importSession(JSON.stringify(completeRun("Another participant")));
    expect(store.previousAttempts()).toEqual([]);
  });
  it("retries all cases with a new empty run and retains fixed-order captured-session validity", async () => {
    const store = new RunStore(config, new MemoryStorage(), "/");
    await store.importSession(JSON.stringify(completeRun()));
    await store.retry(config.cases.map(a => a.id));
    expect(store.exportSession().actualSequence).toEqual([]);
    expect(store.exportSession().submissionSequence).toEqual([]);
    expect(store.exportSession().end).toBeNull();
    const fixed = {...structuredClone(config), caseOrderPolicy: "fixed" as const};
    let run = createRun(fixed);
    for (const a of fixed.cases) {
      run = beginCase(run, a.id);
      for (const p of a.phases) run = submitPhase(run, a.id, p.id, run.sessions[a.id].draft!);
    }
    await store.importSession(JSON.stringify(run));
    await store.retry(["A2"], "A2");
    const next = store.exportSession();
    expect(next.sessions.A1).toEqual(run.sessions.A1);
    expect(next.sessions.B1.startedAt).toBeNull();
    expect(next.sessions.B2.startedAt).toBeNull();
    expect(next.config).toEqual(fixed);
    expect(parseRun(JSON.stringify(next))).toEqual(next);
  });
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
    later.packageVersion = "KALP-ALIGN-06";
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
