import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSessionStore } from './store/sessionStore.js';
import { startBackgroundSync } from './lib/sync.js';

// Student
import PinLoginScreen from './pages/student/PinLoginScreen.jsx';
import ExamScreen from './pages/student/ExamScreen.jsx';
import ReviewScreen from './pages/student/ReviewScreen.jsx';
import SubmittedScreen from './pages/student/SubmittedScreen.jsx';

// Invigilator / Marker
import LoginScreen from './pages/invigilator/LoginScreen.jsx';
import InvigilatorDashboard from './pages/invigilator/InvigilatorDashboard.jsx';
import MarkingQueue from './pages/invigilator/MarkingQueue.jsx';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ItemBank from './pages/admin/ItemBank.jsx';
import ExamBuilder from './pages/admin/ExamBuilder.jsx';
import Scheduler from './pages/admin/Scheduler.jsx';
import Analytics from './pages/admin/Analytics.jsx';
import ResultsRelease from './pages/admin/ResultsRelease.jsx';

/**
 * Route guard helper — redirects to /login if not authenticated or wrong role.
 */
function StaffRoute({ children, roles, authStatus, profile }) {
  if (authStatus === 'unauthenticated') return <Navigate to="/login" replace />;
  if (authStatus === 'authenticated' && roles && !roles.includes(profile?.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

const ADMIN_ROLES = ['admin', 'school_admin'];
const STAFF_ROLES = ['admin', 'school_admin', 'invigilator'];

export default function App() {
  const { init, authStatus, profile } = useSessionStore();

  useEffect(() => {
    init();
    const cleanup = startBackgroundSync();
    return cleanup;
  }, [init]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oecs-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-oecs-teal border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-oecs-neutral-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const guard = (roles) => ({ authStatus, profile, roles });

  return (
    <Routes>
      {/* ── Student routes (public — PIN auth) ───────────────────────────── */}
      <Route path="/student/pin" element={<PinLoginScreen />} />
      <Route path="/student/exam" element={<ExamScreen />} />
      <Route path="/student/review" element={<ReviewScreen />} />
      <Route path="/student/submitted" element={<SubmittedScreen />} />

      {/* ── Staff login ───────────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginScreen />} />

      {/* ── Invigilator routes ────────────────────────────────────────────── */}
      <Route path="/invigilator" element={
        <StaffRoute {...guard(STAFF_ROLES)}>
          <InvigilatorDashboard />
        </StaffRoute>
      } />
      <Route path="/invigilator/collect" element={
        <StaffRoute {...guard(STAFF_ROLES)}>
          <InvigilatorDashboard />
        </StaffRoute>
      } />

      {/* ── Marking queue (invigilators + admins) ─────────────────────────── */}
      <Route path="/admin/marking-queue" element={
        <StaffRoute {...guard(STAFF_ROLES)}>
          <MarkingQueue />
        </StaffRoute>
      } />

      {/* ── Admin routes ──────────────────────────────────────────────────── */}
      <Route path="/admin" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <AdminDashboard />
        </StaffRoute>
      } />
      <Route path="/admin/item-bank" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <ItemBank />
        </StaffRoute>
      } />
      <Route path="/admin/exam-builder" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <ExamBuilder />
        </StaffRoute>
      } />
      <Route path="/admin/scheduler" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <Scheduler />
        </StaffRoute>
      } />
      <Route path="/admin/analytics" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <Analytics />
        </StaffRoute>
      } />
      <Route path="/admin/results" element={
        <StaffRoute {...guard(ADMIN_ROLES)}>
          <ResultsRelease />
        </StaffRoute>
      } />

      {/* ── Default redirect ──────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/student/pin" replace />} />
      <Route path="*" element={<Navigate to="/student/pin" replace />} />
    </Routes>
  );
}
