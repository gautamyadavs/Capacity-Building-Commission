import {
  beginCase,
  createRun,
  currentPhase,
  DraftSchema,
  emptyReviewBundle,
  endRun,
  mergeReviews,
  parseReviewBundle,
  parseRun,
  retryCases,
  submitPhase,
  validAnswers,
  type Config,
  type Draft,
  type ReviewBundle,
  type Run,
} from "./model";

export type StoreView = {
  run: Run;
  reviews: ReviewBundle | null;
  saveStatus: "Saved" | "Saving…" | "Not saved" | "Ready";
  error: string | null;
  notice: string | null;
  fatal: boolean;
};
export class RunStore {
  readonly key: string;
  private view: StoreView;
  private listeners = new Set<() => void>();
  private pending = new Map<string, Draft>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private raw: string | null = null;
  constructor(
    config: Config,
    private storage: Storage = localStorage,
    private base = import.meta.env.BASE_URL,
  ) {
    this.key = `bharat-kalp:${base}:v3:learner`;
    this.view = {
      run: createRun(config),
      reviews: null,
      saveStatus: "Ready",
      error: null,
      notice: null,
      fatal: false,
    };
    try {
      this.raw = storage.getItem(this.key);
      if (this.raw) {
        this.view.run = parseRun(this.raw);
        this.view.saveStatus = "Saved";
      }
      const run = this.view.run;
      if (
        run.config.packageVersion !== config.packageVersion ||
        JSON.stringify(run.config) !== JSON.stringify(config)
      )
        this.view.notice =
          "This session uses its captured design. The current release has newer content; export this session and start a new one to use it.";
      if (!run.end)
        for (const a of run.config.cases) {
          const p = currentPhase(a, run.sessions[a.id]),
            raw = storage.getItem(this.draftKey(a.id));
          if (p && raw) {
            const parsed = DraftSchema.safeParse(JSON.parse(raw));
            if (
              parsed.success &&
              parsed.data.phaseId === p.id &&
              validAnswers(p, parsed.data.answers) &&
              parsed.data.updatedAt >=
                (run.sessions[a.id].draft?.updatedAt || "")
            ) {
              run.sessions[a.id].draft = parsed.data;
              this.pending.set(a.id, parsed.data);
              this.view.saveStatus = "Saving…";
            }
          }
        }
      if (this.pending.size) this.schedule();
      if (this.legacyData().length)
        this.view.notice = [
          this.view.notice,
          "Older pilot data is preserved on this browser. Download it from Recovery and files.",
        ]
          .filter(Boolean)
          .join(" ");
    } catch {
      this.view = {
        ...this.view,
        fatal: true,
        error:
          "Saved progress could not be read safely. Your stored data has not been changed.",
        saveStatus: "Not saved",
      };
    }
  }
  private draftKey(id: string) {
    return `${this.key}:draft:${this.view.run.runId}:${id}`;
  }
  private reviewKey() {
    return `${this.key}:reviews:${this.view.run.runId}`;
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(next: Partial<StoreView>) {
    this.view = { ...this.view, ...next };
    this.listeners.forEach((fn) => fn());
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush().catch(() => {}), 500);
  }
  edit(id: string, draft: Draft) {
    this.sync();
    const run = this.view.run,
      a = run.config.cases.find((a) => a.id === id),
      s = run.sessions[id];
    if (
      this.view.fatal ||
      run.end ||
      !a ||
      currentPhase(a, s)?.id !== draft.phaseId
    )
      return;
    if (s.draft?.updatedAt !== draft.updatedAt) {
      this.emit({
        notice:
          "The draft changed in another tab. Its latest version is restored; reapply your edit.",
      });
      return;
    }
    const p = currentPhase(a, s)!;
    if (!validAnswers(p, draft.answers)) return;
    const copy = structuredClone(draft);
    copy.updatedAt = new Date().toISOString();
    this.pending.set(id, copy);
    const next = structuredClone(run);
    next.sessions[id].draft = copy;
    this.emit({ run: next, saveStatus: "Saving…", error: null });
    try {
      this.storage.setItem(this.draftKey(id), JSON.stringify(copy));
    } catch {
      this.emit({
        error:
          "Your latest edit could not be saved. Keep this page open; retry or download the current session.",
        saveStatus: "Not saved",
      });
    }
    this.schedule();
  }
  private overlay(run: Run) {
    for (const [id, draft] of this.pending) {
      const a = run.config.cases.find((a) => a.id === id)!;
      if (
        !run.end &&
        currentPhase(a, run.sessions[id])?.id === draft.phaseId &&
        (run.sessions[id].draft?.updatedAt || "") <= draft.updatedAt
      )
        run.sessions[id].draft = structuredClone(draft);
      else this.pending.delete(id);
    }
  }
  private transact(change: (run: Run) => Run, reset = false): Promise<void> {
    const expected = this.view.run.runId;
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        const work = () => {
          if (this.view.fatal && !reset)
            throw new Error("Saved progress needs recovery.");
          const raw = this.storage.getItem(this.key),
            latest = reset
              ? this.view.run
              : raw
                ? parseRun(raw)
                : this.view.run;
          if (!reset && latest.runId !== expected) {
            this.pending.clear();
            this.emit({ run: latest, reviews: null });
            throw new Error(
              "This session changed in another tab. The latest session is restored.",
            );
          }
          const next = change(structuredClone(latest));
          const persisted = JSON.stringify(next);
          this.storage.setItem(this.key, persisted);
          this.raw = persisted;
          this.overlay(next);
          this.emit({
            run: next,
            error: null,
            fatal: false,
            saveStatus: this.pending.size ? "Saving…" : "Saved",
          });
        };
        if (typeof navigator !== "undefined" && navigator.locks)
          await navigator.locks.request(this.key, work);
        else work();
      })
      .catch((error) => {
        this.emit({
          error:
            error instanceof Error
              ? error.message
              : "Progress could not be saved.",
          saveStatus: "Not saved",
        });
        throw error;
      });
    this.queue = task;
    return task;
  }
  flush = async () => {
    clearTimeout(this.timer);
    if (!this.pending.size) {
      await this.queue.catch(() => {});
      return;
    }
    const captured = new Map(this.pending);
    await this.transact((run) => {
      for (const [id, draft] of captured) {
        const a = run.config.cases.find((a) => a.id === id)!;
        if (
          !run.end &&
          currentPhase(a, run.sessions[id])?.id === draft.phaseId &&
          (run.sessions[id].draft?.updatedAt || "") <= draft.updatedAt
        )
          run.sessions[id].draft = draft;
      }
      return run;
    });
    for (const [id, draft] of captured)
      if (this.pending.get(id) === draft) this.pending.delete(id);
    this.emit({ saveStatus: this.pending.size ? "Saving…" : "Saved" });
  };
  async begin(id: string) {
    await this.flush();
    await this.transact((run) => beginCase(run, id));
  }
  async submit(id: string, pid: string, draft: Draft) {
    await this.flush();
    await this.transact((run) => {
      if (
        JSON.stringify(run.sessions[id].draft?.answers) !==
        JSON.stringify(draft.answers)
      )
        throw new Error(
          "The draft changed before submission. Read the restored draft and submit again.",
        );
      return submitPhase(run, id, pid, draft);
    });
  }
  async end(reason: string) {
    await this.flush();
    await this.transact((run) => endRun(run, reason));
  }
  async support(notes: string) {
    await this.flush();
    await this.transact((run) => {
      if (run.end)
        throw new Error("Support notes are locked after diagnostic end.");
      run.supportNotes = notes;
      return run;
    });
  }
  async reset(config: Config) {
    clearTimeout(this.timer);
    await this.flush();
    await this.transact((run) => {
      const raw = this.storage.getItem(this.key);
      if (raw)
        this.storage.setItem(
          `${this.key}:archive:${run.runId}:${Date.now()}`,
          raw,
        );
      this.pending.clear();
      return createRun(config);
    }, true);
    this.emit({
      reviews: null,
      notice:
        "A new diagnostic is ready. Previous saved sessions remain available in Recovery and files.",
    });
  }
  async retry(ids: string[], openCase?: string) {
    await this.flush();
    await this.transact((run) => {
      let next = retryCases(run, ids);
      if (openCase) {
        if (!ids.includes(openCase))
          throw new Error("Choose a retried case to open.");
        next = beginCase(next, openCase);
      }
      // Validate and archive before replacing the active record. A failed write keeps it intact.
      parseRun(JSON.stringify(next));
      this.storage.setItem(
        `${this.key}:archive:${run.runId}:${Date.now()}`,
        JSON.stringify(run),
      );
      this.storage.setItem(
        `${this.key}:attempts:${next.runId}`,
        JSON.stringify([...this.attemptHistory(run.runId), run.runId]),
      );
      return next;
    });
    this.emit({
      reviews: null,
      notice: "Previous attempt saved. Your retry is ready.",
    });
  }
  private attemptHistory(runId: string): string[] {
    try {
      const raw = this.storage.getItem(`${this.key}:attempts:${runId}`);
      const ids: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(ids) && ids.every((id) => typeof id === "string")
        ? [...new Set(ids)]
        : [];
    } catch {
      return [];
    }
  }
  previousAttempts(): Run[] {
    const history = this.attemptHistory(this.view.run.runId),
      runs = new Map<string, Run>();
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(`${this.key}:archive:`)) continue;
      try {
        const run = parseRun(this.storage.getItem(key)!);
        if (run.actualSequence.length && history.includes(run.runId))
          runs.set(run.runId, run);
      } catch {
        // Unreadable archives remain available through recovery.
      }
    }
    return history.flatMap((id) => runs.has(id) ? [runs.get(id)!] : []).reverse();
  }
  async reviewsFor(run: Run) {
    const raw = this.storage.getItem(`${this.key}:reviews:${run.runId}`);
    return raw ? parseReviewBundle(raw, run) : null;
  }
  async recoverNew(config: Config) {
    clearTimeout(this.timer);
    await this.transact(() => {
      const raw = this.storage.getItem(this.key);
      if (raw) this.storage.setItem(`${this.key}:recovery:${Date.now()}`, raw);
      this.pending.clear();
      return createRun(config);
    }, true);
    this.emit({
      reviews: null,
      notice:
        "The unreadable data was preserved separately. A new diagnostic is ready.",
    });
  }
  async importSession(raw: string) {
    const imported = parseRun(raw);
    await this.flush();
    await this.transact(() => {
      const previous = this.storage.getItem(this.key);
      if (previous)
        this.storage.setItem(`${this.key}:archive:${Date.now()}`, previous);
      this.pending.clear();
      return imported;
    }, true);
    this.emit({
      reviews: null,
      notice:
        "Imported the captured session. Its original task and rubric content remain in use.",
    });
    await this.loadReviews();
  }
  async importReviews(raw: string) {
    this.sync();
    const run = this.view.run,
      bundle = await parseReviewBundle(raw, run);
    const work = async () => {
      this.sync();
      if (this.view.run.runId !== run.runId)
        throw new Error("Session changed while importing reviews.");
      const prior = this.storage.getItem(this.reviewKey()),
        existing = prior
          ? await parseReviewBundle(prior, run)
          : await emptyReviewBundle(run);
      const merged = {
        ...existing,
        records: mergeReviews(existing.records, bundle.records),
      };
      await parseReviewBundle(JSON.stringify(merged), run);
      this.storage.setItem(this.reviewKey(), JSON.stringify(merged));
      this.emit({ reviews: merged, error: null });
    };
    try {
      if (navigator.locks)
        await navigator.locks.request(this.reviewKey(), work);
      else await work();
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }
  async loadReviews() {
    const run = this.view.run;
    try {
      const raw = this.storage.getItem(this.reviewKey());
      const reviews = raw ? await parseReviewBundle(raw, run) : null;
      if (this.view.run.runId === run.runId) this.emit({ reviews });
    } catch (error) {
      this.reportError(error);
    }
  }
  reportError(error: unknown) {
    this.emit({
      error:
        error instanceof Error
          ? error.message
          : "The file could not be read or saved.",
    });
  }
  sync = () => {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === this.raw) return;
      const run = raw ? parseRun(raw) : createRun(this.view.run.config);
      if (run.runId !== this.view.run.runId) {
        clearTimeout(this.timer);
        this.pending.clear();
      }
      this.overlay(run);
      this.raw = raw;
      this.emit({
        run,
        reviews: run.runId === this.view.run.runId ? this.view.reviews : null,
        fatal: false,
        error: null,
        saveStatus: this.pending.size ? "Saving…" : raw ? "Saved" : "Ready",
      });
    } catch {
      this.emit({
        fatal: true,
        error:
          "Saved progress changed but could not be read safely. Download recovery data.",
        saveStatus: "Not saved",
      });
    }
  };
  exportSession() {
    return structuredClone(this.view.run);
  }
  recoveryData() {
    const entries: Record<string, string> = {};
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(`bharat-kalp:${this.base}:`))
        entries[key] = this.storage.getItem(key)!;
    }
    return entries;
  }
  legacyData() {
    return Object.keys(this.recoveryData()).filter(
      (key) =>
        key.startsWith(`bharat-kalp:${this.base}:v1:`) ||
        key.startsWith(`bharat-kalp:${this.base}:v2:`),
    );
  }
}
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readJsonFile(file: File) {
  return file.text();
}
