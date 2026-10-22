import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { AuditLogItem } from '../types';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSearch, setActionSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/', {
        params: { action: actionSearch || undefined }
      });
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & System Audit Logs</h1>
        <p className="text-xs text-slate-500">
          Immutable event log tracking authentication, examination start/submission events, and grading modifications.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={actionSearch}
          onChange={(e) => setActionSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
          placeholder="Filter by action (e.g. USER_LOGIN, SUBMIT_EXAM, CREATE_COURSE)..."
          className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none"
        />
        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
        >
          Search
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="pb-3">Timestamp (UTC)</th>
              <th className="pb-3">Actor</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Target Resource</th>
              <th className="pb-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 font-mono text-slate-500">
                  {new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                </td>
                <td className="py-3 font-bold text-slate-900">{log.user_name || 'System / Anonymous'}</td>
                <td className="py-3 font-mono font-semibold text-indigo-600">
                  <Badge variant="blue">{log.action}</Badge>
                </td>
                <td className="py-3 font-mono text-slate-700">{log.resource_type} #{log.resource_id}</td>
                <td className="py-3 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                  {log.details ? JSON.stringify(log.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
