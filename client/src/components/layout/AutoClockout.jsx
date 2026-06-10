import { useEffect, useRef } from 'react';
import api from '../../api/client';
import { sendAutoClockout } from '../../lib/attendance';

// Mounted once inside the authenticated app shell. While the user is clocked in,
// it sends a heartbeat so the server knows the app is still open; when the window
// is closed it fires a best-effort clock-out. Closing the app therefore ends the
// session — the user must clock in again next time they open it.
export default function AutoClockout() {
  const clockedIn = useRef(false);

  useEffect(() => {
    let alive = true;

    const beat = async () => {
      try {
        const { data } = await api.post('/attendance/heartbeat');
        if (alive) clockedIn.current = !!data?.clockedIn;
      } catch {
        /* ignore */
      }
    };
    beat();
    const id = setInterval(beat, 25000);
    window.addEventListener('attendance-changed', beat);

    const onHide = () => {
      if (clockedIn.current) sendAutoClockout();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('attendance-changed', beat);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);

  return null;
}
