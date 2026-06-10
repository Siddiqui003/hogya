import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages (built in later phases)
const ComingSoon = ({ name }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', flexDirection: 'column', gap: '1rem',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ fontSize: '3rem' }}>🚀</div>
    <h1 style={{ color: '#6366f1' }}>TaskFlow</h1>
    <p style={{ color: '#475569' }}><strong>{name}</strong> — coming in a later phase</p>
    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Phase 1: Project setup complete ✅</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<ComingSoon name="Login Page" />} />
        <Route path="/register" element={<ComingSoon name="Register Page" />} />
        <Route path="/dashboard" element={<ComingSoon name="Dashboard" />} />
        <Route path="/rooms/:id" element={<ComingSoon name="Room Detail" />} />
        <Route path="/admin"   element={<ComingSoon name="Admin Panel" />} />
        <Route path="*"        element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
