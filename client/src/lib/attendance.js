import { baseURL } from '../api/client';

// Best-effort immediate clock-out fired when the window/tab is closing. Uses
// fetch keepalive so the request can outlive the page. If it doesn't make it
// (e.g. cross-origin during unload), the server's heartbeat-staleness sweep
// finalizes the session within ~75s anyway.
export function sendAutoClockout() {
  try {
    const token = localStorage.getItem('token');
    fetch(`${baseURL}/attendance/checkout?auto=1`, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  } catch {
    /* ignore — staleness sweep is the safety net */
  }
}
