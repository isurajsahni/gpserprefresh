import crypto from 'crypto';

// Generates a readable but reasonably strong temporary password,
// e.g. "Gpsfdk-7K9m2Q". Avoids ambiguous chars.
export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += chars[crypto.randomInt(0, chars.length)];
  }
  return `Gpsfdk-${body}`;
}

// Auto employee ID like "GPS-7F3K9Q" — unique enough for display/login reference.
export function generateEmployeeId() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `GPS-${rand}`;
}
