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
  | 'money';

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
