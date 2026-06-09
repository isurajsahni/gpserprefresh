// Builds a Mongoose filter that scopes a query to what the role is allowed to see,
// based on the access value from the matrix (true | 'view' | 'self' | 'team' |
// 'assigned' | 'edit' | 'request' | 'approve').

// Owner field used for 'self' / 'request' scoping per module.
const OWNER_FIELD = {
  attendance: 'employee',
  leaves: 'employee',
  finance: 'employee',
  payroll: 'employee',
  tasks: 'assignee',
  campaigns: 'assignedTo',
  leads: 'assignedTo',
};

export function buildScope(module, access, userId) {
  // Full / read-all / approve / edit see everything.
  if (access === true || access === 'view' || access === 'team' || access === 'approve' || access === 'edit') {
    return {};
  }

  // Projects: assigned == assignee on the project or its manager.
  if (module === 'projects' && access === 'assigned') {
    return { $or: [{ assignees: userId }, { manager: userId }] };
  }

  if (access === 'assigned') {
    const field = OWNER_FIELD[module] || 'assignee';
    return { [field]: userId };
  }

  if (access === 'self' || access === 'request') {
    const field = OWNER_FIELD[module] || 'employee';
    return { [field]: userId };
  }

  return {};
}

// True when the role only sees its own records (used to enforce ownership on writes).
export function isOwnerScoped(module, access) {
  return access === 'self' || access === 'request' || access === 'assigned';
}
