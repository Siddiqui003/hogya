import { useNavigate } from 'react-router-dom';
import styles from './NotFoundPage.module.css'; // reuse same layout styles

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.code} style={{ fontSize: '4rem' }}>🔒</div>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.message}>
          You don't have permission to view this page. Admin access is required.
        </p>
        <button className={styles.btn} onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
