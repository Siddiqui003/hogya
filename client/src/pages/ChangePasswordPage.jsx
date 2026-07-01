import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Alert } from '../components/common/UI';
import styles from './ChangePasswordPage.module.css';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (e) => {
    setError('');
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.currentPassword)  errs.currentPassword = 'Current password is required.';
    if (!form.newPassword)      errs.newPassword = 'New password is required.';
    else if (form.newPassword.length < 6) errs.newPassword = 'At least 6 characters.';
    if (!form.confirmPassword)  errs.confirmPassword = 'Please confirm your new password.';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword)
      errs.newPassword = 'New password must be different from current password.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setError('');
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => navigate('/join')}>
          ← Back to rooms
        </button>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>🔑</div>
            <div>
              <h1 className={styles.cardTitle}>Change password</h1>
              <p className={styles.cardSub}>Update your account password</p>
            </div>
          </div>

          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>✅</div>
              <h2 className={styles.successTitle}>Password changed!</h2>
              <p className={styles.successMsg}>
                Your password has been updated successfully.
              </p>
              <Button onClick={() => navigate('/join')}>Back to rooms</Button>
            </div>
          ) : (
            <>
              {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <Input
                  label="Current password"
                  name="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="Your current password"
                  error={fieldErrors.currentPassword}
                  autoComplete="current-password"
                  required
                />
                <Input
                  label="New password"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  error={fieldErrors.newPassword}
                  hint="Minimum 6 characters"
                  autoComplete="new-password"
                  required
                />
                <Input
                  label="Confirm new password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                  error={fieldErrors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={() => navigate('/join')} type="button">
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    Update password
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ChangePasswordPage;
