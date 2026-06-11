import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { useSocket } from './hooks/useSocket';

import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage     from './pages/RoomPage';
import AdminPage    from './pages/AdminPage';
import { PageLoader } from './components/common/UI';

// ── Socket initialiser — renders nothing, just connects ───────────────────────
const SocketInitialiser = () => {
  useSocket();
  return null;
};

// ── Route guards ──────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin())         return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <SocketInitialiser />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/rooms/:id" element={<PrivateRoute><RoomPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
