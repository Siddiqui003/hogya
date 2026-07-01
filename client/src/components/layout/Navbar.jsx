import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import useTheme from '../../hooks/useTheme';
import { Avatar } from '../common/UI';
import styles from './Navbar.module.css';

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const Navbar = () => {
  const { user, logout, isAdmin } = useAuthStore();
  const connected = useSocketStore((s) => s.connected);
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/join" className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>TaskFlow</span>
        </Link>

        {/* Right section */}
        <div className={styles.right}>
          {/* Socket status */}
          <span
            className={[styles.dot, connected ? styles.dotOnline : styles.dotOffline].join(' ')}
            title={connected ? 'Real-time connected' : 'Connecting…'}
          />

          {/* Admin link */}
          {isAdmin() && (
            <Link to="/admin" className={styles.adminLink}>Admin</Link>
          )}

          {/* Theme toggle */}
          <button
            className={styles.iconBtn}
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User dropdown */}
          <div className={styles.userMenuWrap} ref={menuRef}>
            <button
              className={styles.userMenuTrigger}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <Avatar name={user?.displayName || user?.username} size="sm" />
              <div className={styles.userInfo}>
                <span className={styles.displayName}>{user?.displayName || user?.username}</span>
                {isAdmin() && <span className={styles.roleTag}>Admin</span>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {menuOpen && (
              <div className={styles.dropdown}>
                <Link
                  to="/change-password"
                  className={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  🔑 Change password
                </Link>
                <div className={styles.dropdownDivider} />
                <button className={[styles.dropdownItem, styles.dropdownDanger].join(' ')}
                  onClick={handleLogout}>
                  ↪ Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
