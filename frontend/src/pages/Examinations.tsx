import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  FileSpreadsheet, 
  Plus, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  Award, 
  Share2, 
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';

export const Examinations: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<number | ''>('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [passingMarks, setPassingMarks] = useState(5.0);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [partialCredit, setPartialCredit] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/exams/');
      setExams(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    if (user?.role !== 'STUDENT') {
      api.get('/courses/').then(r => setCourses(r.data)).catch(() => {});
      api.get('/questions/').then(r => setQuestions(r.data)).catch(() => {});
    }
  }, [user]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setFormLoading(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days window

      await api.post('/exams/', {
        title,
        description,
        course_id: Number(courseId),
        start_time: now.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: Number(durationMinutes),
        passing_marks: Number(passingMarks),
        randomize_questions: false,
        randomize_options: false,
        max_attempts: 2,
        negative_marking: negativeMarking,
        negative_mark_value: 0.5,
        partial_credit: partialCredit,
        instructions: 'Read questions carefully and manage your time.',
        question_ids: selectedQuestions
      });

      setShowCreateModal(false);
      resetForm();
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create examination');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePublish = async (examId: number) => {
    try {
      await api.post(`/exams/${examId}/publish`);
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish');
    }
  };

  const handlePublishResults = async (examId: number) => {
    try {
      await api.post(`/exams/${examId}/publish-results`);
      alert('Examination results published to students!');
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish results');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCourseId('');
    setSelectedQuestions([]);
  };

  const toggleQuestionSelection = (qId: number) => {
    if (selectedQuestions.includes(qId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== qId));
    } else {
      setSelectedQuestions([...selectedQuestions, qId]);
    }
  };

  const computedTotalMarks = questions
    .filter(q => selectedQuestions.includes(q.id))
    .reduce((sum, q) => sum + (q.marks || 0), 0);

  const role = user?.role || 'STUDENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Examinations</h1>
          <p className="text-xs text-slate-500">
            {role === 'STUDENT' ? 'View and attempt your assigned course examinations.' : 'Author, schedule, and publish examinations for classes.'}
          </p>
        </div>

        {role !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Examination
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    {exam.course_name || 'Course Exam'}
                  </span>
                  <Badge
                    variant={
                      exam.status_label === 'Available' || exam.status_label === 'Ongoing' ? 'emerald' :
                      exam.status_label === 'Scheduled' ? 'blue' :
                      exam.status_label === 'In Progress' ? 'indigo' : 'slate'
                    }
                  >
                    {exam.status_label}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{exam.description || 'No description provided.'}</p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {exam.duration_minutes} Mins
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    {exam.total_marks} Total Marks
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                {role === 'STUDENT' ? (
                  exam.status_label === 'Available' || exam.status_label === 'In Progress' ? (
                    <Link
                      to={`/exam-room/${exam.id}`}
                      className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4" />
                      {exam.status_label === 'In Progress' ? 'Resume Exam' : 'Start Exam'}
                    </Link>
                  ) : exam.results_published ? (
                    <Link
                      to={`/results/${exam.attempt_id}`}
                      className="w-full py-2 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold text-center"
                    >
                      View Results ({exam.score_obtained} pts)
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 w-full text-center py-2 bg-slate-100 rounded-lg font-medium">
                      {exam.has_attempted ? 'Attempt Submitted' : 'Exam Not Open'}
                    </span>
                  )
                ) : (
                  // Teacher / Admin Actions
                  <div className="w-full flex items-center gap-2">
                    {!exam.is_published ? (
                      <button
                        onClick={() => handlePublish(exam.id)}
                        className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                      >
                        Publish Exam
                      </button>
                    ) : !exam.results_published ? (
                      <button
                        onClick={() => handlePublishResults(exam.id)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        Publish Results
                      </button>
                    ) : (
                      <Badge variant="emerald" className="w-full justify-center py-1">
                        Results Published
                      </Badge>
                    )}
                    <Link
                      to={`/reports?examId=${exam.id}`}
                      className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Analytics
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create New Examination</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Examination Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cloud Infrastructure Final Exam"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Course Assignment *
                </label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                >
                  <option value="">Select a course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Question Selection from Bank */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Select Questions from Question Bank ({selectedQuestions.length} selected)
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    Computed Total: {computedTotalMarks} Marks
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 p-2">
                  {questions.length > 0 ? (
                    questions.map(q => {
                      const isChecked = selectedQuestions.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className="flex items-start gap-2.5 p-2 hover:bg-slate-50 rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleQuestionSelection(q.id)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{q.question_text}</p>
                            <span className="text-[10px] text-slate-500">{q.topic} • {q.marks} pts • {q.question_type}</span>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 p-2">No questions available in bank. Create questions first.</p>
                  )}
                </div>
              </div>

              {/* Policies */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Negative Marking (-0.5 per wrong objective)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partialCredit}
                    onChange={(e) => setPartialCredit(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Partial Credit for Multi-Select
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || selectedQuestions.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {formLoading ? 'Scheduling...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
