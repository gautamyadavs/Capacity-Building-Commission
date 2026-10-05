import { z } from "zod";
import {
  emptyReviewBundle,
  mergeReviews,
  parseReviewBundle,
  parseRun,
  validateReviewRecord,
  type Judgement,
  type ReviewBundle,
  type ReviewRecord,
  type Run,
} from "./model";
const DraftJudgement = z.strictObject({
  judgement: z
    .enum([
      "Developing",
      "Emerging",
      "Proficient",
      "Insufficient evidence",
      "Not elicited",
    ])
    .nullable(),
  reviewStatus: z.enum(["Reviewed", "Uncertain"]),
  evidence: z.array(
    z.strictObject({
      phaseId: z.string(),
      promptId: z.string(),
      location: z.string(),
      excerpt: z.string(),
    }),
  ),
  rationale: z.string(),
  strengthOrGap: z.string(),
  nextOpportunity: z.string(),
  competingInterpretations: z.string(),
});
const ReviewDraftSchema = z.strictObject({
  caseId: z.string(),
  criterionId: z.string(),
  reviewer: z.string(),
  primary: DraftJudgement,
  comparisonEvidence: z.array(
    z.strictObject({
      phaseId: z.string(),
      promptId: z.string(),
      location: z.string(),
      excerpt: z.string(),
    }),
  ),
  supplementary: z.array(DraftJudgement),
  supersedes: z.string().nullable(),
});
export type ReviewDraft = z.infer<typeof ReviewDraftSchema>;
export function emptyJudgement(phaseId: string, promptId: string): Judgement {
  return {
    judgement: null,
    reviewStatus: "Reviewed",
    evidence: [{ phaseId, promptId, location: "", excerpt: "" }],
    rationale: "",
    strengthOrGap: "",
    nextOpportunity: "",
    competingInterpretations: "",
  };
}
type View = {
  run: Run | null;
  bundle: ReviewBundle | null;
  draft: ReviewDraft | null;
  error: string | null;
  status: string;
  loading: boolean;
};
export class ReviewerStore {
  readonly key: string;
  private view: View = {
    run: null,
    bundle: null,
    draft: null,
    error: null,
    status: "No session imported",
    loading: true,
  };
  private raw: string | null = null;
  private listeners = new Set<() => void>();
  constructor(
    private storage: Storage = localStorage,
    base = import.meta.env.BASE_URL,
  ) {
    this.key = `bharat-kalp:${base}:v3:reviewer`;
  }
  getSnapshot = () => this.view;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit(next: Partial<View>) {
    this.view = { ...this.view, ...next };
    this.listeners.forEach((fn) => fn());
  }
  async load() {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) {
        this.raw = null;
        this.emit({ loading: false });
        return;
      }
      const data = z
        .strictObject({
          run: z.unknown(),
          bundle: z.unknown(),
          draft: ReviewDraftSchema.nullable(),
        })
        .parse(JSON.parse(raw));
      const run = parseRun(JSON.stringify(data.run)),
        bundle = await parseReviewBundle(JSON.stringify(data.bundle), run);
      if (data.draft) {
        const a = run.config.cases.find((a) => a.id === data.draft!.caseId);
        const c = run.config.criteria.find(
          (c) => c.id === data.draft!.criterionId,
        );
        if (!a || !c || !c.id.startsWith(a.set))
          throw new Error("Invalid reviewer draft target.");
      }
      this.raw = raw;
      this.emit({
        run,
        bundle,
        draft: data.draft,
        loading: false,
        error: null,
        status: "Saved",
      });
    } catch (error) {
      this.emit({
        loading: false,
        error: `Reviewer workspace needs recovery. ${error instanceof Error ? error.message : ""}`,
        status: "Not saved",
      });
    }
  }
  private persist(
    next: Pick<View, "run" | "bundle" | "draft">,
    allowReplace = false,
  ) {
    const raw = this.storage.getItem(this.key);
    if (!allowReplace && raw !== this.raw)
      throw new Error(
        "Reviewer workspace changed in another tab. Download your unsaved draft, then reload the latest workspace.",
      );
    if (allowReplace && raw)
      this.storage.setItem(`${this.key}:archive:${Date.now()}`, raw);
    const value = JSON.stringify(next);
    this.storage.setItem(this.key, value);
    this.raw = value;
    this.emit({ ...next, error: null, status: "Saved" });
  }
  reportError(error: unknown) {
    this.emit({
      error:
        error instanceof Error
          ? error.message
          : "Reviewer data could not be saved.",
      status: "Not saved",
    });
  }
  async importSession(raw: string) {
    try {
      const run = parseRun(raw),
        bundle = await emptyReviewBundle(run);
      this.persist({ run, bundle, draft: null }, true);
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }
  edit(draft: ReviewDraft) {
    const safe = ReviewDraftSchema.parse(draft);
    const previous = this.view.draft;
    const changedTarget =
      previous &&
      (previous.caseId !== safe.caseId ||
        previous.criterionId !== safe.criterionId ||
        previous.supersedes !== safe.supersedes);
    if (changedTarget) {
      try {
        this.storage.setItem(
          `${this.key}:draft-archive:${Date.now()}`,
          JSON.stringify(this.workspaceData()),
        );
      } catch (error) {
        this.reportError(error);
        return;
      }
    }
    this.emit({ draft: safe, status: "Saving…" });
    try {
      this.persist({
        run: this.view.run,
        bundle: this.view.bundle,
        draft: safe,
      });
      if (changedTarget)
        this.emit({
          status: "Saved · Earlier review draft preserved in recovery",
        });
    } catch (error) {
      this.reportError(error);
    }
  }
  workspaceData() {
    return {
      run: this.view.run,
      bundle: this.view.bundle,
      draft: this.view.draft,
    };
  }
  async restoreWorkspace(raw: string) {
    try {
      const data = z
        .strictObject({
          run: z.unknown(),
          bundle: z.unknown(),
          draft: ReviewDraftSchema.nullable(),
        })
        .parse(JSON.parse(raw));
      const run = parseRun(JSON.stringify(data.run));
      const bundle = await parseReviewBundle(JSON.stringify(data.bundle), run);
      if (data.draft) {
        const a = run.config.cases.find((a) => a.id === data.draft!.caseId),
          c = run.config.criteria.find((c) => c.id === data.draft!.criterionId);
        if (!a || !c || !c.id.startsWith(a.set))
          throw new Error("Invalid reviewer draft target.");
      }
      this.persist({ run, bundle, draft: data.draft }, true);
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }
  async save() {
    const { run, bundle, draft } = this.view;
    if (!run || !bundle || !draft)
      throw new Error("Import an ended session and select a criterion.");
    try {
      const record: ReviewRecord = {
        ...structuredClone(draft),
        id: crypto.randomUUID(),
        reviewedAt: new Date().toISOString(),
        packageVersion: run.config.packageVersion,
        taskVersion: run.config.taskVersion,
        rubricVersion: run.config.rubricVersion,
      };
      validateReviewRecord(record, run);
      const next = { ...bundle, records: [...bundle.records, record] };
      await parseReviewBundle(JSON.stringify(next), run);
      this.persist({ run, bundle: next, draft: null });
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }
  async importReviews(raw: string) {
    const { run, bundle } = this.view;
    if (!run || !bundle)
      throw new Error("Import the corresponding ended session first.");
    try {
      const incoming = await parseReviewBundle(raw, run),
        next = {
          ...bundle,
          records: mergeReviews(bundle.records, incoming.records),
        };
      await parseReviewBundle(JSON.stringify(next), run);
      this.persist({ run, bundle: next, draft: this.view.draft });
    } catch (error) {
      this.reportError(error);
      throw error;
    }
  }
  recoveryData() {
    const entries: Record<string, string> = {};
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.key)) entries[key] = this.storage.getItem(key)!;
    }
    return { stored: entries, unsavedDraft: this.view.draft };
  }
}
