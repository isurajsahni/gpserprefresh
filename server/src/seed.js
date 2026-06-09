import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Task } from './models/Task.js';
import { Tender } from './models/Tender.js';
import { Leave } from './models/Leave.js';
import { Attendance } from './models/Attendance.js';
import { Expense } from './models/Expense.js';
import { Campaign } from './models/Campaign.js';
import { Lead } from './models/Lead.js';
import { Asset } from './models/Asset.js';
import { DesignAsset } from './models/DesignAsset.js';
import { Notification } from './models/Notification.js';
import { Payroll } from './models/Payroll.js';
import { Notice } from './models/Notice.js';
import { Recognition } from './models/Recognition.js';
import { GoodMorningMessage } from './models/GoodMorningMessage.js';
import { Holiday } from './models/Holiday.js';

const NOW = new Date();
const YEAR = NOW.getFullYear();
const MONTH = String(NOW.getMonth() + 1).padStart(2, '0');
const PERIOD = `${YEAR}-${MONTH}`;
const PASSWORD = 'password123';

const daysAgo = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  await connectDB(process.env.MONGODB_URI);
  console.log('🌱 Clearing existing data…');

  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Tender.deleteMany({}),
    Leave.deleteMany({}),
    Attendance.deleteMany({}),
    Expense.deleteMany({}),
    Campaign.deleteMany({}),
    Lead.deleteMany({}),
    Asset.deleteMany({}),
    DesignAsset.deleteMany({}),
    Notification.deleteMany({}),
    Payroll.deleteMany({}),
    Notice.deleteMany({}),
    Recognition.deleteMany({}),
    GoodMorningMessage.deleteMany({}),
    Holiday.deleteMany({}),
  ]);

  const passwordHash = await User.hashPassword(PASSWORD);

  // ---- Users (8 across all 5 roles) ----
  console.log('👥 Creating users…');
  const usersData = [
    { name: 'Suraj Sahni', email: 'admin@gpsfdk.com', role: 'super_admin', department: 'Management', salary: 180000, phone: '+91 98100 11001' },
    { name: 'Arjun Mehta', email: 'arjun@gpsfdk.com', role: 'web_developer', department: 'Engineering', salary: 95000, phone: '+91 98100 11002' },
    { name: 'Neha Verma', email: 'neha@gpsfdk.com', role: 'web_developer', department: 'Engineering', salary: 88000, phone: '+91 98100 11003' },
    { name: 'Priya Sharma', email: 'priya@gpsfdk.com', role: 'designer', department: 'Design', salary: 72000, phone: '+91 98100 11004' },
    { name: 'Rahul Nair', email: 'rahul@gpsfdk.com', role: 'designer', department: 'Design', salary: 68000, phone: '+91 98100 11005' },
    { name: 'Sneha Iyer', email: 'sneha@gpsfdk.com', role: 'marketing', department: 'Marketing', salary: 75000, phone: '+91 98100 11006' },
    { name: 'Vikram Singh', email: 'vikram@gpsfdk.com', role: 'marketing', department: 'Marketing', salary: 70000, phone: '+91 98100 11007' },
    { name: 'Anita Desai', email: 'anita@gpsfdk.com', role: 'operation', department: 'Operations', salary: 110000, phone: '+91 98100 11008' },
  ];

  const users = await User.insertMany(
    usersData.map((u, i) => ({
      ...u,
      passwordHash,
      status: 'Active',
      joinDate: daysAgo(400 - i * 30),
      avatar: '',
    }))
  );

  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const admin = byEmail['admin@gpsfdk.com'];
  const operation = byEmail['anita@gpsfdk.com'];
  const devs = users.filter((u) => u.role === 'web_developer');
  const designers = users.filter((u) => u.role === 'designer');
  const marketers = users.filter((u) => u.role === 'marketing');

  // Reporting managers.
  await User.updateMany({ role: { $in: ['web_developer', 'designer'] } }, { reportingManager: admin._id });
  await User.updateMany({ role: 'marketing' }, { reportingManager: operation._id });

  // ---- Projects (5, GPS/fleet themed) ----
  console.log('📁 Creating projects…');
  const projects = await Project.insertMany([
    {
      name: 'FleetTrack Live Dashboard',
      description: 'Real-time vehicle tracking dashboard with live maps, geofencing and trip replay for fleet operators.',
      status: 'In Progress',
      priority: 'High',
      startDate: daysAgo(60),
      endDate: daysAhead(30),
      assignees: [devs[0]._id, devs[1]._id, designers[0]._id],
      manager: admin._id,
      budget: 1800000,
      spent: 1120000,
      progress: 62,
      tags: ['gps', 'react', 'maps'],
    },
    {
      name: 'OBD-II Telematics Firmware',
      description: 'Firmware for OBD-II GPS trackers reporting speed, fuel and engine diagnostics over MQTT.',
      status: 'In Progress',
      priority: 'Critical',
      startDate: daysAgo(90),
      endDate: daysAhead(15),
      assignees: [devs[1]._id],
      manager: admin._id,
      budget: 2500000,
      spent: 1950000,
      progress: 78,
      tags: ['iot', 'firmware', 'telematics'],
    },
    {
      name: 'Driver Behaviour Mobile App',
      description: 'Android/iOS app scoring driver behaviour — harsh braking, over-speeding and idling alerts.',
      status: 'To Do',
      priority: 'Medium',
      startDate: daysAhead(7),
      endDate: daysAhead(90),
      assignees: [devs[0]._id, designers[1]._id],
      manager: admin._id,
      budget: 1200000,
      spent: 0,
      progress: 5,
      tags: ['mobile', 'driver-safety'],
    },
    {
      name: 'Cold-Chain Temperature Monitoring',
      description: 'GPS + temperature sensor integration for refrigerated logistics with SLA breach alerts.',
      status: 'Under Review',
      priority: 'High',
      startDate: daysAgo(120),
      endDate: daysAhead(5),
      assignees: [devs[1]._id, designers[0]._id],
      manager: operation._id,
      budget: 950000,
      spent: 880000,
      progress: 90,
      tags: ['cold-chain', 'sensors'],
    },
    {
      name: 'Fleet Maintenance Scheduler',
      description: 'Predictive maintenance scheduling based on odometer and engine-hour data from trackers.',
      status: 'Completed',
      priority: 'Low',
      startDate: daysAgo(200),
      endDate: daysAgo(20),
      assignees: [devs[0]._id],
      manager: admin._id,
      budget: 600000,
      spent: 540000,
      progress: 100,
      tags: ['maintenance', 'analytics'],
    },
  ]);

  // ---- Tasks (10) ----
  console.log('✅ Creating tasks…');
  const taskStatuses = ['To Do', 'In Progress', 'Under Review', 'Completed'];
  const tasksData = [
    { title: 'Build live map clustering for 5k vehicles', project: 0, assignee: devs[0]._id, status: 'In Progress', priority: 'High', timeLogged: 18 },
    { title: 'Geofence entry/exit webhook API', project: 0, assignee: devs[1]._id, status: 'Under Review', priority: 'High', timeLogged: 12 },
    { title: 'Design trip-replay timeline UI', project: 0, assignee: designers[0]._id, status: 'In Progress', priority: 'Medium', timeLogged: 9 },
    { title: 'MQTT reconnect & buffering on signal loss', project: 1, assignee: devs[1]._id, status: 'In Progress', priority: 'Critical', timeLogged: 22 },
    { title: 'Fuel-theft detection algorithm', project: 1, assignee: devs[1]._id, status: 'To Do', priority: 'High', timeLogged: 0 },
    { title: 'Driver score onboarding screens', project: 2, assignee: designers[1]._id, status: 'To Do', priority: 'Medium', timeLogged: 0 },
    { title: 'Push-notification service for alerts', project: 2, assignee: devs[0]._id, status: 'To Do', priority: 'Medium', timeLogged: 0 },
    { title: 'Temperature SLA breach email alerts', project: 3, assignee: devs[1]._id, status: 'Under Review', priority: 'High', timeLogged: 15 },
    { title: 'Cold-chain dashboard widgets', project: 3, assignee: designers[0]._id, status: 'Completed', priority: 'Medium', timeLogged: 20 },
    { title: 'Maintenance reminder cron job', project: 4, assignee: devs[0]._id, status: 'Completed', priority: 'Low', timeLogged: 8 },
  ];
  await Task.insertMany(
    tasksData.map((t) => ({
      title: t.title,
      description: `${t.title} — part of ${projects[t.project].name}.`,
      project: projects[t.project]._id,
      assignee: t.assignee,
      status: t.status,
      priority: t.priority,
      timeLogged: t.timeLogged,
      dueDate: daysAhead(Math.floor(Math.random() * 30) - 5),
    }))
  );

  // ---- Tenders (6) ----
  console.log('📜 Creating tenders…');
  await Tender.insertMany([
    { title: 'State Transport GPS Fitment (12,000 buses)', client: 'State Road Transport Corp.', authority: 'Dept. of Transport', value: 48000000, category: 'Government', status: 'Under Evaluation', deadline: daysAhead(12), documents: 8, description: 'AIS-140 compliant GPS devices and VLT fitment for the entire state bus fleet.' },
    { title: 'Municipal Waste Fleet Tracking', client: 'Municipal Corporation', authority: 'Urban Local Body', value: 9500000, category: 'Government', status: 'Published', deadline: daysAhead(25), documents: 5, description: 'Live tracking and route-adherence monitoring for 600 garbage collection vehicles.' },
    { title: 'Logistics Major Telematics Rollout', client: 'BlueDart Express', authority: 'Private Procurement', value: 22000000, category: 'Private', status: 'Awarded', deadline: daysAgo(10), documents: 11, description: 'Telematics across 3,000 delivery vehicles with driver behaviour analytics.' },
    { title: 'University Bus Safety Tracking', client: 'Amity University', authority: 'Admin Office', value: 3200000, category: 'Education', status: 'Draft', deadline: daysAhead(40), documents: 2, description: 'Student safety tracking with parent SMS alerts for 80 campus buses.' },
    { title: 'Ambulance Fleet Live Tracking', client: 'State Health Mission', authority: 'Dept. of Health', value: 14500000, category: 'Healthcare', status: 'Under Evaluation', deadline: daysAhead(8), documents: 7, description: '108 ambulance live tracking with nearest-vehicle dispatch integration.' },
    { title: 'Cement Co. Mining Truck Tracking', client: 'UltraTech Cement', authority: 'Private Procurement', value: 6800000, category: 'Private', status: 'Closed', deadline: daysAgo(30), documents: 6, description: 'GPS + load-sensor tracking for mining haul trucks.' },
  ]);

  // ---- Leaves ----
  console.log('🏖️  Creating leaves…');
  await Leave.insertMany([
    { employee: devs[0]._id, type: 'Sick', from: daysAgo(3), to: daysAgo(2), days: 2, reason: 'Fever and rest', status: 'Approved', appliedOn: daysAgo(5) },
    { employee: designers[0]._id, type: 'Casual', from: daysAhead(5), to: daysAhead(6), days: 2, reason: 'Family function', status: 'Pending', appliedOn: daysAgo(1) },
    { employee: marketers[0]._id, type: 'Earned', from: daysAhead(10), to: daysAhead(14), days: 5, reason: 'Vacation', status: 'Pending', appliedOn: NOW },
    { employee: devs[1]._id, type: 'Casual', from: daysAgo(15), to: daysAgo(15), days: 1, reason: 'Personal work', status: 'Approved', appliedOn: daysAgo(18) },
    { employee: designers[1]._id, type: 'Sick', from: daysAhead(2), to: daysAhead(2), days: 1, reason: 'Doctor appointment', status: 'Pending', appliedOn: NOW },
  ]);

  // ---- Attendance (~25 records, last few days, several employees) ----
  console.log('🕒 Creating attendance…');
  const attendanceDocs = [];
  const workforce = [devs[0], devs[1], designers[0], marketers[0], operation];
  for (let d = 0; d < 5; d++) {
    for (const emp of workforce) {
      const day = daysAgo(d);
      day.setHours(0, 0, 0, 0);
      const isLate = Math.random() < 0.2;
      const absent = Math.random() < 0.08;
      attendanceDocs.push({
        employee: emp._id,
        date: day,
        checkIn: absent ? '' : isLate ? '09:48' : '09:1' + Math.floor(Math.random() * 9),
        checkOut: absent ? '' : '18:3' + Math.floor(Math.random() * 9),
        status: absent ? 'Absent' : isLate ? 'Late' : 'Present',
        hoursWorked: absent ? 0 : 8 + Math.round(Math.random() * 10) / 10,
      });
    }
  }
  await Attendance.insertMany(attendanceDocs);

  // ---- Expenses ----
  console.log('💸 Creating expenses…');
  await Expense.insertMany([
    { employee: devs[0]._id, title: 'AWS hosting — FleetTrack staging', amount: 42000, category: 'Infrastructure', status: 'Approved', receipt: true, date: daysAgo(8) },
    { employee: marketers[0]._id, title: 'Google Ads — Q2 fleet campaign', amount: 85000, category: 'Marketing', status: 'Pending', receipt: true, date: daysAgo(2) },
    { employee: devs[1]._id, title: 'JetBrains licenses (3 seats)', amount: 31500, category: 'Software', status: 'Approved', receipt: true, date: daysAgo(20) },
    { employee: designers[0]._id, title: 'Figma org plan annual', amount: 54000, category: 'Software', status: 'Pending', receipt: false, date: daysAgo(1) },
    { employee: operation._id, title: 'GPS device sample units (10)', amount: 68000, category: 'Operations', status: 'Approved', receipt: true, date: daysAgo(12) },
    { employee: marketers[1]._id, title: 'Trade show booth — Auto Expo', amount: 240000, category: 'Marketing', status: 'Rejected', receipt: true, date: daysAgo(30) },
  ]);

  // ---- Campaigns ----
  console.log('📣 Creating campaigns…');
  await Campaign.insertMany([
    { name: 'Fleet Owners LinkedIn Push', channel: 'LinkedIn', budget: 300000, spent: 184000, leads: 47, status: 'Active', startDate: daysAgo(20), endDate: daysAhead(10), assignedTo: marketers[0]._id },
    { name: 'AIS-140 Compliance Webinar', channel: 'Email', budget: 80000, spent: 80000, leads: 31, status: 'Completed', startDate: daysAgo(60), endDate: daysAgo(30), assignedTo: marketers[1]._id },
    { name: 'Google Search — GPS Tracker', channel: 'Google Ads', budget: 450000, spent: 220000, leads: 88, status: 'Active', startDate: daysAgo(15), endDate: daysAhead(20), assignedTo: marketers[0]._id },
    { name: 'Logistics Expo 2026', channel: 'Event', budget: 600000, spent: 0, leads: 0, status: 'Draft', startDate: daysAhead(30), endDate: daysAhead(33), assignedTo: marketers[1]._id },
  ]);

  // ---- Leads ----
  console.log('🎯 Creating leads…');
  await Lead.insertMany([
    { name: 'Sharma Logistics', contact: 'Ramesh Sharma', email: 'ramesh@sharmalogistics.in', phone: '+91 99200 22001', source: 'Website', status: 'Qualified', value: 1200000, assignedTo: marketers[0]._id, lastContact: daysAgo(2) },
    { name: 'GreenLine Travels', contact: 'Fatima Khan', email: 'ops@greenline.in', phone: '+91 99200 22002', source: 'Campaign', status: 'Contacted', value: 850000, assignedTo: marketers[0]._id, lastContact: daysAgo(4) },
    { name: 'Patel Cold Storage', contact: 'Nikhil Patel', email: 'nikhil@patelcold.in', phone: '+91 99200 22003', source: 'Referral', status: 'New', value: 1900000, assignedTo: marketers[1]._id, lastContact: daysAgo(1) },
    { name: 'Metro Cabs', contact: 'Sunita Rao', email: 'sunita@metrocabs.in', phone: '+91 99200 22004', source: 'LinkedIn', status: 'Converted', value: 2400000, assignedTo: marketers[0]._id, lastContact: daysAgo(10) },
    { name: 'Highway Movers', contact: 'Imran Sheikh', email: 'imran@highwaymovers.in', phone: '+91 99200 22005', source: 'Trade Show', status: 'Lost', value: 500000, assignedTo: marketers[1]._id, lastContact: daysAgo(25) },
    { name: 'AgroFresh Distribution', contact: 'Kavya Menon', email: 'kavya@agrofresh.in', phone: '+91 99200 22006', source: 'Website', status: 'Qualified', value: 1500000, assignedTo: marketers[1]._id, lastContact: daysAgo(3) },
  ]);

  // ---- Assets ----
  console.log('💻 Creating assets…');
  await Asset.insertMany([
    { name: 'MacBook Pro 14" M3', category: 'Laptop', serialNo: 'MBP-2026-001', assignedTo: devs[0]._id, status: 'Assigned', purchaseDate: daysAgo(300), value: 195000, condition: 'Good' },
    { name: 'Dell XPS 15', category: 'Laptop', serialNo: 'DXP-2026-002', assignedTo: devs[1]._id, status: 'Assigned', purchaseDate: daysAgo(250), value: 145000, condition: 'Good' },
    { name: 'Dell UltraSharp 27" Monitor', category: 'Monitor', serialNo: 'MON-2026-007', assignedTo: designers[0]._id, status: 'Assigned', purchaseDate: daysAgo(180), value: 38000, condition: 'Excellent' },
    { name: 'iPhone 15 (test device)', category: 'Mobile', serialNo: 'IPH-2026-011', assignedTo: null, status: 'Available', purchaseDate: daysAgo(120), value: 79000, condition: 'Good' },
    { name: 'Adobe Creative Cloud (5 seats)', category: 'Software', serialNo: 'ADB-CC-2026', assignedTo: designers[0]._id, status: 'Assigned', purchaseDate: daysAgo(90), value: 210000, condition: 'Active' },
    { name: 'Ergonomic Office Chair', category: 'Furniture', serialNo: 'FUR-2026-021', assignedTo: null, status: 'Available', purchaseDate: daysAgo(400), value: 18000, condition: 'Fair' },
    { name: 'Samsung Galaxy Tab (demo)', category: 'Mobile', serialNo: 'TAB-2026-014', assignedTo: marketers[0]._id, status: 'Assigned', purchaseDate: daysAgo(60), value: 45000, condition: 'Good' },
  ]);

  // ---- Design assets ----
  console.log('🎨 Creating design library…');
  await DesignAsset.insertMany([
    { name: 'GPSFDK Primary Logo', type: 'Logo', format: 'SVG', size: '24 KB', uploadedBy: designers[0]._id, version: 'v3.2', tags: ['brand', 'logo'], url: '#' },
    { name: 'FleetTrack Dashboard UI Kit', type: 'Template', format: 'FIG', size: '12 MB', uploadedBy: designers[0]._id, version: 'v2.0', tags: ['ui-kit', 'dashboard'], url: '#' },
    { name: 'Company Brochure 2026', type: 'Document', format: 'PDF', size: '4.5 MB', uploadedBy: designers[1]._id, version: 'v1.4', tags: ['marketing', 'print'], url: '#' },
    { name: 'GPS Device Render Pack', type: 'Image', format: 'PNG', size: '8.1 MB', uploadedBy: designers[1]._id, version: 'v1.0', tags: ['product', 'render'], url: '#' },
    { name: 'Map Marker Icon Set', type: 'Icons', format: 'SVG', size: '120 KB', uploadedBy: designers[0]._id, version: 'v1.1', tags: ['icons', 'maps'], url: '#' },
  ]);

  // ---- Payroll (current month, all users) ----
  console.log('🧾 Creating payroll…');
  const payrollDocs = users.map((u) => {
    const basic = Math.round(u.salary * 0.5);
    const hra = Math.round(u.salary * 0.2);
    const da = Math.round(u.salary * 0.1);
    const allowances = u.salary - basic - hra - da;
    const gross = u.salary;
    const pf = Math.round(basic * 0.12);
    const tds = Math.round(gross * 0.08);
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const netPay = gross - pf - tds - esi;
    return {
      employee: u._id,
      month: PERIOD,
      basic,
      hra,
      da,
      allowances,
      gross,
      pf,
      tds,
      esi,
      netPay,
      status: u.role === 'super_admin' ? 'Paid' : 'Pending',
      paidOn: u.role === 'super_admin' ? daysAgo(2) : null,
    };
  });
  await Payroll.insertMany(payrollDocs);

  // ---- Notices ----
  console.log('📌 Creating notices…');
  await Notice.insertMany([
    { title: 'AIS-140 Tender Submission Deadline', body: 'The State Transport GPS fitment tender closes in 12 days. All supporting documents must be finalised by the operations team this week.', postedBy: admin._id, priority: 'urgent', pinned: true, postedAt: daysAgo(1) },
    { title: 'Quarterly Town Hall — Friday 4 PM', body: 'Join the all-hands in the main conference room. Q2 roadmap and Employee of the Month awards will be announced.', postedBy: admin._id, priority: 'normal', pinned: true, postedAt: daysAgo(2) },
    { title: 'New Health Insurance Provider', body: 'HR has switched to a new group health insurance provider effective this month. Cards will be distributed shortly.', postedBy: operation._id, priority: 'normal', pinned: false, postedAt: daysAgo(6) },
  ]);

  // ---- Holidays (~10 Indian public holidays for current year) ----
  console.log('🎉 Creating holidays…');
  await Holiday.insertMany([
    { date: new Date(`${YEAR}-01-26`), name: 'Republic Day' },
    { date: new Date(`${YEAR}-03-14`), name: 'Holi' },
    { date: new Date(`${YEAR}-03-31`), name: 'Eid-ul-Fitr' },
    { date: new Date(`${YEAR}-04-14`), name: 'Dr. Ambedkar Jayanti' },
    { date: new Date(`${YEAR}-08-15`), name: 'Independence Day' },
    { date: new Date(`${YEAR}-08-27`), name: 'Ganesh Chaturthi' },
    { date: new Date(`${YEAR}-10-02`), name: 'Gandhi Jayanti' },
    { date: new Date(`${YEAR}-10-20`), name: 'Diwali' },
    { date: new Date(`${YEAR}-11-05`), name: 'Guru Nanak Jayanti' },
    { date: new Date(`${YEAR}-12-25`), name: 'Christmas' },
  ]);

  // ---- Recognition (EOM for current month + EOY) ----
  console.log('🏆 Creating recognition / leaderboards…');
  await Recognition.insertMany([
    { employee: devs[1]._id, period: PERIOD, points: 48, achievements: ['Critical firmware delivery', 'Zero production incidents', 'Best Thought of the Day'] },
    { employee: devs[0]._id, period: PERIOD, points: 42, achievements: ['Live map performance win', 'Mentored new joiner'] },
    { employee: designers[0]._id, period: PERIOD, points: 37, achievements: ['Dashboard UI revamp'] },
    { employee: marketers[0]._id, period: PERIOD, points: 33, achievements: ['88 leads from search campaign'] },
    { employee: operation._id, period: PERIOD, points: 29, achievements: ['Tender process streamlined'] },
    // EOY
    { employee: devs[0]._id, period: `${YEAR}`, points: 412, achievements: ['Employee of the Year nominee', 'Shipped 3 major projects'] },
    { employee: devs[1]._id, period: `${YEAR}`, points: 398, achievements: ['Telematics platform lead'] },
    { employee: designers[0]._id, period: `${YEAR}`, points: 356, achievements: ['Brand refresh 2026'] },
    { employee: marketers[0]._id, period: `${YEAR}`, points: 301, achievements: ['Pipeline growth 40%'] },
  ]);

  // ---- Good morning messages (today) ----
  console.log('🌅 Creating good-morning feed…');
  const todayStart = new Date();
  todayStart.setHours(8, 0, 0, 0);
  await GoodMorningMessage.insertMany([
    { user: devs[1]._id, message: 'Good morning team! "The road to success is always under construction." Let’s ship the firmware update today. 🚀', postedAt: new Date(todayStart.getTime() + 5 * 60000), earnedPoint: true },
    { user: designers[0]._id, message: 'Morning all! Great design is invisible — let’s make the dashboard effortless to use. ✨', postedAt: new Date(todayStart.getTime() + 25 * 60000), earnedPoint: false },
    { user: marketers[0]._id, message: 'Good morning! Every lead is a relationship. Let’s nurture ours today. 🤝', postedAt: new Date(todayStart.getTime() + 40 * 60000), earnedPoint: false },
  ]);

  // ---- Notifications ----
  console.log('🔔 Creating notifications…');
  await Notification.insertMany([
    { title: 'Tender deadline approaching', message: 'State Transport GPS Fitment tender closes in 12 days.', type: 'tender', recipient: null, read: false },
    { title: 'Town hall on Friday', message: 'Quarterly town hall at 4 PM. EOM awards announced.', type: 'announcement', recipient: null, read: false },
    { title: 'Leave request pending', message: 'Sneha Iyer applied for 5 days earned leave.', type: 'leave', recipient: admin._id, read: false },
    { title: 'Expense awaiting approval', message: 'Google Ads expense ₹85,000 needs your review.', type: 'expense', recipient: admin._id, read: false },
    { title: 'Task assigned to you', message: 'You have been assigned "Fuel-theft detection algorithm".', type: 'task', recipient: devs[1]._id, read: false },
    { title: 'Welcome to GPSFDK ERP', message: 'Your account is ready. Explore your dashboard.', type: 'announcement', recipient: null, read: true },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('────────────────────────────────────────');
  console.log('Demo accounts (password: ' + PASSWORD + ')');
  usersData.forEach((u) => console.log(`  ${u.role.padEnd(14)} ${u.email}`));
  console.log('────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
