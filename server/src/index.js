import 'dotenv/config';
import './config/timezone.js'; // must precede any Date usage — sets TZ to Asia/Kolkata
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { sweepStaleSessions } from './controllers/workflowController.js';

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Copy server/.env.example to server/.env');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Copy server/.env.example to server/.env');
    process.exit(1);
  }

  try {
    await connectDB(process.env.MONGODB_URI);
    const app = createApp();
    app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));

    // Auto-clock-out abandoned sessions (closed app / stale heartbeat) every minute.
    setInterval(() => sweepStaleSessions().catch((e) => console.error('sweep error:', e.message)), 60000);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
