import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [switching, setSwitching] = useState<boolean>(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/');
        const unread = res.data.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        // Ignore silent background notification fetch failure
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const handleQuickSwitch = async (role: UserRole) => {
    try {
      setSwitching(true);
      await quickLogin(role);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Quick Role Switcher for Seamless Demonstration */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Role Switcher:
        </span>
        <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-medium">
          <button
            onClick={() => handleQuickSwitch('ADMIN')}
            disabled={switching}
            className={`px-2.5 py-1 rounded-md transition-all ${
              user?.role === 'ADMIN'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleQuickSwitch('TEACHER')}
            disabled={switching}
            className={`px-2.5 py-1 rounded-md transition-all ${
              user?.role === 'TEACHER'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => handleQuickSwitch('STUDENT')}
            disabled={switching}
            className={`px-2.5 py-1 rounded-md transition-all ${
              user?.role === 'STUDENT'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Student
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 font-medium">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
