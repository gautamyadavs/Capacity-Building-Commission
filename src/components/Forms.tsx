import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Prompt } from "../model";
import styles from "../app.module.css";
export function ResponseField({
  prompt,
  value,
  onChange,
  disabled = false,
}: {
  prompt: Prompt;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const uid = useId(),
    id = `${uid}-${prompt.id}`;
  return (
    <div className={styles.field} data-field-id={prompt.id}>
      <label htmlFor={id}>
        {prompt.id} · {prompt.label}
      </label>
      <p id={`${id}-help`} className={styles.help}>
        {prompt.text}
      </p>
      <textarea
        id={id}
        aria-describedby={`${id}-help`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={6}
      />
    </div>
  );
}
export function Modal({
  title,
  children,
  cancel,
  confirm,
  confirmLabel,
  busy,
  error,
}: {
  title: string;
  children: ReactNode;
  cancel: () => void;
  confirm: () => void;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId(),
    bodyId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) cancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={bodyId}>{children}</div>
      {error && (
        <p role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          autoFocus
          onClick={cancel}
          disabled={busy}
          className={styles.secondary}
        >
          Cancel
        </button>
        <button onClick={confirm} disabled={busy} className={styles.primary}>
          {busy ? "Saving…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
