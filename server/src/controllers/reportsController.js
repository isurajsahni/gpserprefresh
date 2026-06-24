import { Project } from '../models/Project.js';
import { Expense } from '../models/Expense.js';
import { Lead } from '../models/Lead.js';
import { Campaign } from '../models/Campaign.js';
import { Tender } from '../models/Tender.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { Payroll } from '../models/Payroll.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/reports/overview — cross-module analytics for the Reports page.
export const reportsOverview = asyncHandler(async (_req, res) => {
  const [projects, expenses, leads, campaigns, tenders, users] = await Promise.all([
    Project.find(),
    Expense.find(),
    Lead.find(),
    Campaign.find(),
    Tender.find(),
    User.find({ status: { $ne: 'Inactive' } }),
  ]);

  // Budget vs spent per project.
  const budgetVsSpent = projects.map((p) => ({
    name: p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name,
    budget: p.budget,
    spent: p.spent,
  }));

  // Expenses by category.
  const expenseByCategory = Object.values(
    expenses.reduce((acc, e) => {
      acc[e.category] = acc[e.category] || { name: e.category, value: 0 };
      acc[e.category].value += e.amount;
      return acc;
    }, {})
  );

  // Lead pipeline by status.
  const leadFunnel = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].map((status) => ({
    name: status,
    value: leads.filter((l) => l.status === status).length,
  }));

  // Tender value by category.
  const tenderByCategory = Object.values(
    tenders.reduce((acc, t) => {
      acc[t.category] = acc[t.category] || { name: t.category, value: 0 };
      acc[t.category].value += t.value;
      return acc;
    }, {})
  );

  // Campaign performance.
  const campaignPerformance = campaigns.map((c) => ({
    name: c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name,
    spent: c.spent,
    leads: c.leads,
  }));

  // Headcount by department.
  const headcountByDept = Object.values(
    users.reduce((acc, u) => {
      acc[u.department] = acc[u.department] || { name: u.department, value: 0 };
      acc[u.department].value += 1;
      return acc;
    }, {})
  );

  // Totals.
  const totals = {
    totalBudget: projects.reduce((s, p) => s + p.budget, 0),
    totalSpent: projects.reduce((s, p) => s + p.spent, 0),
    pipelineValue: leads.filter((l) => !['Converted', 'Lost'].includes(l.status)).reduce((s, l) => s + l.value, 0),
    tenderValue: tenders.reduce((s, t) => s + t.value, 0),
    headcount: users.length,
  };

  res.json({
    budgetVsSpent,
    expenseByCategory,
    leadFunnel,
    tenderByCategory,
    campaignPerformance,
    headcountByDept,
    totals,
  });
});

// GET /api/reports/attendance — monthly attendance summary.
export const attendanceReport = asyncHandler(async (_req, res) => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const records = await Attendance.find({ date: { $gte: start } });
  const summary = ['Present', 'Absent'].map((status) => ({
    name: status,
    value: records.filter((r) => r.status === status).length,
  }));
  res.json({ summary, totalRecords: records.length });
});
