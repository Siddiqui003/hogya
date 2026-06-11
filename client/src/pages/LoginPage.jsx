import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Alert } from '../components/common/UI';
import styles from './Auth.module.css';

const LoginPage = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.username, form.password);
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#6366f1"/>
            <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className={styles.brandName}>TaskFlow</h1>
        </div>

        <h2 className={styles.heading}>Welcome back</h2>
        <p className={styles.sub}>Sign in to your workspace</p>

        {error && <Alert variant="danger" onClose={clearError}>{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="your_username"
            autoComplete="username"
            autoFocus
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Sign in
          </Button>
        </form>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
