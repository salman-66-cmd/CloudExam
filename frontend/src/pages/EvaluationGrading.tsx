import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { GraduationCap, ArrowLeft, CheckCircle2, Save } from 'lucide-react';

export const EvaluationGrading: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [grades, setGrades] = useState<Record<number, { marks: number; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/evaluations/${attemptId}`);
        setData(res.data);
        setOverallFeedback(res.data.teacher_feedback || '');

        const initialGrades: Record<number, { marks: number; feedback: string }> = {};
        res.data.items.forEach((item: any) => {
          initialGrades[item.question_id] = {
            marks: item.marks_awarded || 0,
            feedback: item.teacher_feedback || ''
          };
        });
        setGrades(initialGrades);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [attemptId]);

  const handleMarkChange = (qId: number, marks: number) => {
    setGrades({
      ...grades,
      [qId]: { ...grades[qId], marks }
    });
  };

  const handleFeedbackChange = (qId: number, feedback: string) => {
    setGrades({
      ...grades,
      [qId]: { ...grades[qId], feedback }
    });
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const payload = {
        overall_feedback: overallFeedback,
        evaluations: Object.entries(grades).map(([qId, val]) => ({
          question_id: Number(qId),
          marks_awarded: Number(val.marks),
          feedback: val.feedback
        }))
      };

      await api.post(`/evaluations/${attemptId}/finalize`, payload);
      alert('Evaluation finalized successfully! Total score recalculated.');
      navigate('/evaluations');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to finalize evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={() => navigate('/evaluations')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Evaluations
        </button>

        <div className="text-right">
          <h2 className="text-base font-bold text-slate-900">{data?.exam_title}</h2>
          <p className="text-xs text-slate-500">Student: <strong className="text-slate-800">{data?.student_name}</strong></p>
        </div>
      </div>

      <div className="space-y-6">
        {data?.items?.map((item: any, idx: number) => (
          <div key={item.question_id} className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Question {idx + 1} • {item.question_type}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Max Marks: {item.max_marks} pts
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-900 leading-relaxed">{item.question_text}</p>

            {/* Student's written answer */}
            {item.student_response !== null && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Submitted Response:</label>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {item.student_response || <span className="italic text-slate-400">No response provided.</span>}
                </div>
              </div>
            )}

            {/* Model answer / rubric */}
            {item.model_answer && (
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
                <strong className="block mb-0.5">Evaluation Rubric & Model Answer:</strong>
                {item.model_answer}
              </div>
            )}

            {/* Teacher input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Awarded Marks
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max={item.max_marks}
                  value={grades[item.question_id]?.marks ?? 0}
                  onChange={(e) => handleMarkChange(item.question_id, Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Feedback Comment
                </label>
                <input
                  type="text"
                  placeholder="Specific observations or constructive critique..."
                  value={grades[item.question_id]?.feedback ?? ''}
                  onChange={(e) => handleFeedbackChange(item.question_id, e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Overall Teacher Feedback and Finalize */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Overall Teacher Feedback</h3>
          <textarea
            rows={3}
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Comprehensive evaluation summary and commendations for the student..."
            className="w-full p-3 border border-slate-300 rounded-lg text-xs"
          />

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleFinalize}
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Finalizing...' : 'Finalize & Update Grade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
