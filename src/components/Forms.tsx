import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Field } from '../model';
import { wordCount } from '../model';
import styles from '../app.module.css';

export function ResponseField({ field, value, onChange, error, disabled = false }: { field: Field; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
  const uid = useId();
  const id = `${uid}-${field.id}`;
  const count = wordCount(value);
  const over = !!field.maxWords && count > field.maxWords;
  const description = `${id}-help${field.maxWords ? ` ${id}-count` : ''}${error || over ? ` ${id}-error` : ''}`;
  return <div className={styles.field} data-field-id={field.id}>
    {field.type === 'choice' ? <fieldset disabled={disabled} aria-describedby={description} aria-invalid={!!error}>
      <legend>{field.label}{field.unscored && <span className={styles.optional}>Unscored</span>}</legend>
      <p id={`${id}-help`} className={styles.help}>{field.prompt}</p>
      <div className={styles.choices}>{field.options?.map(option => <label key={option.id} className={value === option.id ? styles.selectedChoice : styles.choice}>
        <input type="radio" name={id} value={option.id} required={field.required} checked={value === option.id} onChange={() => onChange(option.id)} />{option.label}
      </label>)}</div>
    </fieldset> : <>
      <div className={styles.fieldHeading}><label htmlFor={id}>{field.label}{!field.required && <span className={styles.optional}>Optional</span>}</label>
        {field.maxWords && <span id={`${id}-count`} role="status" aria-live="polite" aria-atomic="true" className={over ? styles.overLimit : styles.wordCount}>{count} / {field.maxWords} words · maximum</span>}</div>
      <p className={styles.help} id={`${id}-help`}>{field.prompt}</p>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={field.maxWords && field.maxWords > 150 ? 6 : 4}
        disabled={disabled} aria-required={field.required} aria-invalid={!!error || over} aria-describedby={description} spellCheck={false} />
    </>}
    {(error || over) && <p className={styles.fieldError} id={`${id}-error`}>{error || `Use ${field.maxWords} words or fewer. Your response has ${count} words.`}</p>}
  </div>;
}

export function Modal({ title, children, cancel, confirm, confirmLabel, busy, error }: { title: string; children: ReactNode; cancel: () => void; confirm: () => void; confirmLabel: string; busy?: boolean; error?: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby={titleId} aria-describedby={bodyId} onCancel={e => { e.preventDefault(); if (!busy) cancel(); }}>
    <div className={styles.modalSymbol} aria-hidden="true">↗</div>
    <h2 id={titleId}>{title}</h2><div id={bodyId}>{children}</div>
    {error && <p role="alert" className={styles.fieldError}>{error}</p>}
    <div className={styles.actions}><button autoFocus onClick={cancel} disabled={busy} className={styles.secondary}>Cancel</button><button onClick={confirm} disabled={busy} className={styles.primary}>{busy ? 'Saving…' : confirmLabel}</button></div>
  </dialog>;
}
