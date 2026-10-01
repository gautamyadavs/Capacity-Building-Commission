import { DraftSchema, assessmentComplete, createRun, currentStage, debriefEligible, emptyDraft, parseRun, submitStage, type Answers, type Config, type Draft, type FormatId, type Mode, type Run } from './model';

export type StoreView = { run: Run; saveStatus: 'Saved' | 'Saving…' | 'Not saved'; error: string | null; fatal: boolean };
type Pending = { drafts: Map<string, Draft>; reflections: Map<FormatId, Answers> };
export class RunStore {
  readonly key: string;
  private view: StoreView;
  private listeners = new Set<() => void>();
  private pending: Pending = { drafts: new Map(), reflections: new Map() };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private raw: string | null = null;
  constructor(readonly config: Config, readonly mode: Mode, private storage: Storage = localStorage, base = import.meta.env.BASE_URL) {
    this.key = `bharat-kalp:${base}:v1:${mode}`;
    const run = createRun(config, mode);
    this.view = { run, saveStatus: 'Saved', error: null, fatal: false };
    try {
      this.raw = storage.getItem(this.key);
      if (this.raw) this.view.run = parseRun(this.raw, config, mode);
      // A small synchronous draft journal survives immediate refresh/tab close.
      // Journals are scoped to the run and can never overwrite a submission.
      for (const a of config.assessments) {
        const session = this.view.run.sessions[a.id]; const stage = currentStage(a, session);
        const journal = storage.getItem(`${this.key}:draft:${this.view.run.runId}:${a.id}`);
        if (stage && journal) {
          const draft = DraftSchema.parse(JSON.parse(journal));
          if (draft.stageId === stage.id && draft.updatedAt >= (session.draft?.updatedAt || '') && draft.cardOrder.length === config.cards.length && new Set(draft.cardOrder).size === config.cards.length && draft.cardOrder.every(id => config.cards.some(c => c.id === id))) session.draft = draft;
        }
      }
      for (const fid of ['A','B'] as const) {
        const journal=storage.getItem(`${this.key}:reflection:${this.view.run.runId}:${fid}`);
        if(journal && debriefEligible(config,this.view.run,fid)) {
          const answers:unknown=JSON.parse(journal);
          if(answers && typeof answers==='object' && !Array.isArray(answers) && Object.values(answers).every(v=>typeof v==='string')) this.view.run.reflections[fid].answers=answers as Answers;
        }
      }
    }
    catch { this.view = { ...this.view, fatal: true, error: 'Saved progress could not be read safely. Your stored data has not been changed.', saveStatus: 'Not saved' }; }
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(next: Partial<StoreView>) { this.view = { ...this.view, ...next }; this.listeners.forEach(fn => fn()); }
  private schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, 500); }
  edit(aid: string, draft: Draft) {
    const a = this.config.assessments.find(a => a.id === aid)!;
    if (this.view.fatal || currentStage(a, this.view.run.sessions[aid])?.id !== draft.stageId) return;
    const copy = structuredClone(draft);
    copy.updatedAt = new Date().toISOString();
    this.pending.drafts.set(aid, copy);
    const run = structuredClone(this.view.run); run.sessions[aid].draft = copy;
    this.emit({ run, saveStatus: 'Saving…', error: null });
    try { this.storage.setItem(`${this.key}:draft:${run.runId}:${aid}`,JSON.stringify(copy)); }
    catch { this.emit({error:'Your latest edit could not be saved. Keep this page open and retry.',saveStatus:'Not saved'}); }
    this.schedule();
  }
  reflect(fid: FormatId, answers: Answers) {
    if (this.view.fatal || !debriefEligible(this.config, this.view.run, fid)) return;
    this.pending.reflections.set(fid, { ...answers });
    const run = structuredClone(this.view.run); run.reflections[fid].answers = { ...answers };
    this.emit({ run, saveStatus: 'Saving…' });
    try {this.storage.setItem(`${this.key}:reflection:${run.runId}:${fid}`,JSON.stringify(answers));}
    catch {this.emit({error:'Your reflection could not be saved. Keep this page open and retry.',saveStatus:'Not saved'});}
    this.schedule();
  }
  private transact(change: (run: Run) => Run, allowReset = false): Promise<void> {
    const expectedRunId = this.view.run.runId;
    const task = this.queue.catch(() => {}).then(async () => {
      const work = () => {
        if (this.view.fatal && !allowReset) throw new Error('Saved progress needs recovery.');
        const raw = this.storage.getItem(this.key);
        const latest = allowReset ? this.view.run : raw ? parseRun(raw, this.config, this.mode) : this.view.run;
        if (!allowReset && latest.runId !== expectedRunId) {
          this.pending = { drafts: new Map(), reflections: new Map() }; this.emit({ run: latest });
          throw new Error('This demo was reset in another tab. The new session has been restored.');
        }
        const next = change(structuredClone(latest));
        this.storage.setItem(this.key, JSON.stringify(next));
        this.raw = JSON.stringify(next);
        // Keep edits made while an asynchronous save was waiting for its lock.
        for (const [aid,draft] of this.pending.drafts) {
          const a = this.config.assessments.find(a => a.id === aid)!;
          if (currentStage(a,next.sessions[aid])?.id === draft.stageId) next.sessions[aid].draft = structuredClone(draft);
          else this.pending.drafts.delete(aid);
        }
        for (const [fid,answers] of this.pending.reflections) if (debriefEligible(this.config,next,fid)) next.reflections[fid].answers = {...answers};
        this.emit({ run: next, fatal: false, error: null, saveStatus: this.pending.drafts.size || this.pending.reflections.size ? 'Saving…' : 'Saved' });
      };
      if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(this.key, work);
      else work();
    }).catch(error => {
      this.emit({ error: error instanceof Error ? error.message : 'Progress could not be saved.', saveStatus: 'Not saved' });
      throw error;
    });
    this.queue = task;
    return task;
  }
  flush = async () => {
    clearTimeout(this.timer);
    if (!this.pending.drafts.size && !this.pending.reflections.size) { await this.queue.catch(() => {}); return; }
    // Retain in-flight edits in the overlay until their own write completes.
    // Otherwise an earlier queued save can briefly replace a newer draft.
    const captured: Pending = { drafts: new Map(this.pending.drafts), reflections: new Map(this.pending.reflections) };
    await this.transact(run => {
        for (const [aid,draft] of captured.drafts) {
          const a = this.config.assessments.find(a => a.id === aid)!;
          if (currentStage(a,run.sessions[aid])?.id === draft.stageId) run.sessions[aid].draft = draft;
        }
        for (const [fid,answers] of captured.reflections) if (debriefEligible(this.config,run,fid)) run.reflections[fid].answers = answers;
        return run;
    });
    for (const [aid,draft] of captured.drafts) if (this.pending.drafts.get(aid) === draft) this.pending.drafts.delete(aid);
    for (const [fid,answers] of captured.reflections) if (this.pending.reflections.get(fid) === answers) this.pending.reflections.delete(fid);
    this.emit({ saveStatus: this.pending.drafts.size || this.pending.reflections.size ? 'Saving…' : 'Saved' });
  };
  async begin(aid: string) {
    await this.flush();
    await this.transact(run => {
      if (!run.sessions[aid].startedAt) {
        const a = this.config.assessments.find(a => a.id === aid)!;
        run.sessions[aid].startedAt = new Date().toISOString(); run.sessions[aid].draft = emptyDraft(this.config,a.stages[0].id);
      }
      return run;
    });
  }
  async submit(aid: string, sid: string, draft: Draft) {
    clearTimeout(this.timer); await this.flush();
    await this.transact(run => submitStage(this.config,run,aid,sid,draft));
  }
  async completeFormat(fid: FormatId) {
    await this.flush(); await this.transact(run => {
      if (!debriefEligible(this.config,run,fid)) throw new Error('Complete both assessments first.');
      run.reflections[fid].completedAt = new Date().toISOString(); return run;
    });
  }
  async reset() {
    const previousRunId=this.view.run.runId;
    clearTimeout(this.timer); this.pending = { drafts: new Map(), reflections: new Map() };
    await this.transact(() => createRun(this.config,this.mode),true);
    for (const a of this.config.assessments) this.storage.removeItem(`${this.key}:draft:${previousRunId}:${a.id}`);
    for (const fid of ['A','B']) this.storage.removeItem(`${this.key}:reflection:${previousRunId}:${fid}`);
  }
  sync = () => {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === this.raw) return;
      if (!raw) { this.pending = { drafts: new Map(), reflections: new Map() }; this.emit({ run: createRun(this.config,this.mode), error: null, fatal: false }); }
      else {
        const run = parseRun(raw,this.config,this.mode);
        if (run.runId !== this.view.run.runId) { clearTimeout(this.timer); this.pending = { drafts: new Map(), reflections: new Map() }; }
        else for (const [aid,draft] of this.pending.drafts) {
          const a = this.config.assessments.find(a => a.id === aid)!;
          if (currentStage(a,run.sessions[aid])?.id === draft.stageId) run.sessions[aid].draft = draft;
          else this.pending.drafts.delete(aid);
        }
        for (const [fid,answers] of this.pending.reflections) if (debriefEligible(this.config,run,fid)) run.reflections[fid].answers = {...answers};
        this.emit({ run, error: null, fatal: false });
      }
      this.raw = raw;
    } catch { this.emit({ fatal: true, error: 'Saved progress changed but could not be read safely.', saveStatus: 'Not saved' }); }
  };
  exportSession(aid?: string) {
    const run = this.view.run;
    return { schemaVersion: run.schemaVersion, contentVersion: run.contentVersion, source: this.config.source,
      runId: run.runId, demoParticipantId: run.demoParticipantId, mode: run.mode,
      assessments: this.config.assessments.filter(a => !aid || a.id === aid).map(a => ({ assessmentId:a.id, complete:assessmentComplete(a,run.sessions[a.id]), submittedAnswers:run.sessions[a.id].submitted })),
      developmentalReflections: run.reflections };
  }
  recoveryData() { return this.storage.getItem(this.key) || ''; }
}
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], { type:'application/json' }));
  const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
