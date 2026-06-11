import styles from './UI.module.css';

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'default', size = 'md' }) => (
  <span className={[styles.badge, styles[`badge_${variant}`], styles[`badge_${size}`]].join(' ')}>
    {children}
  </span>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => (
  <span
    className={[styles.spinner, styles[`spinner_${size}`], className].join(' ')}
    role="status"
    aria-label="Loading"
  />
);

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '', onClick, hoverable = false }) => (
  <div
    className={[styles.card, hoverable ? styles.cardHoverable : '', className].join(' ')}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
  >
    {children}
  </div>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444'
];
const getColor = (name = '') =>
  COLORS[name.charCodeAt(0) % COLORS.length];

export const Avatar = ({ name = '?', size = 'md', online = false }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={[styles.avatar, styles[`avatar_${size}`]].join(' ')}
      style={{ background: getColor(name) }}
      aria-label={name}
      title={name}
    >
      {initials}
      {online && <span className={styles.onlineDot} />}
    </span>
  );
};

// ── Alert ─────────────────────────────────────────────────────────────────────
export const Alert = ({ children, variant = 'info', onClose }) => (
  <div className={[styles.alert, styles[`alert_${variant}`]].join(' ')} role="alert">
    <span className={styles.alertText}>{children}</span>
    {onClose && (
      <button className={styles.alertClose} onClick={onClose} aria-label="Dismiss">✕</button>
    )}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className={styles.empty}>
    <span className={styles.emptyIcon}>{icon}</span>
    <h3 className={styles.emptyTitle}>{title}</h3>
    {description && <p className={styles.emptyDesc}>{description}</p>}
    {action && <div className={styles.emptyAction}>{action}</div>}
  </div>
);

// ── PageLoader ────────────────────────────────────────────────────────────────
export const PageLoader = () => (
  <div className={styles.pageLoader}>
    <Spinner size="lg" />
  </div>
);
