import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';

/**
 * useAuthInit — runs once on app mount.
 *
 * If a token exists in localStorage, it hits /api/auth/me to verify
 * the token is still valid server-side (not expired, user not deactivated).
 * If valid, the fresh user object is stored. If invalid, the user is logged out.
 *
 * Returns { initialising } — true until the check completes.
 * All route guards wait for this before rendering.
 */
const useAuthInit = () => {
  const [initialising, setInitialising] = useState(true);
  const { token, refreshUser, logout } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      if (token) {
        try {
          await refreshUser();
        } catch {
          logout();
        }
      }
      setInitialising(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { initialising };
};

export default useAuthInit;
