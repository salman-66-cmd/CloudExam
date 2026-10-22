import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  FileUp, 
  Check, 
  CheckCircle2, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { Question, QuestionType, DifficultyLevel } from '../types';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [topic, setTopic] = useState('Cloud Architecture');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ_SINGLE');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(2.0);
  const [explanation, setExplanation] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  
  // Dynamic options for objective questions
  const [options, setOptions] = useState<Array<{ option_text: string; is_correct: boolean }>>([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/questions/', {
        params: {
          search: search || undefined,
          question_type: selectedType || undefined,
          difficulty: selectedDifficulty || undefined,
        }
      });
      setQuestions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedType, selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalOptions: any[] = [];
      if (['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(questionType)) {
        finalOptions = options
          .filter(o => o.option_text.trim().length > 0)
          .map((o, idx) => ({ ...o, order_index: idx + 1 }));
      }

      await api.post('/questions/', {
        topic,
        difficulty,
        question_type: questionType,
        question_text: questionText,
        marks: Number(marks),
        explanation,
        model_answer: modelAnswer || null,
        options: finalOptions
      });

      setShowAddModal(false);
      resetModalForm();
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create question');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const resetModalForm = () => {
    setQuestionText('');
    setExplanation('');
    setModelAnswer('');
    setQuestionType('MCQ_SINGLE');
    setOptions([
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ]);
  };

  const handleOptionTextChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx].option_text = val;
    setOptions(updated);
  };

  const handleOptionCorrectToggle = (idx: number) => {
    const updated = [...options];
    if (questionType === 'MCQ_SINGLE' || questionType === 'TRUE_FALSE') {
      updated.forEach((o, i) => { o.is_correct = (i === idx); });
    } else {
      updated[idx].is_correct = !updated[idx].is_correct;
    }
    setOptions(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Question Bank</h1>
          <p className="text-xs text-slate-500">
            Author and organize reusable questions across all 5 standard question types.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by topic or statement..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="">All Question Types</option>
            <option value="MCQ_SINGLE">Single MCQ</option>
            <option value="MCQ_MULTIPLE">Multiple MCQ</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="ESSAY">Essay / Descriptive</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="indigo">{q.question_type}</Badge>
                  <Badge variant={q.difficulty === 'EASY' ? 'emerald' : q.difficulty === 'MEDIUM' ? 'blue' : 'rose'}>
                    {q.difficulty}
                  </Badge>
                  <span className="text-xs text-slate-500 font-semibold">{q.topic}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {q.marks} pts
                  </span>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-900">{q.question_text}</p>

              {/* Options display if objective */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        opt.is_correct
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{opt.option_text}</span>
                      {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Model answer for subjective */}
              {q.model_answer && (
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                  <span className="font-bold">Grading Guide / Model Answer:</span> {q.model_answer}
                </div>
              )}

              {q.explanation && (
                <p className="text-[11px] text-slate-500 italic pt-1">
                  Explanation: {q.explanation}
                </p>
              )}
            </div>
          ))}

          {questions.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No questions found matching your filter criteria.
            </div>
          )}
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Question to Bank</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="MCQ_SINGLE">Single MCQ</option>
                    <option value="MCQ_MULTIPLE">Multiple MCQ</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="ESSAY">Essay / Descriptive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Topic / Sub-Category
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Distributed Consensus"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the full question prompt..."
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Dynamic Options for Objective */}
              {['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(questionType) && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Answer Options (Mark the green checkbox for correct answer)
                  </label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOptionCorrectToggle(idx)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          opt.is_correct ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'border-slate-300 bg-white text-slate-300'
                        }`}
                        title="Toggle correct"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Model answer for subjective */}
              {['SHORT_ANSWER', 'ESSAY'].includes(questionType) && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Grading Guide / Model Answer Reference
                  </label>
                  <textarea
                    rows={2}
                    value={modelAnswer}
                    onChange={(e) => setModelAnswer(e.target.value)}
                    placeholder="Key concepts expected for teacher grading..."
                    className="w-full p-3 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Explanation (Revealed when results are published)
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why this answer is correct..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
