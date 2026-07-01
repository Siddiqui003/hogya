import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Alert } from '../components/common/UI';
import styles from './Auth.module.css';

const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required.';
    else if (form.username.length < 3) errs.username = 'At least 3 characters.';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Letters, numbers, underscores only.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'At least 6 characters.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    const result = await register(form.username, form.password, form.displayName);
    if (result.success) navigate('/join');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#6366f1"/>
            <path d="M8 16l5 5 11-11" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className={styles.brandName}>TaskFlow</h1>
        </div>

        <h2 className={styles.heading}>Create your account</h2>
        <p className={styles.sub}>Get started in seconds</p>

        {error && <Alert variant="danger" onClose={clearError}>{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Display name"
            name="displayName"
            type="text"
            value={form.displayName}
            onChange={handleChange}
            placeholder="Ada Lovelace"
            hint="How your name appears to teammates"
          />
          <Input
            label="Username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="ada_lovelace"
            error={fieldErrors.username}
            hint="Letters, numbers, underscores"
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            error={fieldErrors.password}
            hint="At least 6 characters"
            autoComplete="new-password"
            required
          />
          <Button type="submit" fullWidth loading={loading} size="lg">
            Create account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
