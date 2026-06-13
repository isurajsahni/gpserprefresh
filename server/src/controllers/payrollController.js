import { Payroll } from '../models/Payroll.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canWrite } from '../config/accessMatrix.js';

// POST /api/payroll/generate  { month: "YYYY-MM" }
// Creates draft payslips for every active employee (with a salary set) who
// doesn't already have one for the month, using a standard salary breakdown.
export const generatePayroll = asyncHandler(async (req, res) => {
  if (!canWrite('payroll', req.auth.role)) throw new ApiError(403, 'No write permission');

  const month = (req.body.month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new ApiError(400, 'Provide a month as YYYY-MM');

  const employees = await User.find({ status: { $ne: 'Inactive' } }).select('salary');
  const existing = await Payroll.find({ month }).select('employee');
  const done = new Set(existing.map((e) => String(e.employee)));

  let created = 0;
  let skipped = 0;
  for (const e of employees) {
    if (done.has(String(e._id)) || !(e.salary > 0)) {
      skipped++;
      continue;
    }
    const salary = e.salary;
    const basic = Math.round(salary * 0.5);
    const hra = Math.round(salary * 0.2);
    const da = Math.round(salary * 0.1);
    const allowances = salary - basic - hra - da; // remainder so components sum to salary
    const pf = Math.round(basic * 0.12);
    const gross = basic + hra + da + allowances;
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    // gross/netPay are filled by the model's pre-save hook.
    await Payroll.create({ employee: e._id, month, basic, hra, da, allowances, pf, esi, tds: 0 });
    created++;
  }

  res.status(201).json({ month, created, skipped });
});
