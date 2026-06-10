// Grouped sidebar navigation. Each item is gated by its access-matrix module;
// items the role cannot access are filtered out, producing role-specific menus.
import {
  LayoutDashboard,
  Users,
  Clock,
  Timer,
  MessagesSquare,
  CalendarDays,
  FolderKanban,
  ListChecks,
  FileText,
  Wallet,
  Receipt,
  Megaphone,
  Target,
  Boxes,
  Palette,
  BarChart3,
  Settings,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: null },
      { label: 'Chat', path: '/chat', icon: MessagesSquare, module: null },
    ],
  },
  {
    group: 'People',
    items: [
      { label: 'Employees', path: '/employees', icon: Users, module: 'employees' },
      { label: 'Attendance', path: '/attendance', icon: Clock, module: 'attendance' },
      { label: 'Work Hours', path: '/work-hours', icon: Timer, module: 'attendance' },
      { label: 'Leaves', path: '/leaves', icon: CalendarDays, module: 'leaves' },
    ],
  },
  {
    group: 'Work',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban, module: 'projects' },
      { label: 'Tasks', path: '/tasks', icon: ListChecks, module: 'tasks' },
    ],
  },
  {
    group: 'Business',
    items: [
      { label: 'Tenders', path: '/tenders', icon: FileText, module: 'tenders' },
      { label: 'Campaigns', path: '/campaigns', icon: Megaphone, module: 'campaigns' },
      { label: 'Leads', path: '/leads', icon: Target, module: 'leads' },
    ],
  },
  {
    group: 'Finance & Assets',
    items: [
      { label: 'Finance', path: '/finance', icon: Receipt, module: 'finance' },
      { label: 'Payroll', path: '/payroll', icon: Wallet, module: 'payroll' },
      { label: 'Assets', path: '/assets', icon: Boxes, module: 'assets' },
    ],
  },
  {
    group: 'Creative',
    items: [{ label: 'Design Library', path: '/design-library', icon: Palette, module: 'design_library' }],
  },
  {
    group: 'Insights',
    items: [{ label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' }],
  },
  {
    group: 'Admin',
    items: [{ label: 'Settings', path: '/settings', icon: Settings, module: 'settings' }],
  },
];
