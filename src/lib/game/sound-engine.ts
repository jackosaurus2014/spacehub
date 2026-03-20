// ─── Space Tycoon: Sound Engine (Web Audio API Synthesizer) ─────────────────
// All sounds generated at runtime via OscillatorNode — zero file downloads.

const STORAGE_KEY = 'spacetycoon_sound';

type SoundName =
  | 'click'
  | 'build_start'
  | 'build_complete'
  | 'research_start'
  | 'research_complete'
  | 'location_unlock'
  | 'milestone'
  | 'tick'
  | 'error'
  | 'money'
  | 'notification'
  | 'trade'
  | 'rival_overtake'
  | 'ambient_ping';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.3;

/** Initialize audio context (must be called after user interaction) */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = _volume;
      masterGain.connect(audioCtx.destination);

      // Load saved preferences
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const prefs = JSON.parse(saved);
          _muted = prefs.muted ?? false;
          _volume = prefs.volume ?? 0.3;
          if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
        }
      } catch { /* ignore */ }
    } catch {
      return null;
    }
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Play a short oscillator tone */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  opts?: {
    freqEnd?: number;
    delay?: number;
    gainStart?: number;
    gainEnd?: number;
    detune?: number;
  }
) {
  const ctx = getContext();
  if (!ctx || !masterGain || _muted) return;

  const now = ctx.currentTime + (opts?.delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (opts?.freqEnd) {
    osc.frequency.linearRampToValueAtTime(opts.freqEnd, now + duration);
  }
  if (opts?.detune) {
    osc.detune.setValueAtTime(opts.detune, now);
  }

  gain.gain.setValueAtTime(opts?.gainStart ?? 0.3, now);
  gain.gain.exponentialRampToValueAtTime(opts?.gainEnd ?? 0.001, now + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + duration);
}

/** Play a chord (multiple tones) */
function playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', gainStart = 0.15) {
  frequencies.forEach((f, i) => {
    playTone(f, duration, type, { delay: i * 0.02, gainStart });
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function playSound(name: SoundName): void {
  switch (name) {
    case 'click':
      playTone(800, 0.05, 'sine', { gainStart: 0.2 });
      break;

    case 'build_start':
      playTone(200, 0.2, 'sine', { freqEnd: 600, gainStart: 0.25 });
      break;

    case 'build_complete':
      // Triumphant C major chord
      playChord([261.6, 329.6, 392.0], 0.4, 'sine', 0.2);
      break;

    case 'research_start':
      playTone(1200, 0.1, 'square', { freqEnd: 800, gainStart: 0.1 });
      playTone(900, 0.1, 'square', { delay: 0.08, freqEnd: 1400, gainStart: 0.08 });
      break;

    case 'research_complete':
      // Ascending arpeggio C-E-G-C
      [261.6, 329.6, 392.0, 523.2].forEach((f, i) => {
        playTone(f, 0.3, 'sine', { delay: i * 0.1, gainStart: 0.2 });
      });
      break;

    case 'location_unlock':
      playTone(100, 0.5, 'sine', { freqEnd: 400, gainStart: 0.3 });
      playTone(150, 0.5, 'triangle', { freqEnd: 300, delay: 0.1, gainStart: 0.15 });
      break;

    case 'milestone':
      // Major chord with shimmer
      playChord([261.6, 329.6, 392.0, 523.2], 0.8, 'sine', 0.15);
      playTone(1046.5, 0.6, 'triangle', { delay: 0.2, gainStart: 0.1 });
      break;

    case 'tick':
      playTone(2000, 0.01, 'sine', { gainStart: 0.05 });
      break;

    case 'error':
      playTone(100, 0.08, 'sine', { gainStart: 0.2 });
      break;

    case 'money':
      playTone(4000, 0.03, 'triangle', { gainStart: 0.1 });
      break;

    case 'notification':
      // Gentle bell — two triangle tones, distinct from other sounds
      playTone(1500, 0.15, 'triangle', { gainStart: 0.12 });
      playTone(2000, 0.15, 'triangle', { delay: 0.1, gainStart: 0.1 });
      break;

    case 'trade':
      // Ka-ching double tap
      playTone(3000, 0.04, 'triangle', { gainStart: 0.15 });
      playTone(3500, 0.04, 'triangle', { delay: 0.06, gainStart: 0.12 });
      break;

    case 'rival_overtake':
      // Tense two-note descending motif
      playTone(600, 0.15, 'sawtooth', { freqEnd: 400, gainStart: 0.08 });
      playTone(500, 0.2, 'sawtooth', { delay: 0.12, freqEnd: 300, gainStart: 0.06 });
      break;

    case 'ambient_ping':
      // Subtle ethereal ping for atmosphere
      playTone(1200, 0.4, 'sine', { freqEnd: 800, gainStart: 0.03 });
      break;
  }
}

export function isMuted(): boolean {
  return _muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  if (masterGain) {
    masterGain.gain.value = _muted ? 0 : _volume;
  }
  savePrefs();
  return _muted;
}

export function setVolume(vol: number): void {
  _volume = Math.max(0, Math.min(1, vol));
  if (masterGain && !_muted) {
    masterGain.gain.value = _volume;
  }
  savePrefs();
}

export function getVolume(): number {
  return _volume;
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: _muted, volume: _volume }));
  } catch { /* ignore */ }
}

/** Initialize audio on first user interaction */
export function initAudio(): void {
  getContext();
}

// ─── Ambient Audio System ───────────────────────────────────────────────────

let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let ambientPlaying = false;
let ambientTimer: ReturnType<typeof setTimeout> | null = null;

/** Start ambient space soundscape — low drones + occasional shimmer */
export function startAmbient(): void {
  const ctx = getContext();
  if (!ctx || !masterGain || ambientPlaying || _muted) return;

  ambientPlaying = true;

  // Base drone (40-55Hz sine, very quiet)
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(45, ctx.currentTime);
  droneGain.gain.setValueAtTime(0, ctx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 3); // Fade in over 3s
  droneOsc.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start();
  ambientNodes.push({ osc: droneOsc, gain: droneGain });

  // Slow LFO on drone frequency
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.03, ctx.currentTime); // Very slow: 1 cycle per ~33 seconds
  lfoGain.gain.setValueAtTime(8, ctx.currentTime); // Modulates drone by ±8Hz
  lfo.connect(lfoGain);
  lfoGain.connect(droneOsc.frequency);
  lfo.start();

  // Harmonic pad (110Hz + 165Hz, even quieter)
  const padOsc1 = ctx.createOscillator();
  const padOsc2 = ctx.createOscillator();
  const padGain = ctx.createGain();
  padOsc1.type = 'sine';
  padOsc1.frequency.setValueAtTime(110, ctx.currentTime);
  padOsc2.type = 'sine';
  padOsc2.frequency.setValueAtTime(165, ctx.currentTime);
  padGain.gain.setValueAtTime(0, ctx.currentTime);
  padGain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 5);
  padOsc1.connect(padGain);
  padOsc2.connect(padGain);
  padGain.connect(masterGain);
  padOsc1.start();
  padOsc2.start();
  ambientNodes.push({ osc: padOsc1, gain: padGain });
  ambientNodes.push({ osc: padOsc2, gain: padGain });

  // Random shimmer pings every 15-40 seconds
  function scheduleShimmer() {
    if (!ambientPlaying) return;
    const delay = 15000 + Math.random() * 25000;
    ambientTimer = setTimeout(() => {
      if (!ambientPlaying || _muted) { scheduleShimmer(); return; }
      playSound('ambient_ping');
      scheduleShimmer();
    }, delay);
  }
  scheduleShimmer();
}

/** Stop ambient audio with fade-out */
export function stopAmbient(): void {
  const ctx = getContext();
  if (!ctx) return;

  ambientPlaying = false;
  if (ambientTimer) { clearTimeout(ambientTimer); ambientTimer = null; }

  for (const node of ambientNodes) {
    try {
      node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        try { node.osc.stop(); node.osc.disconnect(); node.gain.disconnect(); } catch { /* ignore */ }
      }, 1500);
    } catch { /* ignore */ }
  }
  ambientNodes = [];
}

export function isAmbientPlaying(): boolean {
  return ambientPlaying;
}

/** Toggle ambient on/off */
export function toggleAmbient(): boolean {
  if (ambientPlaying) {
    stopAmbient();
  } else {
    startAmbient();
  }
  return ambientPlaying;
}
