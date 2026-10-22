import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cloudexam_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('cloudexam_token');
      const savedUser = localStorage.getItem('cloudexam_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('cloudexam_user', JSON.stringify(res.data));
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('cloudexam_token', newToken);
    localStorage.setItem('cloudexam_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cloudexam_token');
    localStorage.removeItem('cloudexam_user');
  };

  const quickLogin = async (role: UserRole) => {
    let credentials = { username_or_email: 'admin@cloudexam.edu', password: 'Admin123!' };
    if (role === 'TEACHER') {
      credentials = { username_or_email: 'teacher@cloudexam.edu', password: 'Teacher123!' };
    } else if (role === 'STUDENT') {
      credentials = { username_or_email: 'student@cloudexam.edu', password: 'Student123!' };
    }

    const res = await api.post('/auth/login', credentials);
    login(res.data.access_token, res.data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
