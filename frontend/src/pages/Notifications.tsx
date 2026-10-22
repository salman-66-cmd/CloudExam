import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Bell, CheckCheck, Info, Award, FileSpreadsheet } from 'lucide-react';
import { NotificationItem } from '../types';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500">Real-time alerts for exam deadlines, assignments, and results publication.</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                n.is_read
                  ? 'bg-white border-slate-200/80'
                  : 'bg-indigo-50/50 border-indigo-200 shadow-xs'
              }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${
                n.notification_type === 'RESULT_PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                n.notification_type === 'EXAM_ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {n.notification_type === 'RESULT_PUBLISHED' ? <Award className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${n.is_read ? 'text-slate-800' : 'text-slate-900'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No notifications in your inbox.
          </div>
        )}
      </div>
    </div>
  );
};
