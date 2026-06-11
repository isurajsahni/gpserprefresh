import { useEffect, useRef } from 'react';
import api from '../../api/client';

// Mounted once inside the authenticated app shell. While the user is clocked in,
// it sends a heartbeat every 25s so the server knows the app is still open.
//
// Closing the whole tab/window stops the heartbeat permanently, so the server
// marks the session stale (~75s) and clocks the user out automatically. A page
// refresh reloads and resumes the heartbeat almost immediately — well within the
// stale window — so a refresh does NOT end the session.
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
    const id = setInterval(beat, 20000);
    window.addEventListener('attendance-changed', beat);
    // Browsers throttle/freeze timers in background tabs — beat the moment the
    // tab becomes visible or regains focus so the session is refreshed promptly.
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', beat);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('attendance-changed', beat);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', beat);
    };
  }, []);

  return null;
}
