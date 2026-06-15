import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute, ModuleRoute } from './components/RouteGuards';
import AppLayout from './components/layout/AppLayout';

import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';

import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import WorkHours from './pages/WorkHours';
import Leaves from './pages/Leaves';
import Tenders from './pages/Tenders';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Payroll from './pages/Payroll';
import Finance from './pages/Finance';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import Assets from './pages/Assets';
import DesignLibrary from './pages/DesignLibrary';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const m = (module, el) => <ModuleRoute module={module}>{el}</ModuleRoute>;

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

      {/* Authenticated app */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/employees" element={m('employees', <Employees />)} />
        <Route path="/attendance" element={m('attendance', <Attendance />)} />
        <Route path="/work-hours" element={m('attendance', <WorkHours />)} />
        <Route path="/leaves" element={m('leaves', <Leaves />)} />
        <Route path="/tenders" element={m('tenders', <Tenders />)} />
        <Route path="/projects" element={m('projects', <Projects />)} />
        <Route path="/tasks" element={m('tasks', <Tasks />)} />
        <Route path="/payroll" element={m('payroll', <Payroll />)} />
        <Route path="/finance" element={m('finance', <Finance />)} />
        <Route path="/campaigns" element={m('campaigns', <Campaigns />)} />
        <Route path="/leads" element={m('leads', <Leads />)} />
        <Route path="/assets" element={m('assets', <Assets />)} />
        <Route path="/design-library" element={m('design_library', <DesignLibrary />)} />
        <Route path="/reports" element={m('reports', <Reports />)} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={m('settings', <Settings />)} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
