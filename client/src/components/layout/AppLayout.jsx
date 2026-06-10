import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AutoClockout from './AutoClockout';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <AutoClockout />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
