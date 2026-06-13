import useToastStore from '../../store/toastStore';
import styles from './ToastContainer.module.css';

const ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '❌',
};

const ToastContainer = () => {
  const { toasts, remove } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className={styles.container} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[styles.toast, styles[toast.variant]].join(' ')}
          onClick={() => remove(toast.id)}
        >
          <span className={styles.icon}>{ICONS[toast.variant] || ICONS.info}</span>
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.close}
            onClick={(e) => { e.stopPropagation(); remove(toast.id); }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
