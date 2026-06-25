import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import AutoClockout from './AutoClockout';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isViewing, exitViewAs } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <AutoClockout />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setSidebarOpen(true)} />
        {isViewing && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white lg:px-8">
            <Eye size={16} />
            Viewing <b>{user?.name}</b>'s account (read-only) — all changes are disabled.
            <button onClick={exitViewAs} className="ml-auto rounded bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30">
              Exit view
            </button>
          </div>
        )}
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
