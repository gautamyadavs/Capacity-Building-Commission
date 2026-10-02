import { DraftSchema, assessmentAvailable, batteryComplete, createRun, currentStage, emptyDraft, intermissionDue, parseRun, restoreRun, submitStage, validCardOrder, wordCount, type Config, type Draft, type Mode, type Run } from './model';

export type StoreView = { run: Run; saveStatus: 'Saved' | 'Saving…' | 'Not saved'; error: string | null; notice: string | null; fatal: boolean };
type Pending = { drafts: Map<string, Draft>; reflection: string | null };
const emptyPending = (): Pending => ({ drafts: new Map(), reflection: null });
export class RunStore {
  readonly key: string;
  private view: StoreView;
  private listeners = new Set<() => void>();
  private pending = emptyPending();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private raw: string | null = null;
  constructor(readonly config: Config, readonly mode: Mode, private storage: Storage = localStorage, base = import.meta.env.BASE_URL) {
    this.key = `bharat-kalp:${base}:v2:${mode}`;
    this.view = { run: createRun(config, mode), saveStatus: 'Saved', error: null, notice: null, fatal: false };
    try {
      this.raw = storage.getItem(this.key);
      const legacy = this.raw ? null : storage.getItem(`bharat-kalp:${base}:v1:${mode}`);
      if (this.raw || legacy) {
        const restored = restoreRun((this.raw || legacy)!, config, mode);
        this.view.run = restored.run;
        if (restored.migrated) {
          if (this.raw) storage.setItem(`${this.key}:backup:${restored.run.runId}`, this.raw);
          // Reset cases must not recover an old journal, even if its timestamp is
          // in the future. Preserve those journals alongside the existing backup.
          const prior = JSON.parse((this.raw || legacy)!);
          const obsoleteJournals: string[] = [];
          if (prior.schemaVersion === 2) {
            for (const [aid, session] of Object.entries(prior.sessions) as [string, Run['sessions'][string]][]) {
              const next = restored.run.sessions[aid];
              if (!next || next.contentVersion !== session.contentVersion || (session.startedAt && !next.startedAt)) {
                const key = `${this.key}:draft:${prior.runId}:${aid}`; const journal = storage.getItem(key);
                if (journal) { storage.setItem(`${this.key}:backup:${prior.runId}:draft:${aid}`, journal); obsoleteJournals.push(key); }
              }
            }
            if (!batteryComplete(config, restored.run)) {
              const key = `${this.key}:reflection:${prior.runId}`; const journal = storage.getItem(key);
              if (journal) { storage.setItem(`${this.key}:backup:${prior.runId}:reflection`, journal); obsoleteJournals.push(key); }
            }
          }
          this.raw = JSON.stringify(restored.run);
          storage.setItem(this.key, this.raw);
          for (const key of obsoleteJournals) storage.removeItem(key);
          this.view.notice = 'The assessment has been updated. Incompatible case progress has been restarted; your previous saved data is preserved separately on this browser.';
        }
      }
      for (const a of config.assessments) {
        const session = this.view.run.sessions[a.id]; const stage = currentStage(a, session);
        const journal = storage.getItem(this.draftKey(a.id));
        if (stage && journal) {
          const parsed = DraftSchema.safeParse(JSON.parse(journal));
          if (parsed.success && parsed.data.stageId === stage.id && parsed.data.updatedAt >= (session.draft?.updatedAt || '') && validCardOrder(a, parsed.data)) session.draft = parsed.data;
        }
      }
      const journal = storage.getItem(this.reflectionKey());
      if (journal && batteryComplete(config, this.view.run) && !this.view.run.reflection.submittedAt) {
        const value: unknown = JSON.parse(journal);
        if (typeof value === 'string') this.view.run.reflection.draft = value;
      }
    } catch {
      this.view = { ...this.view, fatal: true, error: 'Saved progress could not be read safely. Your stored data has not been changed.', saveStatus: 'Not saved' };
    }
  }
  private draftKey(aid: string) { return `${this.key}:draft:${this.view.run.runId}:${aid}`; }
  private reflectionKey() { return `${this.key}:reflection:${this.view.run.runId}`; }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(next: Partial<StoreView>) { this.view = { ...this.view, ...next }; this.listeners.forEach(fn => fn()); }
  private schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, 500); }
  edit(aid: string, draft: Draft) {
    // Journal writes are synchronous: check for a migrated/reset run even if a
    // cross-tab storage event has not yet reached this page.
    this.sync();
    const a = this.config.assessments.find(a => a.id === aid);
    if (!a || this.view.fatal || !assessmentAvailable(this.config, this.view.run, aid) || currentStage(a, this.view.run.sessions[aid])?.id !== draft.stageId) return;
    const copy = structuredClone(draft); copy.updatedAt = new Date().toISOString();
    this.pending.drafts.set(aid, copy);
    const run = structuredClone(this.view.run); run.sessions[aid].draft = copy;
    this.emit({ run, saveStatus: 'Saving…', error: null });
    try { this.storage.setItem(this.draftKey(aid), JSON.stringify(copy)); }
    catch { this.emit({ error: 'Your latest edit could not be saved. Keep this page open and retry.', saveStatus: 'Not saved' }); }
    this.schedule();
  }
  reflect(value: string) {
    this.sync();
    if (this.view.fatal || !batteryComplete(this.config, this.view.run) || this.view.run.reflection.submittedAt) return;
    this.pending.reflection = value;
    const run = structuredClone(this.view.run); run.reflection.draft = value;
    this.emit({ run, saveStatus: 'Saving…', error: null });
    try { this.storage.setItem(this.reflectionKey(), JSON.stringify(value)); }
    catch { this.emit({ error: 'Your reflection could not be saved. Keep this page open and retry.', saveStatus: 'Not saved' }); }
    this.schedule();
  }
  private overlay(run: Run) {
    for (const [aid, draft] of this.pending.drafts) {
      const a = this.config.assessments.find(a => a.id === aid)!;
      if (currentStage(a, run.sessions[aid])?.id === draft.stageId) run.sessions[aid].draft = structuredClone(draft);
      else this.pending.drafts.delete(aid);
    }
    if (this.pending.reflection !== null && batteryComplete(this.config, run) && !run.reflection.submittedAt) run.reflection.draft = this.pending.reflection;
    else this.pending.reflection = null;
  }
  private transact(change: (run: Run) => Run, allowReset = false): Promise<void> {
    const expectedRunId = this.view.run.runId;
    const task = this.queue.catch(() => {}).then(async () => {
      const work = () => {
        if (this.view.fatal && !allowReset) throw new Error('Saved progress needs recovery.');
        const raw = this.storage.getItem(this.key);
        const latest = allowReset ? this.view.run : raw ? parseRun(raw, this.config, this.mode) : this.view.run;
        if (!allowReset && latest.runId !== expectedRunId) {
          this.pending = emptyPending(); this.emit({ run: latest });
          throw new Error('This assessment was reset in another tab. The new session has been restored.');
        }
        const next = change(structuredClone(latest));
        const persisted = JSON.stringify(next);
        this.storage.setItem(this.key, persisted);
        this.raw = persisted;
        this.overlay(next);
        this.emit({ run: next, fatal: false, error: null, saveStatus: this.pending.drafts.size || this.pending.reflection !== null ? 'Saving…' : 'Saved' });
      };
      if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(this.key, work);
      else work();
    }).catch(error => {
      this.emit({ error: error instanceof Error ? error.message : 'Progress could not be saved.', saveStatus: 'Not saved' }); throw error;
    });
    this.queue = task; return task;
  }
  flush = async () => {
    clearTimeout(this.timer);
    if (!this.pending.drafts.size && this.pending.reflection === null) { await this.queue.catch(() => {}); return; }
    const captured: Pending = { drafts: new Map(this.pending.drafts), reflection: this.pending.reflection };
    await this.transact(run => {
      for (const [aid, draft] of captured.drafts) {
        const a = this.config.assessments.find(a => a.id === aid)!;
        if (currentStage(a, run.sessions[aid])?.id === draft.stageId) run.sessions[aid].draft = draft;
      }
      if (captured.reflection !== null && batteryComplete(this.config, run) && !run.reflection.submittedAt) run.reflection.draft = captured.reflection;
      return run;
    });
    for (const [aid, draft] of captured.drafts) if (this.pending.drafts.get(aid) === draft) this.pending.drafts.delete(aid);
    if (this.pending.reflection === captured.reflection) this.pending.reflection = null;
    this.emit({ saveStatus: this.pending.drafts.size || this.pending.reflection !== null ? 'Saving…' : 'Saved' });
  };
  async begin(aid: string) {
    await this.flush();
    await this.transact(run => {
      if (!assessmentAvailable(this.config, run, aid)) throw new Error('Complete the preceding cases before continuing.');
      if (!run.sessions[aid].startedAt) {
        const a = this.config.assessments.find(a => a.id === aid)!;
        run.sessions[aid].startedAt = new Date().toISOString(); run.sessions[aid].draft = emptyDraft(a, a.stages[0].id);
      }
      return run;
    });
  }
  async submit(aid: string, sid: string, draft: Draft) {
    clearTimeout(this.timer); await this.flush();
    await this.transact(run => submitStage(this.config, run, aid, sid, draft));
  }
  async continueAfterBreak() {
    await this.flush(); await this.transact(run => {
      if (!intermissionDue(this.config, run)) throw new Error('Complete the preceding episode and its review before continuing.');
      run.intermission.continuedAt = new Date().toISOString(); return run;
    });
  }
  async submitReflection() {
    await this.flush(); await this.transact(run => {
      if (!batteryComplete(this.config, run)) throw new Error('Complete every episode and review first.');
      if (wordCount(run.reflection.draft) > this.config.finalReview.reflection.maxWords!) throw new Error('Keep your reflection within the maximum word limit.');
      if (!run.reflection.submittedAt) {
        run.reflection.submitted = run.reflection.draft; run.reflection.submittedAt = new Date().toISOString();
      }
      return run;
    });
  }
  async reset() {
    const previousRunId = this.view.run.runId;
    clearTimeout(this.timer); this.pending = emptyPending();
    await this.transact(() => createRun(this.config, this.mode), true);
    for (const a of this.config.assessments) this.storage.removeItem(`${this.key}:draft:${previousRunId}:${a.id}`);
    this.storage.removeItem(`${this.key}:reflection:${previousRunId}`);
  }
  sync = () => {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === this.raw) return;
      const run = raw ? parseRun(raw, this.config, this.mode) : createRun(this.config, this.mode);
      if (run.runId !== this.view.run.runId) { clearTimeout(this.timer); this.pending = emptyPending(); }
      this.overlay(run);
      this.emit({ run, error: null, fatal: false, saveStatus: this.pending.drafts.size || this.pending.reflection !== null ? 'Saving…' : 'Saved' });
      this.raw = raw;
    } catch { this.emit({ fatal: true, error: 'Saved progress changed but could not be read safely.', saveStatus: 'Not saved' }); }
  };
  exportSession() { return structuredClone(this.view.run); }
  recoveryData() { return this.storage.getItem(this.key) || ''; }
}
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
