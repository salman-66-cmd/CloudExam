import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PlayCircle, Eye, Clock, Award } from 'lucide-react';

export const AttemptsList: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        // Student sees own attempts, teachers see attempts in their courses
        const res = await api.get('/results/');
        setAttempts(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [user]);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Examination Attempts</h1>
        <p className="text-xs text-slate-500">
          History of all examination sessions, server timestamps, and submission logs.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="pb-3">Attempt ID</th>
              <th className="pb-3">Examination</th>
              <th className="pb-3">Student</th>
              <th className="pb-3">Marks</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Submitted At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attempts.length > 0 ? (
              attempts.map((a) => (
                <tr key={a.attempt_id} className="hover:bg-slate-50">
                  <td className="py-3.5 font-mono text-slate-500">#{a.attempt_id}</td>
                  <td className="py-3.5 font-bold text-slate-900">{a.exam_title}</td>
                  <td className="py-3.5 text-slate-700">{a.student_name}</td>
                  <td className="py-3.5 font-semibold text-slate-900">{a.score_obtained} / {a.total_marks}</td>
                  <td className="py-3.5">
                    <Badge variant={a.status === 'EVALUATED' ? 'emerald' : 'blue'}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'In Progress'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No attempt records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
