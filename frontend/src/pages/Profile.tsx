import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { UserCheck, Mail, Shield, Calendar, Clock } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">User Account Profile</h1>
        <p className="text-xs text-slate-500">Your registered authentication details and institutional privileges.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-md">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.full_name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="mt-2">
              <Badge variant={user?.role === 'ADMIN' ? 'indigo' : user?.role === 'TEACHER' ? 'blue' : 'emerald'}>
                {user?.role} Role
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block">Username</span>
            <span className="font-bold text-slate-800 text-sm">{user?.username}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block">Account Status</span>
            <span className="font-bold text-emerald-600 text-sm">Active & Verified</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block">Role Permissions</span>
            <span className="font-bold text-slate-800 text-sm capitalize">{user?.role?.toLowerCase()} Access</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block">Session Timezone</span>
            <span className="font-bold text-slate-800 text-sm">UTC Authoritative</span>
          </div>
        </div>
      </div>
    </div>
  );
};
