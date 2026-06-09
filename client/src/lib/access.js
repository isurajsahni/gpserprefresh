// Client mirror of the backend access matrix (server is the source of truth;
// this drives sidebar/menu gating and conditional UI). Kept in sync with
// server/src/config/accessMatrix.js.

export const ROLES = ['super_admin', 'web_developer', 'designer', 'marketing', 'operation'];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  web_developer: 'Web Developer',
  designer: 'Designer',
  marketing: 'Marketing',
  operation: 'Operation Management',
};

export const ACCESS_MATRIX = {
  employees:      { super_admin: true, web_developer: false, designer: false, marketing: false, operation: 'view' },
  attendance:     { super_admin: true, web_developer: 'self', designer: 'self', marketing: 'self', operation: 'team' },
  leaves:         { super_admin: true, web_developer: 'self', designer: 'self', marketing: 'self', operation: 'team' },
  tenders:        { super_admin: true, web_developer: false, designer: false, marketing: 'edit', operation: true },
  projects:       { super_admin: true, web_developer: 'assigned', designer: 'assigned', marketing: 'assigned', operation: true },
  tasks:          { super_admin: true, web_developer: 'assigned', designer: 'assigned', marketing: 'assigned', operation: true },
  payroll:        { super_admin: true, web_developer: false, designer: false, marketing: false, operation: 'view' },
  finance:        { super_admin: true, web_developer: 'request', designer: 'request', marketing: 'request', operation: 'approve' },
  campaigns:      { super_admin: true, web_developer: false, designer: false, marketing: true, operation: false },
  leads:          { super_admin: true, web_developer: false, designer: false, marketing: true, operation: false },
  assets:         { super_admin: true, web_developer: false, designer: false, marketing: false, operation: true },
  design_library: { super_admin: true, web_developer: false, designer: true, marketing: false, operation: false },
  reports:        { super_admin: true, web_developer: false, designer: false, marketing: false, operation: true },
  settings:       { super_admin: true, web_developer: false, designer: false, marketing: false, operation: false },
  notifications:  { super_admin: true, web_developer: true, designer: true, marketing: true, operation: true },
  profile:        { super_admin: true, web_developer: true, designer: true, marketing: true, operation: true },
};

export function getAccess(module, role) {
  return ACCESS_MATRIX[module]?.[role] ?? false;
}

export function hasAccess(module, role) {
  return getAccess(module, role) !== false;
}

// Can the role write (anything other than no-access or read-only 'view')?
export function canWrite(module, role) {
  const a = getAccess(module, role);
  return a !== false && a !== 'view';
}
