import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Award, Download, CheckCircle, XCircle, ArrowRight, Eye } from 'lucide-react';

export const Results: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [breakdownData, setBreakdownData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await api.get('/results/');
        setResults(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleExportCSV = async (examId: number) => {
    try {
      const response = await api.get(`/results/export?exam_id=${examId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_results_${examId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to export CSV results');
    }
  };

  const handleViewBreakdown = async (attemptId: number) => {
    setSelectedAttemptId(attemptId);
    setModalLoading(true);
    try {
      const res = await api.get(`/attempts/${attemptId}/result`);
      setBreakdownData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not load result breakdown');
      setSelectedAttemptId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const role = user?.role || 'STUDENT';

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Results & Academic Records</h1>
          <p className="text-xs text-slate-500">
            Official examination marks, grade percentages, pass/fail status, and qualitative feedback.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="pb-3">Attempt ID</th>
              <th className="pb-3">Examination</th>
              {role !== 'STUDENT' && <th className="pb-3">Candidate</th>}
              <th className="pb-3">Marks</th>
              <th className="pb-3">Percentage</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.length > 0 ? (
              results.map((r) => (
                <tr key={r.attempt_id} className="hover:bg-slate-50">
                  <td className="py-3.5 font-mono text-slate-500">#{r.attempt_id}</td>
                  <td className="py-3.5 font-bold text-slate-900">{r.exam_title}</td>
                  {role !== 'STUDENT' && <td className="py-3.5 text-slate-700">{r.student_name}</td>}
                  <td className="py-3.5 font-semibold text-slate-900">
                    {r.score_obtained} / {r.total_marks}
                  </td>
                  <td className="py-3.5 font-mono font-bold text-indigo-600">
                    {r.percentage}%
                  </td>
                  <td className="py-3.5">
                    <Badge variant={r.passed ? 'emerald' : 'rose'}>
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleViewBreakdown(r.attempt_id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Breakdown
                    </button>
                    {role !== 'STUDENT' && (
                      <button
                        onClick={() => handleExportCSV(r.exam_id)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> CSV
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No published examination records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Result Breakdown Modal */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{breakdownData?.exam_title}</h3>
                  <p className="text-xs text-slate-500">Candidate: {breakdownData?.student_name}</p>
                </div>
                <button
                  onClick={() => { setSelectedAttemptId(null); setBreakdownData(null); }}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {modalLoading ? (
                <div className="py-12 text-center text-slate-400">Loading evaluation breakdown...</div>
              ) : (
                <div className="space-y-4 pt-3 overflow-y-auto max-h-[60vh]">
                  {/* Summary Score Header */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Marks Scored</p>
                      <p className="text-xl font-extrabold text-slate-900">{breakdownData?.score_obtained} / {breakdownData?.total_marks}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Percentage</p>
                      <p className="text-xl font-extrabold text-indigo-600">{breakdownData?.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Final Decision</p>
                      <Badge variant={breakdownData?.passed ? 'emerald' : 'rose'} className="mt-1">
                        {breakdownData?.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                  </div>

                  {breakdownData?.teacher_feedback && (
                    <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900">
                      <strong>Instructor Feedback:</strong> {breakdownData.teacher_feedback}
                    </div>
                  )}

                  {/* Question-wise Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Question Itemization</h4>
                    {breakdownData?.breakdown?.map((q: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Q{idx + 1}. {q.question_text}</span>
                          <span className="font-semibold text-indigo-600">{q.marks_awarded} / {q.max_marks} pts</span>
                        </div>

                        {q.text_response && (
                          <div className="p-2 rounded bg-slate-50 font-mono text-slate-700">
                            <strong>Your Answer:</strong> {q.text_response}
                          </div>
                        )}

                        {q.explanation && (
                          <p className="text-slate-500 italic">
                            Explanation: {q.explanation}
                          </p>
                        )}

                        {q.feedback && (
                          <p className="text-indigo-600 font-medium">
                            Instructor Comment: {q.feedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => { setSelectedAttemptId(null); setBreakdownData(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
