import { useState } from 'react';
import styles from './Input.module.css';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Input = ({
  label,
  error,
  hint,
  id,
  type = 'text',
  className = '',
  required,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={[styles.group, className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={styles.inputWrap}>
        <input
          id={inputId}
          type={resolvedType}
          className={[styles.input, error ? styles.inputError : '', isPassword ? styles.inputPadded : ''].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
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
