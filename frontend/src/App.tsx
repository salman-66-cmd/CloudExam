import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Examinations } from './pages/Examinations';
import { ExamRoom } from './pages/ExamRoom';
import { QuestionBank } from './pages/QuestionBank';
import { Courses } from './pages/Courses';
import { StudentManagement } from './pages/StudentManagement';
import { AttemptsList } from './pages/AttemptsList';
import { Evaluations } from './pages/Evaluations';
import { EvaluationGrading } from './pages/EvaluationGrading';
import { Results } from './pages/Results';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';

const ProtectedExamRoom: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <ExamRoom />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fullscreen Dedicated Online Examination Engine */}
          <Route path="/exam-room/:examId" element={<ProtectedExamRoom />} />

          {/* Authenticated Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exams" element={<Examinations />} />
            <Route path="/questions" element={<QuestionBank />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/attempts" element={<AttemptsList />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/evaluations/:attemptId" element={<EvaluationGrading />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:attemptId" element={<Results />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
