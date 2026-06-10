// Lightweight notification chime via the Web Audio API — no audio file to bundle,
// works offline, and stays crisp at any volume. Used for incoming chat messages.

let ctx = null;
let unlocked = false;
const MUTE_KEY = 'chatSoundMuted';

export function isChatSoundMuted() {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setChatSoundMuted(muted) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

// Actually schedule + play the two notes. The context must be running by now.
function beep(c) {
  const master = c.createGain();
  master.gain.value = 0.5;
  master.connect(c.destination);

  const now = c.currentTime;
  const notes = [
    { freq: 880, start: 0, dur: 0.14 },      // A5
    { freq: 1318.5, start: 0.11, dur: 0.2 }, // E6
  ];
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = n.freq;
    const t0 = now + n.start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
}

// Browsers block audio until the user interacts with the page, and they suspend
// the context when the tab loses focus. Resume eagerly on gestures/focus so a
// chime fired from a background poll actually plays.
function resumeCtx() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function installUnlock() {
  if (typeof window === 'undefined' || unlocked) return;
  unlocked = true;
  const onGesture = () => resumeCtx();
  window.addEventListener('pointerdown', onGesture);
  window.addEventListener('keydown', onGesture);
  window.addEventListener('focus', resumeCtx);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeCtx();
  });
}
installUnlock();

// A soft two-note "ding" reminiscent of a messaging app.
export function playChatChime() {
  if (isChatSoundMuted()) return;
  const c = getCtx();
  if (!c) return;
  // If the context is suspended (e.g. tab was backgrounded), resume first and
  // only schedule the notes once it's actually running — otherwise they're
  // scheduled against a frozen clock and never sound.
  if (c.state === 'suspended') {
    c.resume().then(() => beep(c)).catch(() => {});
  } else {
    beep(c);
  }
}
