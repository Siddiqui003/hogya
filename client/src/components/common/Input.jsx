import styles from './Input.module.css';

const Input = ({
  label,
  error,
  hint,
  id,
  className = '',
  required,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={[styles.group, className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={[styles.input, error ? styles.inputError : ''].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className={styles.hint}>{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className={styles.error} role="alert">{error}</p>
      )}
    </div>
  );
};

export default Input;
