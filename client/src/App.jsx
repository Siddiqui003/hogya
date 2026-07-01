import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useAuthInit from './hooks/useAuthInit';
import { useSocket } from './hooks/useSocket';
import ErrorBoundary from './components/common/ErrorBoundary';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import ConnectionBanner from './components/common/ConnectionBanner';
import ToastContainer from './components/common/ToastContainer';
import { PageLoader } from './components/common/UI';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import JoinPage             from './pages/JoinPage';
import RoomPage             from './pages/RoomPage';
import AdminPage            from './pages/AdminPage';
import ChangePasswordPage   from './pages/ChangePasswordPage';
import NotFoundPage         from './pages/NotFoundPage';
import UnauthorizedPage     from './pages/UnauthorizedPage';

const SocketInitialiser = () => { useSocket(); return null; };

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

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <Navigate to="/join" replace /> : children;
};

function AppShell() {
  const { initialising } = useAuthInit();
  const [sessionExpired, setSessionExpired] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const handler = () => { if (isAuthenticated) setSessionExpired(true); };
    window.addEventListener('tf:session-expired', handler);
    return () => window.removeEventListener('tf:session-expired', handler);
  }, [isAuthenticated]);

  if (initialising) return <PageLoader />;

  return (
    <>
      <SocketInitialiser />
      <ConnectionBanner />
      <ToastContainer />

      {sessionExpired && (
        <SessionExpiredModal onDismiss={() => setSessionExpired(false)} />
      )}

      <Routes>
        {/* Root */}
        <Route path="/" element={<Navigate to={isAuthenticated ? '/join' : '/login'} replace />} />

        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected */}
        <Route path="/join"            element={<PrivateRoute><JoinPage /></PrivateRoute>} />
        <Route path="/rooms/:id"       element={<PrivateRoute><RoomPage /></PrivateRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePasswordPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*"             element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

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
