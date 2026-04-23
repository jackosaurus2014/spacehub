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
let ambientRegion: string | null = null;

// Per-region ambient signature. Each row says: base drone frequency, pad
// interval in Hz, whether to add a high-frequency shimmer, whether to add
// gritty lowpass noise, and an optional hue for future visualization.
//
// Picked to match each body's real character:
//   Earth  — calm ops-room hum, warm midrange pad
//   Mars   — dry dust wind (noise-based)
//   Belt   — random asteroid clinks (brief high ticks)
//   Jupiter/Saturn — deep subsonic rumble, slow swells
//   Outer  — sparse high void hiss
interface AmbientProfile {
  droneHz: number;        // Primary drone pitch
  padInterval: number;    // Pad octave stack multiplier (e.g. 2.44 = major 3rd + octave)
  shimmer: boolean;       // Sprinkle high-frequency shimmer pings
  noise: 'none' | 'wind' | 'rumble' | 'hiss' | 'clink';
  pingIntervalMs: [number, number]; // random range for ambient_ping cadence
}

const AMBIENT_PROFILES: Record<string, AmbientProfile> = {
  earth_surface: { droneHz: 55,  padInterval: 2.50, shimmer: true,  noise: 'none',   pingIntervalMs: [18000, 38000] },
  leo:           { droneHz: 60,  padInterval: 2.50, shimmer: true,  noise: 'none',   pingIntervalMs: [15000, 30000] },
  geo:           { droneHz: 52,  padInterval: 2.67, shimmer: true,  noise: 'none',   pingIntervalMs: [15000, 30000] },
  lunar_orbit:   { droneHz: 48,  padInterval: 3.00, shimmer: true,  noise: 'hiss',   pingIntervalMs: [12000, 28000] },
  lunar_surface: { droneHz: 42,  padInterval: 3.00, shimmer: false, noise: 'hiss',   pingIntervalMs: [20000, 40000] },
  mars_orbit:    { droneHz: 58,  padInterval: 2.33, shimmer: false, noise: 'wind',   pingIntervalMs: [15000, 30000] },
  mars_surface:  { droneHz: 50,  padInterval: 2.33, shimmer: false, noise: 'wind',   pingIntervalMs: [18000, 35000] },
  mercury_surface: { droneHz: 80, padInterval: 2.00, shimmer: false, noise: 'wind',  pingIntervalMs: [20000, 40000] },
  venus_orbit:     { droneHz: 65, padInterval: 2.25, shimmer: false, noise: 'wind',  pingIntervalMs: [18000, 36000] },
  asteroid_belt: { droneHz: 40,  padInterval: 2.67, shimmer: false, noise: 'clink',  pingIntervalMs: [8000, 18000] },
  ceres_surface: { droneHz: 38,  padInterval: 2.67, shimmer: false, noise: 'clink',  pingIntervalMs: [10000, 20000] },
  jupiter_system:{ droneHz: 28,  padInterval: 3.00, shimmer: true,  noise: 'rumble', pingIntervalMs: [20000, 45000] },
  io_surface:     { droneHz: 30, padInterval: 3.00, shimmer: false, noise: 'rumble', pingIntervalMs: [18000, 40000] },
  europa_surface: { droneHz: 36, padInterval: 3.50, shimmer: true,  noise: 'hiss',   pingIntervalMs: [20000, 42000] },
  ganymede_surface: { droneHz: 34, padInterval: 3.50, shimmer: true, noise: 'hiss',  pingIntervalMs: [22000, 44000] },
  callisto_surface: { droneHz: 32, padInterval: 3.50, shimmer: true, noise: 'hiss',  pingIntervalMs: [22000, 45000] },
  saturn_system: { droneHz: 26,  padInterval: 3.00, shimmer: true,  noise: 'rumble', pingIntervalMs: [22000, 50000] },
  titan_surface: { droneHz: 34,  padInterval: 2.75, shimmer: false, noise: 'wind',   pingIntervalMs: [20000, 40000] },
  enceladus_surface: { droneHz: 36, padInterval: 3.50, shimmer: true, noise: 'hiss', pingIntervalMs: [22000, 45000] },
  outer_system:  { droneHz: 22,  padInterval: 3.50, shimmer: true,  noise: 'hiss',   pingIntervalMs: [25000, 60000] },
  titania_surface: { droneHz: 24, padInterval: 3.50, shimmer: true, noise: 'hiss',   pingIntervalMs: [25000, 55000] },
  triton_surface: { droneHz: 26,  padInterval: 3.50, shimmer: true, noise: 'hiss',   pingIntervalMs: [25000, 55000] },
  pluto_surface: { droneHz: 20,  padInterval: 3.50, shimmer: true,  noise: 'hiss',   pingIntervalMs: [28000, 60000] },
};

const DEFAULT_AMBIENT: AmbientProfile = {
  droneHz: 45, padInterval: 3.67, shimmer: true, noise: 'none', pingIntervalMs: [15000, 40000],
};

/** Start ambient space soundscape — low drones + occasional shimmer, keyed
 *  off the currently-focused region. Re-tuneable via setAmbientRegion() while
 *  playing so moving around the map feels spatial without restarting the mix. */
export function startAmbient(region?: string | null): void {
  const ctx = getContext();
  if (!ctx || !masterGain || ambientPlaying || _muted) return;

  ambientPlaying = true;
  ambientRegion = region ?? null;
  const profile = (region && AMBIENT_PROFILES[region]) || DEFAULT_AMBIENT;

  // Base drone — frequency retunable later via setAmbientRegion().
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(profile.droneHz, ctx.currentTime);
  droneGain.gain.setValueAtTime(0, ctx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 3);
  droneOsc.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start();
  ambientNodes.push({ osc: droneOsc, gain: droneGain });

  // Slow LFO on drone — gives the pad a living, breathing motion.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.03, ctx.currentTime);
  lfoGain.gain.setValueAtTime(8, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(droneOsc.frequency);
  lfo.start();
  ambientNodes.push({ osc: lfo, gain: lfoGain });

  // Harmonic pad stacked above drone per region interval.
  const padOsc1 = ctx.createOscillator();
  const padOsc2 = ctx.createOscillator();
  const padGain = ctx.createGain();
  padOsc1.type = 'sine';
  padOsc1.frequency.setValueAtTime(profile.droneHz * profile.padInterval, ctx.currentTime);
  padOsc2.type = 'sine';
  padOsc2.frequency.setValueAtTime(profile.droneHz * profile.padInterval * 1.5, ctx.currentTime);
  padGain.gain.setValueAtTime(0, ctx.currentTime);
  padGain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 5);
  padOsc1.connect(padGain);
  padOsc2.connect(padGain);
  padGain.connect(masterGain);
  padOsc1.start();
  padOsc2.start();
  ambientNodes.push({ osc: padOsc1, gain: padGain });
  ambientNodes.push({ osc: padOsc2, gain: padGain });

  // Region-specific texture (wind/rumble/hiss) rendered from filtered noise.
  if (profile.noise !== 'none' && profile.noise !== 'clink') {
    startNoiseTexture(profile.noise);
  }

  // Shimmer / ping / clink cadence is profile-driven.
  schedulePeriodic(profile);
}

/** One-shot noise-texture generator — fills a 2s buffer with white noise,
 *  feeds it through a biquad filter appropriate for the region, then loops.
 *  Called from startAmbient for wind/rumble/hiss profiles. */
function startNoiseTexture(kind: 'wind' | 'rumble' | 'hiss') {
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  // 2s of noise, looped — AudioBufferSourceNode supports native loop.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  if (kind === 'wind') {
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 4);
  } else if (kind === 'rumble') {
    filter.type = 'lowpass';
    filter.frequency.value = 110;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 4);
  } else {
    // hiss — quiet high-frequency band, evokes vacuum / thermal noise
    filter.type = 'highpass';
    filter.frequency.value = 3800;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.010, ctx.currentTime + 4);
  }

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();

  // Parked on ambientNodes so stopAmbient() fades + stops them alongside the
  // drone. OscillatorNode and AudioBufferSourceNode share stop()/disconnect().
  ambientNodes.push({ osc: src as unknown as OscillatorNode, gain });
}

/** Shimmer / asteroid-clink / ambient_ping scheduler for active region. */
function schedulePeriodic(profile: AmbientProfile) {
  const [minMs, maxMs] = profile.pingIntervalMs;
  function step() {
    if (!ambientPlaying) return;
    const delay = minMs + Math.random() * (maxMs - minMs);
    ambientTimer = setTimeout(() => {
      if (!ambientPlaying || _muted) { step(); return; }
      const currentProfile = (ambientRegion && AMBIENT_PROFILES[ambientRegion]) || DEFAULT_AMBIENT;
      if (currentProfile.noise === 'clink') {
        // Brief metallic tick — asteroid contact
        playTone(2200 + Math.random() * 1400, 0.04, 'square', { gainStart: 0.05, gainEnd: 0.001 });
      } else if (currentProfile.shimmer) {
        playSound('ambient_ping');
      }
      step();
    }, delay);
  }
  step();
}

/** Retune the active ambient mix to a new region without restarting. Smoothly
 *  slides the drone + pad frequencies over 2s so the transition feels like
 *  moving between cabins rather than a hard cut. Safe to call even when
 *  ambient is off — updates the stored region for the next startAmbient(). */
export function setAmbientRegion(region: string | null): void {
  ambientRegion = region;
  if (!ambientPlaying) return;
  const ctx = getContext();
  if (!ctx) return;
  const profile = (region && AMBIENT_PROFILES[region]) || DEFAULT_AMBIENT;
  // First 3 nodes are drone / lfo / padOsc1. The 4th is padOsc2. Retune them.
  const now = ctx.currentTime;
  const glide = 2.0;
  if (ambientNodes[0]) {
    ambientNodes[0].osc.frequency.cancelScheduledValues(now);
    ambientNodes[0].osc.frequency.linearRampToValueAtTime(profile.droneHz, now + glide);
  }
  if (ambientNodes[2]) {
    ambientNodes[2].osc.frequency.cancelScheduledValues(now);
    ambientNodes[2].osc.frequency.linearRampToValueAtTime(profile.droneHz * profile.padInterval, now + glide);
  }
  if (ambientNodes[3]) {
    ambientNodes[3].osc.frequency.cancelScheduledValues(now);
    ambientNodes[3].osc.frequency.linearRampToValueAtTime(profile.droneHz * profile.padInterval * 1.5, now + glide);
  }
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

/** Toggle ambient on/off — remembers last region if retoggled. */
export function toggleAmbient(): boolean {
  if (ambientPlaying) {
    stopAmbient();
  } else {
    startAmbient(ambientRegion);
  }
  return ambientPlaying;
}
