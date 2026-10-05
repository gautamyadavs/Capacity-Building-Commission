import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../context";
import type { Case, Phase, Snapshot } from "../model";
import styles from "../app.module.css";
export function AppLink({
  to,
  children,
  className,
  ...props
}: {
  to: string;
  children: ReactNode;
  className?: string;
  "aria-current"?: "page" | "step";
}) {
  const { store } = useSession(),
    navigate = useNavigate();
  const click = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    try {
      await store.flush();
      navigate(to);
    } catch {}
  };
  return (
    <Link to={to} className={className} onClick={click} {...props}>
      {children}
    </Link>
  );
}
export function Paragraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <section role="alert" className={styles.gate}>
      <h1>Unable to open this view</h1>
      <p>{message}</p>
      <AppLink to="/learner">Return to all cases</AppLink>
    </section>
  );
}
export function CaseFacts({ phase }: { phase: Phase }) {
  const heading =
    phase.kind === "initial" ? "Case information" : "New information";
  return (
    <section
      className={styles.briefing}
      aria-label={`${phase.title} case information`}
    >
      <h2>{heading}</h2>
      {phase.briefingBlocks ? (
        phase.briefingBlocks.map((block, i) =>
          block.type === "paragraph" ? (
            <div key={i}>
              {block.heading && block.heading !== heading && (
                <h3>{block.heading}</h3>
              )}
              <p>{block.text}</p>
            </div>
          ) : (
            <div key={i} className={styles.factTable}>
              <table>
                <caption>{block.caption}</caption>
                <thead>
                  <tr>
                    {block.columns.map((col) => (
                      <th key={col} scope="col">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) =>
                        k === 0 ? (
                          <th key={k} scope="row">
                            {cell}
                          </th>
                        ) : (
                          <td key={k}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {block.notes.map((note, j) => (
                <p key={j} className={styles.tableNote}>
                  {note}
                </p>
              ))}
            </div>
          ),
        )
      ) : (
        <Paragraphs lines={phase.facts} />
      )}
    </section>
  );
}
export function SubmittedResponsePanel({
  phase,
  snapshot,
  expanded = false,
}: {
  phase: Phase;
  snapshot: Snapshot;
  expanded?: boolean;
}) {
  return (
    <details className={styles.submitted} open={expanded}>
      <summary>{phase.title} · Submitted and preserved</summary>
      <div className={styles.submittedBody}>
        <p className={styles.timestamp}>
          Submitted{" "}
          <time dateTime={snapshot.submittedAt}>
            {new Date(snapshot.submittedAt).toLocaleString()}
          </time>{" "}
        </p>
        {phase.prompts.map((p) => (
          <section className={styles.answer} key={p.id}>
            <h3>{p.label}</h3>
            <p>{p.text}</p>
            <p>{snapshot.answers[p.id] || "No response submitted."}</p>
          </section>
        ))}
      </div>
    </details>
  );
}
export function StageProgress({ a, current }: { a: Case; current: string }) {
  const { run } = useSession();
  const s = run.sessions[a.id];
  return (
    <nav aria-label="Case phases" className={styles.stageProgress}>
      <ol>
        {a.phases.map((p, i) => {
          const submitted = !!s.submitted[p.id],
            available = !!s.revealedAt[p.id];
          return (
            <li key={p.id} data-active={p.id === current}>
              <span className={styles.stepNumber}>{i + 1}</span>
              {available ? (
                <AppLink
                  to={`/learner/assessment/${a.id}/stage/${p.id}`}
                  aria-current={p.id === current ? "step" : undefined}
                >
                  {p.title} ·{" "}
                  {submitted
                    ? "Submitted"
                    : run.end
                      ? "Unsubmitted"
                      : "Current phase"}
                </AppLink>
              ) : (
                <span>{p.title} · Not yet available</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CaseReference({ a, phase }: { a: Case; phase: Phase }) {
  const { run } = useSession();
  const [view, setView] = useState("new");
  return (
    <div>
      {phase.kind === "update" && (
        <div
          className={styles.referenceControls}
          role="group"
          aria-label="Case reference sections"
        >
          {[
            ["new", "New information"],
            ["initial", "Initial facts"],
            ["submitted", "Submitted response"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {view === "submitted" && phase.kind === "update" ? (
        <SubmittedResponsePanel
          phase={a.phases[0]}
          snapshot={run.sessions[a.id].submitted[a.phases[0].id]}
          expanded
        />
      ) : (
        <CaseFacts
          phase={
            view === "initial" && phase.kind === "update" ? a.phases[0] : phase
          }
        />
      )}
    </div>
  );
}
export function ReferenceDialog({
  a,
  phase,
  close,
}: {
  a: Case;
  phase: Phase;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const position = { x: window.scrollX, y: window.scrollY };
    ref.current?.showModal();
    return () => {
      previous?.focus({ preventScroll: true });
      window.scrollTo(position.x, position.y);
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${styles.referenceDialog}`}
      aria-label="Case information reference"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className={styles.referenceDialogHeader}>
        <h2>Case reference</h2>
        <button type="button" autoFocus onClick={close}>
          Close case information
        </button>
      </div>
      <CaseReference a={a} phase={phase} />
    </dialog>
  );
}
