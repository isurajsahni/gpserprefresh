// Maps a status/priority string to a design-system badge class.
const MAP = {
  // generic statuses
  Active: 'badge-green',
  Completed: 'badge-green',
  Approved: 'badge-green',
  Paid: 'badge-green',
  Present: 'badge-green',
  Available: 'badge-green',
  Converted: 'badge-green',
  Awarded: 'badge-green',
  Qualified: 'badge-blue',

  Pending: 'badge-yellow',
  'On Leave': 'badge-yellow',
  'In Progress': 'badge-blue',
  'Under Review': 'badge-purple',
  'Under Evaluation': 'badge-purple',
  Draft: 'badge-gray',
  'To Do': 'badge-gray',
  New: 'badge-blue',
  Contacted: 'badge-yellow',
  Published: 'badge-blue',
  Assigned: 'badge-blue',
  Late: 'badge-yellow',

  Rejected: 'badge-red',
  Absent: 'badge-red',
  Lost: 'badge-red',
  Inactive: 'badge-gray',
  Closed: 'badge-gray',

  // priorities
  Low: 'badge-gray',
  Medium: 'badge-blue',
  High: 'badge-yellow',
  Critical: 'badge-red',

  // notice priority
  urgent: 'badge-red',
  normal: 'badge-gray',
};

export function badgeClass(status) {
  return MAP[status] || 'badge-gray';
}

export const CHART_COLORS = ['#0b5d3b', '#0e7048', '#b8902e', '#5b8c6e', '#e4d09a', '#876820', '#a8a294', '#0d2a1c'];
