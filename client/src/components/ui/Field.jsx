import { useId } from 'react';

/**
 * Label + control + hint/error wired with ids for screen readers.
 * `children` can be a render function receiving the a11y props.
 */
export function Field({ label, hint, error, children, id: givenId }) {
  const autoId = useId();
  const id = givenId || autoId;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control =
    typeof children === 'function' ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }) : children;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {control}
      {error ? (
        <span id={`${id}-err`} className="error-text">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
