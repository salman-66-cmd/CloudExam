import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { BookOpen, Plus, Users, UserPlus, Trash2, ArrowRight } from 'lucide-react';
import { Course, User } from '../types';

export const Courses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [studentToEnroll, setStudentToEnroll] = useState<number | ''>('');

  // Course Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState('Spring 2026');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses/');
      setCourses(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    if (user?.role !== 'STUDENT') {
      api.get('/users/?role=STUDENT').then(r => setStudents(r.data)).catch(() => {});
    }
  }, [user]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/courses/', {
        code,
        name,
        description,
        academic_term: term,
        status: 'ACTIVE'
      });
      setShowCreateModal(false);
      setCode('');
      setName('');
      setDescription('');
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create course');
    }
  };

  const openEnrollmentModal = async (course: Course) => {
    setSelectedCourseForEnrollment(course);
    try {
      const res = await api.get(`/courses/${course.id}/students`);
      setEnrolledStudents(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedCourseForEnrollment || !studentToEnroll) return;
    try {
      await api.post(`/courses/${selectedCourseForEnrollment.id}/enrollments`, {
        student_id: Number(studentToEnroll)
      });
      // Refresh enrolled list
      const res = await api.get(`/courses/${selectedCourseForEnrollment.id}/students`);
      setEnrolledStudents(res.data);
      setStudentToEnroll('');
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Enrollment failed');
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedCourseForEnrollment) return;
    try {
      await api.delete(`/courses/${selectedCourseForEnrollment.id}/enrollments/${studentId}`);
      setEnrolledStudents(enrolledStudents.filter(s => s.id !== studentId));
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove student');
    }
  };

  const role = user?.role || 'STUDENT';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Courses & Classes</h1>
          <p className="text-xs text-slate-500">
            Academic courses, terms, and student cohort enrollments.
          </p>
        </div>

        {role !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-600 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                    {course.code}
                  </span>
                  <Badge variant="blue">{course.academic_term}</Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900">{course.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{course.description || 'No description provided.'}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <span>Instructor: <strong className="text-slate-800">{course.teacher_name}</strong></span>
                  <span className="font-semibold text-indigo-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {course.enrolled_count} Students
                  </span>
                </div>
              </div>

              {role !== 'STUDENT' && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEnrollmentModal(course)}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    Manage Enrollments
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Academic Course</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-405"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Database Architecture"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Academic Term</label>
                <input
                  type="text"
                  required
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollments Modal */}
      {selectedCourseForEnrollment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enrolled Students</h3>
                  <p className="text-xs text-slate-500">{selectedCourseForEnrollment.name} ({selectedCourseForEnrollment.code})</p>
                </div>
                <button onClick={() => setSelectedCourseForEnrollment(null)} className="text-slate-400 text-xl font-bold">&times;</button>
              </div>

              {/* Add Student Control */}
              <div className="flex items-center gap-2 my-4">
                <select
                  value={studentToEnroll}
                  onChange={(e) => setStudentToEnroll(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">Select student to enroll...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleEnrollStudent}
                  disabled={!studentToEnroll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-40"
                >
                  Enroll
                </button>
              </div>

              {/* Enrolled Students Table */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {enrolledStudents.length > 0 ? (
                  enrolledStudents.map(student => (
                    <div key={student.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{student.full_name}</p>
                        <p className="text-slate-500">{student.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove student from course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-4 text-center">No students enrolled yet.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourseForEnrollment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
