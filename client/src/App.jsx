import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useAuthInit from './hooks/useAuthInit';
import { useSocket } from './hooks/useSocket';
import ErrorBoundary from './components/common/ErrorBoundary';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import { PageLoader } from './components/common/UI';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import RoomPage         from './pages/RoomPage';
import AdminPage        from './pages/AdminPage';
import NotFoundPage     from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// ── Socket initialiser ────────────────────────────────────────────────────────
// Rendered once inside BrowserRouter so useNavigate is available to the hook.
const SocketInitialiser = () => { useSocket(); return null; };

// ── Route guards ──────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin())         return <Navigate to="/unauthorized" replace />;
  return children;
};

// Redirect already-authenticated users away from login/register
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
};

// ── App shell — handles init + session expiry ─────────────────────────────────
function AppShell() {
  const { initialising } = useAuthInit();
  const [sessionExpired, setSessionExpired] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Listen for 401s from the Axios interceptor
  useEffect(() => {
    const handler = () => {
      if (isAuthenticated) setSessionExpired(true);
    };
    window.addEventListener('tf:session-expired', handler);
    return () => window.removeEventListener('tf:session-expired', handler);
  }, [isAuthenticated]);

  // Blank full-page spinner while we verify the stored token
  if (initialising) return <PageLoader />;

  return (
    <>
      <SocketInitialiser />

      {sessionExpired && (
        <SessionExpiredModal onDismiss={() => setSessionExpired(false)} />
      )}

      <Routes>
        {/* Public (redirect to dashboard if already logged in) */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/rooms/:id" element={<PrivateRoute><RoomPage /></PrivateRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404"          element={<NotFoundPage />} />
        <Route path="*"             element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
