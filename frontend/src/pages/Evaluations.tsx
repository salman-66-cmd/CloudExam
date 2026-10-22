import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { GraduationCap, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const Evaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setLoading(true);
        const res = await api.get('/evaluations/pending');
        setEvaluations(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Subjective Evaluations</h1>
        <p className="text-xs text-slate-500">
          Review, grade, and provide qualitative feedback on student short answers and essays.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="pb-3">Attempt ID</th>
              <th className="pb-3">Candidate</th>
              <th className="pb-3">Examination</th>
              <th className="pb-3">Current Score</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {evaluations.length > 0 ? (
              evaluations.map((item) => (
                <tr key={item.attempt_id} className="hover:bg-slate-50">
                  <td className="py-3.5 font-mono text-slate-500">#{item.attempt_id}</td>
                  <td className="py-3.5 font-bold text-slate-900">{item.student_name}</td>
                  <td className="py-3.5 text-slate-700">{item.exam_title}</td>
                  <td className="py-3.5 font-semibold text-slate-900">{item.score_obtained} / {item.total_marks} pts</td>
                  <td className="py-3.5">
                    <Badge variant={item.pending_subjective_count > 0 ? 'rose' : 'emerald'}>
                      {item.pending_subjective_count > 0 ? `${item.pending_subjective_count} Pending Review` : 'Graded'}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      to={`/evaluations/${item.attempt_id}`}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                    >
                      Grade Paper <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No submissions pending evaluation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
