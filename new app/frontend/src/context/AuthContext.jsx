import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('lp_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('lp_token');
    if (token && !user) {
      setLoading(true);
      api
        .get('/users/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('lp_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('lp_token');
          localStorage.removeItem('lp_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/users/login', { email, password });
    localStorage.setItem('lp_token', res.data.access_token);
    localStorage.setItem('lp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await api.post('/users/register', payload);
    localStorage.setItem('lp_token', res.data.access_token);
    localStorage.setItem('lp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('lp_token');
    localStorage.removeItem('lp_user');
    setUser(null);
  };

  const refreshProfile = async () => {
    const res = await api.get('/users/me');
    setUser(res.data);
    localStorage.setItem('lp_user', JSON.stringify(res.data));
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
