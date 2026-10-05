import { useId, useState } from "react";
import { useSession } from "../context";
import { downloadJson } from "../persistence";
import { Modal } from "./Forms";
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
  const { run, store, latestConfig, fatal } = useSession();
  const [newSession, setNew] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<string | null>(null);
  return (
    <section className={styles.workspace}>
      <h1 className={styles.debriefTitle}>Recovery and files</h1>
      <p>
        Sessions and review records stay in this browser unless you export and
        share them. Clearing browser data removes local progress. Keep an
        exported copy for transfer or recovery.
      </p>
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
