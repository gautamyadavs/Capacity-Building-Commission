import { useId, useState } from "react";
import { useSession } from "../context";
import { downloadJson } from "../persistence";
import { Modal } from "./Forms";
import { AppLink } from "./Shared";
import { resumePath } from "../model";
import styles from "../app.module.css";
export function FileInput({
  label,
  onFile,
}: {
  label: string;
  onFile: (raw: string) => Promise<boolean | void>;
}) {
  const id = useId(),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  return (
    <div className={styles.fileInput}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept=".json,application/json"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0],
            input = e.target;
          if (!file) return;
          setBusy(true);
          setError(null);
          setSuccess(false);
          try {
            const completed = await onFile(await file.text());
            setSuccess(completed !== false);
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Unable to read file.",
            );
          } finally {
            setBusy(false);
            input.value = "";
          }
        }}
      />
      {busy && <p role="status">Reading and verifying file…</p>}
      {success && <p role="status">File imported.</p>}
      {error && (
        <p role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
export function Files() {
  const { run, store, latestConfig, fatal, reviews } = useSession();
  const [newSession, setNew] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<string | null>(null),
    [notes, setNotes] = useState(run.supportNotes),
    [supportSaved, setSupportSaved] = useState(false);
  return (
    <section className={styles.workspace}>
      <h1 className={styles.debriefTitle}>Recovery and files</h1>
      <p className={styles.eyebrow}>FACILITATOR TOOLS</p>
      <p>
        Sessions and review records stay in this browser unless you export and
        share them. Clearing browser data removes local progress. Keep an
        exported copy for transfer or recovery.
      </p>
      <div className={styles.actions}>
        {!fatal && (
          <AppLink className={styles.primary} to={resumePath(run)}>
            {run.end
              ? "Show learner submissions and feedback"
              : "Return to learner assessment"}
          </AppLink>
        )}
        <AppLink className={styles.secondary} to="/reviewer">
          Reviewer workspace
        </AppLink>
      </div>
      {!fatal && run.end && (
        <section className={styles.recoverySection}>
          <h2>Review and feedback</h2>
          <button
            className={styles.primary}
            onClick={() =>
              downloadJson(
                store.exportSession(),
                `kalp-session-${run.runId}.json`,
              )
            }
          >
            Export session for review
          </button>
          <FileInput
            label="Import human-review feedback"
            onFile={(raw) => store.importReviews(raw)}
          />
          {reviews && (
            <button
              className={styles.secondary}
              onClick={() =>
                downloadJson(reviews, `kalp-reviews-${run.runId}.json`)
              }
            >
              Export review records
            </button>
          )}
          <p>
            Import feedback in the participant's browser, then return to the
            learner view. Review files must match this ended session and its
            captured content.
          </p>
          <p>
            Actual case sequence:{" "}
            {run.actualSequence.join(" → ") || "No case started"}.{" "}
            {run.end.kind === "early" && `Reason: ${run.end.reason}`}
          </p>
          <details className={styles.references}>
            <summary>Incomplete opportunities</summary>
            {run.end.incomplete.map((m) => (
              <p key={`${m.caseId}/${m.phaseId}/${m.promptId}`}>
                {m.caseId} / {m.phaseId} / {m.promptId}: {m.opportunity}
              </p>
            ))}
          </details>
        </section>
      )}
      {!fatal && (
        <details className={styles.references}>
          <summary>Access or support notes</summary>
          <p>
            Record an accessibility adaptation or support condition that changes
            what the task elicits. Open-book or AI use needs no disclosure.
            Notes are locked when the session ends.
          </p>
          <label htmlFor="support-notes">Access or support condition</label>
          <textarea
            id="support-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSupportSaved(false);
            }}
            disabled={!!run.end}
          />
          {!run.end && (
            <button
              className={styles.secondary}
              onClick={async () => {
                try {
                  await store.support(notes);
                  setSupportSaved(true);
                } catch {}
              }}
            >
              Save support notes
            </button>
          )}
          {supportSaved && <p role="status">Support notes saved.</p>}
        </details>
      )}
      <details className={styles.references}>
        <summary>Session design and source information</summary>
        <p>
          {run.config.packageVersion} · {run.config.frameworkVersion} · Task{" "}
          {run.config.taskVersion} · Rubric {run.config.rubricVersion}
        </p>
        <p>
          Current release: {latestConfig.packageVersion}. Captured sessions
          retain their original content and progression.
        </p>
        <ul>
          {run.config.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url}>{source.title}</a>
            </li>
          ))}
        </ul>
      </details>
      <section className={styles.recoverySection}>
        <h2>Back up</h2>
        <p>
          Download your responses and drafts to keep a copy or move to another
          browser.
        </p>
        <button
          className={styles.primary}
          onClick={() =>
            downloadJson(
              store.exportSession(),
              `kalp-session-${run.runId}.json`,
            )
          }
        >
          Download current session and drafts
        </button>
      </section>
      <section className={styles.recoverySection}>
        <h2>Restore</h2>
        <p>
          Choose a saved session. After confirmation, your current session is
          archived before the saved one replaces it.
        </p>
        <FileInput
          label="Import a captured diagnostic session"
          onFile={async (raw) => {
            setPending(raw);
            return false;
          }}
        />
      </section>
      <section className={styles.recoverySection}>
        <h2>Start again</h2>
        <p>
          Start a new diagnostic with the current design. Your previous saved
          session is archived first.
        </p>
        <button className={styles.secondary} onClick={() => setNew(true)}>
          Start a new diagnostic
        </button>
      </section>
      <details className={styles.references} open={fatal || undefined}>
        <summary>Advanced recovery and storage help</summary>
        <p>
          If normal backup is unavailable, preserve all stored data for
          investigation. This download includes original storage values, earlier
          sessions and draft journals.
        </p>
        <button
          className={styles.secondary}
          onClick={() => {
            try {
              downloadJson(store.recoveryData(), "kalp-browser-recovery.json");
            } catch (error) {
              store.reportError(error);
            }
          }}
        >
          Download all preserved browser data
        </button>
        <p>
          Older v1/v2 pilot keys and journals remain raw recovery data. They are
          not imported as evidence for this diagnostic. Clearing browser data
          removes local progress.
        </p>
      </details>
      {newSession && (
        <Modal
          title="Start a new diagnostic?"
          cancel={() => setNew(false)}
          busy={busy}
          confirmLabel="Preserve previous and start new"
          confirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              if (fatal) await store.recoverNew(latestConfig);
              else await store.reset(latestConfig);
              setNew(false);
              window.location.hash = "/learner";
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            The existing stored record will be archived before a new run starts
            with the current design. Export any unsaved edits first if storage
            is unavailable.
          </p>
        </Modal>
      )}
      {pending && (
        <Modal
          title="Import this diagnostic session?"
          cancel={() => setPending(null)}
          busy={busy}
          confirmLabel="Archive current and import"
          confirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await store.importSession(pending);
              setPending(null);
              window.location.hash = "/learner";
            } catch (error) {
              store.reportError(error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            The current session is archived first. The imported session uses its
            captured tasks and rubrics.
          </p>
        </Modal>
      )}
    </section>
  );
}
