// Force the process timezone to India (Asia/Kolkata) so all server-side date math
// — attendance "today" window, check-in time, and the "Late" comparison — is
// correct regardless of where the server runs (Render runs in UTC). Node re-reads
// process.env.TZ for Date operations, and this module is imported before anything
// that touches Date. Override with a TZ env var if ever needed.
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
