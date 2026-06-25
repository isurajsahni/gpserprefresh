import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // effective user (the viewed user when impersonating)
  const [realUser, setRealUser] = useState(null); // the actual logged-in account
  const [viewAsId, setViewAsId] = useState(() => localStorage.getItem('viewAsId') || null);
  const [loading, setLoading] = useState(true);

  // Restore session. Always resolve the real account (?real=1 bypasses view-as);
  // if a view-as target is active and the account is a super admin, load it too.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const real = (await api.get('/auth/me?real=1')).data.user;
        setRealUser(real);
        const vid = localStorage.getItem('viewAsId');
        if (vid && real.role === 'super_admin' && vid !== String(real._id)) {
          try {
            const target = (await api.get('/auth/me')).data.user;
            setUser(target);
            setViewAsId(vid);
          } catch {
            localStorage.removeItem('viewAsId');
            setViewAsId(null);
            setUser(real);
          }
        } else {
          if (vid) { localStorage.removeItem('viewAsId'); setViewAsId(null); }
          setUser(real);
        }
      } catch {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.removeItem('viewAsId');
    setViewAsId(null);
    setRealUser(res.data.user);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('token', res.data.token);
    setRealUser(res.data.user);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('viewAsId');
    setViewAsId(null);
    setRealUser(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const res = await api.put('/auth/profile', payload);
    setUser(res.data.user);
    setRealUser(res.data.user);
    return res.data.user;
  }, []);

  // Enter/exit "view as user". A full reload re-scopes every request cleanly.
  const enterViewAs = useCallback((userId) => {
    localStorage.setItem('viewAsId', userId);
    window.location.href = '/dashboard';
  }, []);
  const exitViewAs = useCallback(() => {
    localStorage.removeItem('viewAsId');
    window.location.href = '/dashboard';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser,
        viewAsId,
        isViewing: !!viewAsId,
        loading,
        login,
        register,
        logout,
        updateProfile,
        enterViewAs,
        exitViewAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
