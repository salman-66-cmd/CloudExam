import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  PlayCircle,
  Award,
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data);

        if (user?.role === 'STUDENT') {
          const examsRes = await api.get('/exams/');
          setStudentExams(examsRes.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  const role = user?.role || 'STUDENT';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs mb-2">
              <Activity className="w-3.5 h-3.5 text-blue-300" />
              <span>Cloud-Hosted Examination Cluster</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              {role === 'ADMIN' && 'System-wide overview: monitoring courses, examinations, and student participation metrics.'}
              {role === 'TEACHER' && 'Manage your courses, author question banks, schedule examinations, and grade subjective responses.'}
              {role === 'STUDENT' && 'View your enrolled courses, take active examinations, and review your verified test results.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {role === 'TEACHER' && (
              <Link
                to="/exams"
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Create Exam
              </Link>
            )}
            {role === 'STUDENT' && (
              <Link
                to="/exams"
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <PlayCircle className="w-4 h-4" />
                View Exams
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* --- 1. ADMIN DASHBOARD --- */}
      {role === 'ADMIN' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Students" value={data?.stats?.total_students ?? 0} icon={GraduationCap} color="blue" />
            <StatCard title="Total Teachers" value={data?.stats?.total_teachers ?? 0} icon={Users} color="indigo" />
            <StatCard title="Active Courses" value={data?.stats?.active_courses ?? 0} icon={BookOpen} color="violet" />
            <StatCard title="Total Attempts" value={data?.stats?.total_attempts ?? 0} icon={PlayCircle} color="emerald" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Scheduled Exams" value={data?.stats?.scheduled_exams ?? 0} icon={Clock} color="slate" />
            <StatCard title="Ongoing Exams" value={data?.stats?.ongoing_exams ?? 0} icon={Activity} color="rose" />
            <StatCard title="Platform Pass Rate" value={`${data?.stats?.pass_rate ?? 0}%`} subtitle={`Avg Score: ${data?.stats?.avg_score ?? 0}%`} icon={Award} color="emerald" />
          </div>

          {/* Charts & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Distribution Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Score Distribution Across Attempts</h3>
                <span className="text-xs text-slate-500 font-medium">Aggregated Results</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.score_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    />
                    <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Health Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Cloud Infrastructure</h3>
                  <Badge variant="emerald">Healthy</Badge>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500" /> API Gateway:
                    </span>
                    <span className="font-bold text-slate-900">FastAPI 0.115 (Stateless)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Database Cluster:
                    </span>
                    <span className="font-bold text-slate-900">SQLAlchemy / Migrated</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" /> Server Time:
                    </span>
                    <span className="font-mono text-slate-700">UTC Authoritative</span>
                  </div>
                </div>
              </div>

              <Link
                to="/audit"
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                Inspect System Audit Trail
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. TEACHER DASHBOARD --- */}
      {role === 'TEACHER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Exams Created" value={data?.stats?.total_exams_created ?? 0} icon={FileSpreadsheet} color="blue" />
            <StatCard title="Student Attempts" value={data?.stats?.total_student_attempts ?? 0} icon={Users} color="indigo" />
            <StatCard title="Pending Grading" value={data?.stats?.pending_evaluations ?? 0} icon={Clock} color="rose" />
            <StatCard title="Class Average" value={`${data?.stats?.average_class_score ?? 0}%`} icon={Award} color="emerald" />
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/exams"
              className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Manage Examinations</h4>
              <p className="text-xs text-slate-500 mt-1">Schedule new exams, configure duration and randomized questions.</p>
            </Link>

            <Link
              to="/questions"
              className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Question Bank</h4>
              <p className="text-xs text-slate-500 mt-1">Author single-choice, multi-select, true/false, and essay items.</p>
            </Link>

            <Link
              to="/evaluations"
              className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Grade Submissions</h4>
              <p className="text-xs text-slate-500 mt-1">Review student short answers and essays with model references.</p>
            </Link>
          </div>

          {/* Recent Student Submissions Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Student Submissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Examination</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recent_attempts?.length > 0 ? (
                    data.recent_attempts.map((att: any) => (
                      <tr key={att.attempt_id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-900">{att.student_name}</td>
                        <td className="py-3 text-slate-600">{att.exam_title}</td>
                        <td className="py-3 font-semibold text-slate-900">{att.score} pts</td>
                        <td className="py-3">
                          <Badge variant={att.status === 'EVALUATED' ? 'emerald' : 'amber'}>
                            {att.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            to={`/evaluations/${att.attempt_id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                          >
                            Review <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No examination attempts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. STUDENT DASHBOARD --- */}
      {role === 'STUDENT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Total Attempts" value={data?.stats?.total_attempts ?? 0} icon={PlayCircle} color="blue" />
            <StatCard title="Completed Exams" value={data?.stats?.completed_exams ?? 0} icon={CheckCircle2} color="indigo" />
            <StatCard title="Passed Exams" value={data?.stats?.passed_exams ?? 0} icon={Award} color="emerald" />
            <StatCard title="Avg Score" value={`${data?.stats?.average_percentage ?? 0}%`} icon={Activity} color="violet" />
          </div>

          {/* Assigned & Available Exams */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Assigned Examinations</h3>
                <p className="text-xs text-slate-500">Exams published by your course instructors.</p>
              </div>
              <Link to="/exams" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentExams.length > 0 ? (
                studentExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                          {exam.course_name}
                        </span>
                        <Badge
                          variant={
                            exam.status_label === 'Available' ? 'emerald' :
                            exam.status_label === 'In Progress' ? 'blue' :
                            exam.status_label === 'Evaluating' ? 'amber' : 'slate'
                          }
                        >
                          {exam.status_label}
                        </Badge>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{exam.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{exam.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.duration_minutes} mins
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Award className="w-3.5 h-3.5 text-slate-400" />
                          {exam.total_marks} Marks
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      {exam.status_label === 'Available' || exam.status_label === 'In Progress' ? (
                        <Link
                          to={`/exam-room/${exam.id}`}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold text-center block shadow-sm"
                        >
                          {exam.status_label === 'In Progress' ? 'Resume Examination' : 'Start Examination Now'}
                        </Link>
                      ) : exam.results_published ? (
                        <Link
                          to={`/results/${exam.attempt_id}`}
                          className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold text-center block"
                        >
                          View Results ({exam.score_obtained} pts)
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-4 bg-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                        >
                          {exam.has_attempted ? 'Submitted (Awaiting Results)' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-slate-400 text-sm">
                  No examinations assigned to your courses yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
