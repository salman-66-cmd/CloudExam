import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GraduationCap, Shield, UserCheck, Lock, Mail, ArrowRight, Cloud, Database, Cpu } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password
      });
      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await quickLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Quick login failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#3A506B] p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight">Cloud<span className="text-blue-400">Exam</span></span>
              <span className="block text-xs uppercase tracking-widest text-slate-300 font-semibold">Smart Assessment Platform</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Cloud className="w-3.5 h-3.5" /> Cloud Computing Mini-Project
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            High-concurrency smart examination, instant grading & analytics.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Engineered with FastAPI, React, SQLAlchemy ORM, server-side deadline enforcement, automated objective evaluation, and role-based access control.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-300 font-medium">Relational Storage</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-300 font-medium">Auto-Evaluation</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">Tamper Proof</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          &copy; 2026 CloudExam Systems Inc. All rights reserved.
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-slate-50">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign in to CloudExam</h2>
            <p className="text-sm text-slate-600 mt-2">
              Enter your credentials or choose a quick demo role below.
            </p>
          </div>

          {/* Quick Demo Role Switch Buttons */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Instant Demo Access (1-Click)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 transition-all text-center"
              >
                <Shield className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-xs font-bold">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('TEACHER')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 transition-all text-center"
              >
                <UserCheck className="w-4 h-4 mb-1 text-indigo-600" />
                <span className="text-xs font-bold">Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('STUDENT')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-700 transition-all text-center"
              >
                <GraduationCap className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="text-xs font-bold">Student</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Regular Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin@cloudexam.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Need a student account?{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
