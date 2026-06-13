import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import styles from './SessionExpiredModal.module.css';

/**
 * SessionExpiredModal — rendered by App when the session expires.
 * The user sees a friendly prompt rather than a jarring redirect.
 */
const SessionExpiredModal = ({ onDismiss }) => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogin = () => {
    logout();
    onDismiss();
    navigate('/login');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="session-title">
        <div className={styles.icon}>⏱️</div>
        <h2 id="session-title" className={styles.title}>Session expired</h2>
        <p className={styles.message}>
          Your session has timed out for security. Sign in again to continue —
          you won't lose any work.
        </p>
        <button className={styles.btn} onClick={handleLogin} autoFocus>
          Sign in again
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
