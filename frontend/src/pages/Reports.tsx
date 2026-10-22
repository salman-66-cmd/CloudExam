import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { BarChart3, Award, Users, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Reports: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | ''>('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/exams/');
        setExams(res.data);
        const urlId = searchParams.get('examId');
        if (urlId) {
          setSelectedExamId(Number(urlId));
        } else if (res.data.length > 0) {
          setSelectedExamId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedExamId) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/exams/${selectedExamId}/analytics`);
        setAnalytics(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedExamId]);

  if (loading && !analytics) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Performance Reports & Analytics</h1>
          <p className="text-xs text-slate-500">
            Psychometric question accuracy, difficulty analysis, and cohort scoring distributions.
          </p>
        </div>

        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 shadow-xs"
        >
          {exams.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.title}</option>
          ))}
        </select>
      </div>

      {analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Total Candidates" value={analytics.total_attempts ?? 0} icon={Users} color="blue" />
            <StatCard title="Class Average" value={`${analytics.avg_score ?? 0} pts`} subtitle={`Max: ${analytics.total_marks}`} icon={Award} color="indigo" />
            <StatCard title="Highest Score" value={`${analytics.highest_score ?? 0} pts`} icon={TrendingUp} color="emerald" />
            <StatCard title="Pass Rate" value={`${analytics.pass_rate ?? 0}%`} icon={CheckCircle2} color="violet" />
          </div>

          {/* Question-wise Accuracy Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Question-Level Accuracy & Item Discrimination</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Q#</th>
                    <th className="pb-3">Topic</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Difficulty</th>
                    <th className="pb-3">Weight</th>
                    <th className="pb-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.question_stats?.map((q: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-slate-700">Q{idx + 1}</td>
                      <td className="py-3 font-semibold text-slate-900">{q.topic}</td>
                      <td className="py-3"><Badge variant="slate">{q.type}</Badge></td>
                      <td className="py-3">
                        <Badge variant={q.difficulty === 'EASY' ? 'emerald' : q.difficulty === 'MEDIUM' ? 'blue' : 'rose'}>
                          {q.difficulty}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">{q.marks} pts</td>
                      <td className="py-3 font-mono font-bold text-indigo-600">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${q.accuracy}%` }} />
                          </div>
                          <span>{q.accuracy}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
