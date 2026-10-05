import type { ReactNode, MouseEvent } from "react";
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
      <AppLink to="/learner">Return to diagnostic home</AppLink>
    </section>
  );
}
export function CaseFacts({ phase }: { phase: Phase }) {
  return (
    <section
      className={styles.briefing}
      aria-label={`${phase.title} case information`}
    >
      <h2>
        {phase.kind === "initial" ? "Case information" : "New information"}
      </h2>
      <Paragraphs lines={phase.facts} />
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
          · {snapshot.phaseVersion}
        </p>
        {phase.prompts.map((p) => (
          <section className={styles.answer} key={p.id}>
            <h3>
              {p.id} · {p.label}
            </h3>
            <p>{p.text}</p>
            <p>
              {snapshot.answers[p.id] ||
                "Blank response submitted. No performance level is inferred."}
            </p>
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
