import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

// Indian Rupee with Indian digit grouping (lakh/crore).
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '₹0';
  return inr.format(value);
}

// Compact Indian currency (₹1.2L, ₹4.8Cr) for tight spaces.
export function formatCurrencyShort(value) {
  if (value == null || isNaN(value)) return '₹0';
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return inr.format(value);
}

function toDate(value) {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d ? format(d, "dd MMM yyyy, h:mm a") : '—';
}

export function timeAgo(value) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}
