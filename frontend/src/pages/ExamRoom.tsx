import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import confetti from 'canvas-confetti';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Save, 
  RefreshCw, 
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

export const ExamRoom: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [attemptData, setAttemptData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Remaining seconds calculated from authoritative server deadline
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Saved');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize or resume attempt
  useEffect(() => {
    const initAttempt = async () => {
      try {
        setLoading(true);
        // Start or resume attempt
        const startRes = await api.post(`/attempts/exams/${examId}/attempts`);
        const attId = startRes.data.attempt_id;
        setAttemptId(attId);

        // Fetch attempt details and questions
        const stateRes = await api.get(`/attempts/${attId}`);
        setAttemptData(stateRes.data.attempt);
        setQuestions(stateRes.data.questions);
        setAnswers(stateRes.data.answers || {});
        setRemainingSeconds(stateRes.data.attempt.remaining_seconds);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to initialize examination attempt.');
      } finally {
        setLoading(false);
      }
    };

    initAttempt();
  }, [examId]);

  // Authoritative server-side countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Periodic autosave every 20 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (attemptId && questions[currentIndex]) {
        saveCurrentAnswer(questions[currentIndex].id, false);
      }
    }, 20000);

    return () => clearInterval(autoSaveInterval);
  }, [attemptId, currentIndex, answers]);

  const saveCurrentAnswer = async (questionId: number, isManual = false) => {
    if (!attemptId) return;
    const currentAns = answers[questionId] || { selected_option_ids: [], text_response: '', is_marked_for_review: false };

    try {
      setSaveStatus('saving');
      await api.put(`/attempts/${attemptId}/answers/${questionId}`, {
        selected_option_ids: currentAns.selected_option_ids || [],
        text_response: currentAns.text_response || '',
        is_marked_for_review: !!currentAns.is_marked_for_review
      });
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    }
  };

  const handleOptionSelect = (questionId: number, optionId: number, isMultiple: boolean) => {
    const existing = answers[questionId] || { selected_option_ids: [], text_response: '', is_marked_for_review: false };
    let newOptions: number[] = [];

    if (isMultiple) {
      const set = new Set<number>(existing.selected_option_ids || []);
      if (set.has(optionId)) {
        set.delete(optionId);
      } else {
        set.add(optionId);
      }
      newOptions = Array.from(set);
    } else {
      newOptions = [optionId];
    }

    setAnswers({
      ...answers,
      [questionId]: {
        ...existing,
        selected_option_ids: newOptions
      }
    });
    setSaveStatus('unsaved');
  };

  const handleTextChange = (questionId: number, text: string) => {
    const existing = answers[questionId] || { selected_option_ids: [], text_response: '', is_marked_for_review: false };
    setAnswers({
      ...answers,
      [questionId]: {
        ...existing,
        text_response: text
      }
    });
    setSaveStatus('unsaved');
  };

  const toggleMarkForReview = (questionId: number) => {
    const existing = answers[questionId] || { selected_option_ids: [], text_response: '', is_marked_for_review: false };
    const updated = {
      ...existing,
      is_marked_for_review: !existing.is_marked_for_review
    };
    setAnswers({
      ...answers,
      [questionId]: updated
    });
    saveCurrentAnswer(questionId);
  };

  const handleNavigate = (newIndex: number) => {
    if (questions[currentIndex]) {
      saveCurrentAnswer(questions[currentIndex].id);
    }
    setCurrentIndex(newIndex);
  };

  const handleAutoSubmit = async () => {
    if (!attemptId) return;
    try {
      await api.post(`/attempts/${attemptId}/submit`);
      navigate('/results');
    } catch {}
  };

  const handleFinalSubmit = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      // Save current question one final time
      if (questions[currentIndex]) {
        await saveCurrentAnswer(questions[currentIndex].id);
      }
      const res = await api.post(`/attempts/${attemptId}/submit`);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setShowSubmitModal(false);
      setTimeout(() => {
        navigate(`/results`);
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit examination.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm font-semibold tracking-wide">Initializing Secure Examination Session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Examination Access Denied</h2>
          <p className="text-slate-300 text-sm">{error}</p>
          <button
            onClick={() => navigate('/exams')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
          >
            Return to Examinations
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? (answers[currentQ.id] || { selected_option_ids: [], text_response: '', is_marked_for_review: false }) : null;

  // Format timer
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const timerDisplay = `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isTimeCritical = remainingSeconds < 300; // Less than 5 minutes

  // Compute question counts
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') {
      return a.text_response && a.text_response.trim().length > 0;
    }
    return a.selected_option_ids && a.selected_option_ids.length > 0;
  }).length;
  const markedReviewCount = questions.filter(q => answers[q.id]?.is_marked_for_review).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Top Authoritative Header Bar */}
      <header className="h-16 bg-[#0B132B] border-b border-slate-800 px-6 flex items-center justify-between text-white sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">{attemptData?.exam_title}</h1>
            <p className="text-[11px] text-slate-400">Candidate: {attemptData?.student_name}</p>
          </div>
        </div>

        {/* Center: Authoritative Countdown Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
          isTimeCritical 
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
            : 'bg-slate-800 border-slate-700 text-indigo-300'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm font-extrabold tracking-wider">{timerDisplay}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Server Time</span>
        </div>

        {/* Right Controls: Autosave status & Submit */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Saved ({lastSavedTime})
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-blue-400 animate-pulse font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Autosaving...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Save className="w-3.5 h-3.5" /> Unsaved changes
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Save failed, retrying
              </span>
            )}
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Finish & Submit
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3 cols): Question Card */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[520px]">
            <div>
              {/* Question Meta Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    {currentQ?.marks} Marks
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    {currentQ?.topic}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => currentQ && toggleMarkForReview(currentQ.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    currentAnswer?.is_marked_for_review
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentAnswer?.is_marked_for_review ? 'fill-amber-500 text-amber-500' : ''}`} />
                  {currentAnswer?.is_marked_for_review ? 'Marked for Review' : 'Mark for Review'}
                </button>
              </div>

              {/* Question Statement */}
              <div className="prose max-w-none text-slate-900 text-base font-medium leading-relaxed mb-6">
                {currentQ?.question_text}
              </div>

              {/* Answer Inputs according to question type */}
              <div className="space-y-3 mt-6">
                {/* 1. MCQ Single & True/False */}
                {(currentQ?.question_type === 'MCQ_SINGLE' || currentQ?.question_type === 'TRUE_FALSE') && (
                  <div className="space-y-2.5">
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = currentAnswer?.selected_option_ids?.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          onClick={() => handleOptionSelect(currentQ.id, opt.id, false)}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-medium">{opt.option_text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 2. MCQ Multiple (Select all that apply) */}
                {currentQ?.question_type === 'MCQ_MULTIPLE' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-indigo-600 font-semibold mb-2">Multiple Selection (Choose all correct choices):</p>
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = currentAnswer?.selected_option_ids?.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          onClick={() => handleOptionSelect(currentQ.id, opt.id, true)}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-medium">{opt.option_text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3. Short Answer & Essay */}
                {(currentQ?.question_type === 'SHORT_ANSWER' || currentQ?.question_type === 'ESSAY') && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      {currentQ.question_type === 'SHORT_ANSWER' ? 'Your Short Answer Response:' : 'Comprehensive Essay Response:'}
                    </label>
                    <textarea
                      rows={currentQ.question_type === 'ESSAY' ? 8 : 4}
                      value={currentAnswer?.text_response || ''}
                      onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                      onBlur={() => saveCurrentAnswer(currentQ.id)}
                      placeholder="Type your structured academic response here..."
                      className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                    />
                    <p className="text-[11px] text-slate-400">
                      Answers are automatically saved securely to the server upon navigation or pausing.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Question Navigation Controls */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-8">
              <button
                type="button"
                onClick={() => handleNavigate(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Question
              </button>

              <button
                type="button"
                onClick={() => saveCurrentAnswer(currentQ.id, true)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                Save Progress
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => handleNavigate(currentIndex + 1)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Review & Submit
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Question Palette & Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Question Palette
            </h3>

            {/* Palette Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Answered ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200" />
                Unanswered ({totalQuestions - answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                Review ({markedReviewCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-indigo-600" />
                Current
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isMarked = ans?.is_marked_for_review;
                
                let isAnswered = false;
                if (ans) {
                  if (q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') {
                    isAnswered = !!(ans.text_response && ans.text_response.trim().length > 0);
                  } else {
                    isAnswered = !!(ans.selected_option_ids && ans.selected_option_ids.length > 0);
                  }
                }

                let btnClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (isAnswered) {
                  btnClass = 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600';
                }
                if (isMarked) {
                  btnClass = 'bg-amber-400 text-slate-900 hover:bg-amber-500 border-amber-500 font-bold';
                }
                if (isCurrent) {
                  btnClass += ' ring-2 ring-indigo-600 ring-offset-2';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigate(idx)}
                    className={`h-9 w-full rounded-lg text-xs font-bold border transition-all flex items-center justify-center ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Progress summary */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Progress:</span>
                <span>{Math.round((answeredCount / (totalQuestions || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / (totalQuestions || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Exam Submission?</h3>
              <p className="text-xs text-slate-500">
                You have answered <span className="font-bold text-slate-900">{answeredCount}</span> of{' '}
                <span className="font-bold text-slate-900">{totalQuestions}</span> questions.
                {markedReviewCount > 0 && ` (${markedReviewCount} marked for review)`}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">What happens after submission?</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Objective questions will be graded automatically.</li>
                <li>Descriptive responses will be queued for instructor evaluation.</li>
                <li>Your submission timestamp will be authoritatively recorded.</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
