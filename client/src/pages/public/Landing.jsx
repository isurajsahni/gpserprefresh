import { Link } from 'react-router-dom';
import {
  Users, Clock, CalendarDays, FileText, FolderKanban, ListChecks, Wallet, Receipt,
  Megaphone, Target, Boxes, Palette, BarChart3, ShieldCheck, Layers, MapPin, ArrowRight,
} from 'lucide-react';
import Logo from '../../components/ui/Logo';

const MODULES = [
  { icon: Users, name: 'Employees', desc: 'Directory, roles & reporting lines' },
  { icon: Clock, name: 'Attendance', desc: 'Check-in/out & monthly summaries' },
  { icon: CalendarDays, name: 'Leaves', desc: 'Apply, approve, track balances' },
  { icon: FileText, name: 'Tenders', desc: 'Pipeline, value & deadlines' },
  { icon: FolderKanban, name: 'Projects', desc: 'Boards, budgets & progress' },
  { icon: ListChecks, name: 'Tasks', desc: 'Assign, prioritise & log time' },
  { icon: Wallet, name: 'Payroll', desc: 'Salary breakdowns & payslips' },
  { icon: Receipt, name: 'Finance', desc: 'Expense requests & approvals' },
  { icon: Megaphone, name: 'Campaigns', desc: 'Marketing spend & results' },
  { icon: Target, name: 'Leads', desc: 'CRM pipeline by stage' },
  { icon: Boxes, name: 'Assets', desc: 'Inventory & assignment' },
  { icon: Palette, name: 'Design Library', desc: 'Versioned brand assets' },
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Role-based access', desc: 'Five roles with a granular module matrix, enforced on the server and the UI.' },
  { icon: Layers, title: 'All-in-one', desc: 'HR, projects, finance, CRM, assets and culture — one login, one dashboard.' },
  { icon: MapPin, title: 'Built for GPSFDK', desc: 'Tailored to a GPS fleet-tracking business with tenders, telematics projects & more.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary">Sign in</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="badge-blue mb-4 inline-flex">Enterprise Resource Planning</span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            Run your entire business from <span className="text-brand-700">one dashboard</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            GPSFDK.com ERP brings people, projects, tenders, finance and your CRM together — with role-based
            access designed for a modern GPS fleet-tracking company.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary px-6 py-3 text-base">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">Everything your team needs</h2>
        <p className="mt-2 text-center text-gray-500">13+ integrated modules, one source of truth.</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((m) => (
            <div key={m.name} className="card-pad transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <m.icon size={20} />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{m.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="card-pad">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white">
                <h.icon size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{h.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-800">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to streamline GPSFDK?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Create your account and explore a role-aware workspace in seconds.
          </p>
          <Link to="/register" className="btn mt-7 bg-white px-6 py-3 text-base text-brand-800 hover:bg-brand-50">
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} GPSFDK.com · Enterprise Resource Planning</p>
        </div>
      </footer>
    </div>
  );
}
