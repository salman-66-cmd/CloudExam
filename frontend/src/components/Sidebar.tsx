import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  HelpCircle,
  BookOpen,
  Users,
  PlayCircle,
  Award,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  UserCheck,
  GraduationCap
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Examinations', path: '/exams', icon: FileSpreadsheet, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Question Bank', path: '/questions', icon: HelpCircle, roles: ['ADMIN', 'TEACHER'] },
    { label: 'Courses & Classes', path: '/courses', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Student Management', path: '/students', icon: Users, roles: ['ADMIN', 'TEACHER'] },
    { label: 'Subjective Evaluations', path: '/evaluations', icon: GraduationCap, roles: ['ADMIN', 'TEACHER'] },
    { label: 'Exam Attempts', path: '/attempts', icon: PlayCircle, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Results & Grades', path: '/results', icon: Award, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'TEACHER'] },
    { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Audit Logs', path: '/audit', icon: ShieldCheck, roles: ['ADMIN'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN', 'TEACHER'] },
    { label: 'Profile', path: '/profile', icon: UserCheck, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-[#090e1f]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white text-lg tracking-tight">Cloud<span className="text-blue-400">Exam</span></span>
          <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Smart Assessment</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Platform Menu
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role Indicator Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#090e1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.role?.toLowerCase()} account</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
