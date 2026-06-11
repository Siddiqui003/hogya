import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import { Avatar } from '../common/UI';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuthStore();
  const connected = useSocketStore((s) => s.connected);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/dashboard" className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>TaskFlow</span>
        </Link>

        {/* Right section */}
        <div className={styles.right}>
          {/* Socket status indicator */}
          <span
            className={[styles.dot, connected ? styles.dotOnline : styles.dotOffline].join(' ')}
            title={connected ? 'Real-time connected' : 'Connecting…'}
          />

          {/* Admin link */}
          {isAdmin() && (
            <Link to="/admin" className={styles.adminLink}>Admin</Link>
          )}

          {/* User menu */}
          <div className={styles.userMenu}>
            <Avatar name={user?.displayName || user?.username} size="sm" />
            <div className={styles.userInfo}>
              <span className={styles.displayName}>{user?.displayName || user?.username}</span>
              {isAdmin() && <span className={styles.roleTag}>Admin</span>}
            </div>
          </div>

          <button className={styles.logoutBtn} onClick={handleLogout} title="Log out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
