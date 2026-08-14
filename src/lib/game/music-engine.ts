// ─── Space Tycoon: Generative Music Engine (4X wave W12) ────────────────────
//
// A zero-download generative ambient-music layer in the Stellaris/Eno lineage,
// built entirely on Web Audio synthesis — the codebase's established audio
// pattern (see sound-engine.ts: "All sounds generated at runtime"). No audio
// files, no dependencies.
//
// ARCHITECTURE
//   musicIn ─→ lowpass ─→ musicBus(volume) ─→ masterGain (sound-engine.ts)
//      └─→ send ─→ delay ⇄ feedback ─→ lowpass          (space/echo wash)
//
//   Three layers feed musicIn:
//   • Chord bed    — 4 persistent detuned-pair sine voices, voice-led between
//                    chords (each voice glides to the nearest tone of the next
//                    chord, sound-engine's glide precedent), slow LFO breathing.
//   • Melody       — sparse seeded-random modal fragments with LONG rests
//                    (restraint is the craft); slow-attack triangle notes.
//   • Sub-bass     — one sine an octave under each chord root, portamento.
//
// ADAPTIVE STATES (docs/4X_BASELINE_2026-08.md §3.5 — "layers, not tracks"):
//   calm          C-lydian maj7 palette — default exploration bed
//   tension       A-aeolian w/ bII color, darker lowpass, detuned beating —
//                 active hazard warnings / pending severe event / low cash
//   triumph       C-major lift, brighter filter, faster harmonic motion —
//                 transient (auto-decays to the base mood after ~28 s)
//   interstellar  open fifths/quartal D palette, colder + sparser — galactic
//                 map layer or interstellar-tab focus
//   Mood changes NEVER hard-cut: gains/filter ramp over ~10 s and the bed
//   simply voice-leads into the new palette at the next chord boundary.
//
// DETERMINISM EXCEPTION: gameplay code in this repo seeds all RNG from game
// state (mulberry32 + hashStringToSeed). Music is presentation, not game
// state, so phrase/chord selection is TIME-SEEDED (seed fixed per music
// session) — documented exception, deliberate: two players at the same game
// state may hear different phrases, and that is fine.
//
// RESPECT
//   • Autoplay policy: the engine only ever starts from a user gesture (the
//     Music toggle, or the one-time pointerdown auto-resume for players who
//     had music enabled last session) — same opt-in model as ambient.
//   • The sound-engine mute switch silences music too (music routes through
//     masterGain); startMusic also refuses to start while muted, matching
//     startAmbient.
//   • prefers-reduced-motion does NOT disable music — music is not motion.
//   • Tab hidden → the whole layer suspends (nodes torn down, timers cleared)
//     and resumes on return, mirroring SolarMap3D's visibility gating.
//
// Wiring: page.tsx / MapCommandCenter call updateMusicMood(state, hints)
// beside the existing setAmbientRegion calls; ResourceBar hosts the Music
// toggle + volume slider. Mood mapping itself is the pure, tested
// selectMusicMood() below.

import type { GameState } from './types';
import { mulberry32, hashStringToSeed } from './formulas';
import { getMusicOutput, isMuted } from './sound-engine';

const STORAGE_KEY = 'spacetycoon_music';

// ─── Moods and the pure mood-selection function ─────────────────────────────

export type MusicMood = 'calm' | 'tension' | 'triumph' | 'interstellar';

export interface MusicMoodHints {
  /** Active game tab ('map', 'interstellar', …) — page.tsx passes this. */
  activeTab?: string;
  /** MapCommandCenter's layer toggle. Only honored while activeTab is 'map'
   *  so a stale hint can never strand the interstellar palette elsewhere. */
  mapLayer?: 'solar' | 'galactic';
  /** Injectable clock for tests. Defaults to Date.now(). */
  nowMs?: number;
}

/** A milestone/discovery report younger than this lifts the score to triumph. */
export const TRIUMPH_WINDOW_MS = 45_000;
/** Cash below this floor reads as existential trouble at any game stage. */
export const LOW_CASH_FLOOR = 5_000_000;
/** Negative net income + fewer than this many months of runway → tension. */
export const RUNWAY_MONTHS = 6;
/** A severe hazard strike within this window keeps the score tense. */
export const RECENT_HAZARD_WINDOW_MS = 120_000;

/**
 * Pure mood mapping: GameState + UI hints → mood. No side effects, no
 * window/audio access — unit-tested in __tests__/music-engine.test.ts.
 *
 * Precedence: triumph (brief, event-driven) > tension (danger signals) >
 * interstellar (UI focus) > calm.
 */
export function selectMusicMood(state: GameState, hints: MusicMoodHints = {}): MusicMood {
  const now = hints.nowMs ?? Date.now();

  // Triumph — a just-landed milestone or probe discovery (reports carry ms
  // timestamps; eventLog only has game dates). Guard against future stamps.
  for (const r of state.reports ?? []) {
    if (
      (r.type === 'milestone' || r.type === 'probe_discovery') &&
      now >= r.createdAt &&
      now - r.createdAt < TRIUMPH_WINDOW_MS
    ) {
      return 'triumph';
    }
  }

  // Tension — forecast danger, an unresolved event choice, a fresh severe
  // strike, or a cash position that reads as a crisis.
  const warnings = state.hazardWarnings ?? [];
  if (warnings.some(w => w.severity === 'severe' || w.severity === 'major')) return 'tension';
  if (state.pendingChoice) return 'tension';
  if ((state.recentHazards ?? []).some(h => h.severity === 'severe' && now >= h.occurredAtMs && now - h.occurredAtMs < RECENT_HAZARD_WINDOW_MS)) {
    return 'tension';
  }
  if (state.money < LOW_CASH_FLOOR) return 'tension';
  const inc = state.incomeHistory ?? [];
  const lastNet = inc.length > 0 ? inc[inc.length - 1] : 0;
  if (lastNet < 0 && state.money < Math.abs(lastNet) * RUNWAY_MONTHS) return 'tension';

  // Interstellar — the player's attention is beyond the heliopause.
  if (hints.activeTab === 'interstellar') return 'interstellar';
  if (hints.activeTab === 'map' && hints.mapLayer === 'galactic') return 'interstellar';

  return 'calm';
}

// ─── Musical material ───────────────────────────────────────────────────────
// Chords are absolute MIDI voicings (4 ascending voices); scales are pitch
// classes 0-11. All values are validated by the data-integrity tests.

export const CHORD_MIDI_MIN = 36; // C2 — bed floor
export const CHORD_MIDI_MAX = 96; // C7 — bed ceiling
export const BASS_MIDI_MIN = 24;  // C1 — sub-bass floor
export const MIN_PHRASE_REST_MS = 6_000;  // "long rests" is a design law
export const MIN_CHORD_HOLD_MS = 8_000;

export interface MoodPalette {
  /** Human-readable description of the harmonic idea. */
  label: string;
  /** 4-voice chords, absolute MIDI, ascending. Bed voice-leads among these. */
  chords: number[][];
  /** Melody pitch classes (0-11), subset of the mode. */
  scale: number[];
  /** MIDI range melody notes are drawn from. */
  melodyRegister: [number, number];
  /** ms a chord holds before voice-leading to the next. */
  chordHoldMs: [number, number];
  /** ms of silence between melodic phrases — deliberately long. */
  phraseRestMs: [number, number];
  /** Notes per phrase. */
  phraseNotes: [number, number];
  /** Per-voice bed gain (4 voices total). */
  bedGain: number;
  melodyGain: number;
  bassGain: number;
  /** Shared lowpass cutoff — the mood's "temperature". */
  lowpassHz: number;
  /** Bed pair-detune in cents (wider = more beating = more unease). */
  detuneCents: number;
}

export const MOOD_PALETTES: Record<MusicMood, MoodPalette> = {
  calm: {
    // C lydian — maj7 colors sharing a common B4 thread (Eno-style pivot tone).
    label: 'C lydian — Cmaj7 / D6-9 / Am9 / Gmaj',
    chords: [
      [48, 55, 64, 71], // Cmaj7  (C3 G3 E4 B4)
      [50, 57, 66, 71], // D6/9   (D3 A3 F#4 B4) — the lydian II
      [45, 52, 60, 71], // Am9    (A2 E3 C4 B4)
      [43, 55, 62, 71], // Gmaj   (G2 G3 D4 B4)
    ],
    scale: [0, 2, 4, 7, 9, 11],       // C D E G A B — lydian pent + maj7 tone
    melodyRegister: [72, 88],
    chordHoldMs: [16_000, 26_000],
    phraseRestMs: [9_000, 22_000],
    phraseNotes: [2, 4],
    bedGain: 0.005,
    melodyGain: 0.016,
    bassGain: 0.008,
    lowpassHz: 1_800,
    detuneCents: 6,
  },
  tension: {
    // A aeolian with a bII (Bb) shadow — darker filter, wider detune beating.
    label: 'A aeolian +bII — Am7 / Fmaj7 / G(no3) / Bb',
    chords: [
      [45, 52, 60, 67], // Am7    (A2 E3 C4 G4)
      [41, 48, 57, 64], // Fmaj7  (F2 C3 A3 E4)
      [43, 50, 62, 65], // G(no3) (G2 D3 D4 F4)
      [46, 53, 65, 70], // Bb open(Bb2 F3 F4 Bb4)
    ],
    scale: [0, 2, 4, 5, 7, 9],        // A-minor pent + F darkness
    melodyRegister: [69, 84],
    chordHoldMs: [12_000, 20_000],
    phraseRestMs: [12_000, 26_000],   // sparser: dread lives in the silence
    phraseNotes: [2, 3],
    bedGain: 0.0055,
    melodyGain: 0.012,
    bassGain: 0.009,
    lowpassHz: 900,
    detuneCents: 14,
  },
  triumph: {
    // C major, open voicings, brighter filter, quicker harmonic motion — a
    // brief lift, not a new key of residence (engine auto-decays it).
    label: 'C major lift — C / F / G / Am',
    chords: [
      [48, 55, 64, 72], // C      (C3 G3 E4 C5)
      [53, 60, 65, 72], // F      (F3 C4 F4 C5)
      [43, 55, 67, 74], // G      (G2 G3 G4 D5)
      [45, 57, 64, 72], // Am     (A2 A3 E4 C5)
    ],
    scale: [0, 2, 4, 7, 9],           // C major pentatonic
    melodyRegister: [72, 88],
    chordHoldMs: [10_000, 16_000],
    phraseRestMs: [6_000, 14_000],
    phraseNotes: [3, 5],
    bedGain: 0.006,
    melodyGain: 0.02,
    bassGain: 0.009,
    lowpassHz: 3_200,
    detuneCents: 5,
  },
  interstellar: {
    // Open fifths and quartal stacks on D — no thirds, no warmth. A common
    // D4 pivot keeps the drift coherent. Longest holds, longest rests.
    label: 'D open fifths / quartal — cold, third-less',
    chords: [
      [38, 45, 57, 62], // D5     (D2 A2 A3 D4)
      [36, 43, 55, 62], // C-G-D  (C2 G2 G3 D4)
      [41, 48, 55, 62], // F-C-G-D quartal (F2 C3 G3 D4)
      [38, 50, 57, 64], // Dsus9  (D2 D3 A3 E4)
    ],
    scale: [2, 4, 7, 9],              // D E G A
    melodyRegister: [74, 89],
    chordHoldMs: [20_000, 34_000],
    phraseRestMs: [18_000, 40_000],
    phraseNotes: [1, 3],
    bedGain: 0.004,
    melodyGain: 0.010,
    bassGain: 0.006,
    lowpassHz: 1_200,
    detuneCents: 10,
  },
};

/** How long a triumph lift holds before decaying to the base mood. */
export const TRIUMPH_HOLD_MS = 28_000;
/** Mood crossfade duration (gains + filter), per the W12 spec's 8-15 s. */
export const MOOD_XFADE_S = 10;
/** Bed voice glide time between chords. */
const CHORD_GLIDE_S = 5;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Voice-lead `prev` (current bed voice MIDI notes) into `chord`: each voice
 * moves to its nearest target chord tone (octave shifts ±12 allowed), voices
 * claim targets greedily so they don't collapse onto one note. Pure; exported
 * for tests.
 */
export function leadVoices(prev: number[], chord: number[]): number[] {
  const taken = new Set<number>();
  return prev.map(p => {
    let best = chord[0];
    let bestDist = Infinity;
    for (const tone of chord) {
      for (const shift of [-12, 0, 12]) {
        const cand = tone + shift;
        if (cand < CHORD_MIDI_MIN || cand > CHORD_MIDI_MAX) continue;
        const dist = Math.abs(cand - p) + (taken.has(cand) ? 24 : 0); // discourage doubling
        if (dist < bestDist) { bestDist = dist; best = cand; }
      }
    }
    taken.add(best);
    return best;
  });
}

// ─── Engine state (module-level, client-only — sound-engine's pattern) ──────

interface BedVoice { oscA: OscillatorNode; oscB: OscillatorNode; gain: GainNode; midi: number; }

let musicPlaying = false;
let currentMood: MusicMood = 'calm';
let baseMood: MusicMood = 'calm'; // last non-triumph request; triumph decays here
let _musicVolume = 0.45;
let _musicEnabled = false; // persisted preference (drives auto-resume)
let prefsLoaded = false;

let musicBus: GainNode | null = null;     // volume control → masterGain
let lowpass: BiquadFilterNode | null = null;
let musicIn: GainNode | null = null;      // all layers land here
let delayNodes: { send: GainNode; delay: DelayNode; feedback: GainNode; damp: BiquadFilterNode } | null = null;
let bedVoices: BedVoice[] = [];
let bedLfo: { osc: OscillatorNode; gain: GainNode } | null = null;
let bassVoice: { osc: OscillatorNode; gain: GainNode } | null = null;
let melodyGainNode: GainNode | null = null;

let chordTimer: ReturnType<typeof setTimeout> | null = null;
let melodyTimer: ReturnType<typeof setTimeout> | null = null;
let noteTimers: ReturnType<typeof setTimeout>[] = [];
let triumphTimer: ReturnType<typeof setTimeout> | null = null;

let chordIndex = 0;
let lastMelodyMidi: number | null = null;
// Time-seeded per session — the documented presentation-only RNG exception.
let rng: () => number = mulberry32(hashStringToSeed('music:boot'));

let visibilityHooked = false;
let hiddenSuspended = false;

// Mood wiring memory: updateMusicMood merges hints and re-derives the mood so
// page.tsx and MapCommandCenter can each contribute their slice of context.
let _lastState: GameState | null = null;
let _hints: MusicMoodHints = {};

function loadPrefs(): void {
  if (prefsLoaded || typeof window === 'undefined') return;
  prefsLoaded = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      _musicEnabled = prefs.enabled ?? false;
      _musicVolume = typeof prefs.volume === 'number' ? Math.max(0, Math.min(1, prefs.volume)) : 0.45;
    }
  } catch { /* ignore */ }
}

function savePrefs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: _musicEnabled, volume: _musicVolume }));
  } catch { /* ignore */ }
}

function palette(): MoodPalette {
  return MOOD_PALETTES[currentMood];
}

function rand(min: number, max: number): number {
  return min + rng() * (max - min);
}

// ─── Graph construction ─────────────────────────────────────────────────────

function buildGraph(): boolean {
  const out = getMusicOutput();
  if (!out) return false;
  const { ctx, master } = out;
  const now = ctx.currentTime;
  const pal = palette();

  musicBus = ctx.createGain();
  musicBus.gain.setValueAtTime(_musicVolume, now);
  musicBus.connect(master); // masterGain — mute/master volume covers music too

  lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(pal.lowpassHz, now);
  lowpass.Q.value = 0.5;
  lowpass.connect(musicBus);

  const input = ctx.createGain();
  musicIn = input;
  input.gain.setValueAtTime(1, now);
  input.connect(lowpass);

  // Space wash: feedback delay (sound-engine has no convolver — this is the
  // cheap synthesized equivalent, one delay line with damped feedback).
  const send = ctx.createGain();
  send.gain.setValueAtTime(0.22, now);
  const delay = ctx.createDelay(2.0);
  delay.delayTime.setValueAtTime(0.48, now);
  const feedback = ctx.createGain();
  feedback.gain.setValueAtTime(0.35, now);
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.setValueAtTime(1_500, now);
  input.connect(send);
  send.connect(delay);
  delay.connect(damp);
  damp.connect(lowpass);
  damp.connect(feedback);
  feedback.connect(delay);
  delayNodes = { send, delay, feedback, damp };

  // Chord bed — 4 detuned-pair voices with slow fade-in.
  const chord = pal.chords[chordIndex % pal.chords.length];
  bedVoices = chord.map((midi, i) => {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const gain = ctx.createGain();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(midiToFreq(midi), now);
    oscB.frequency.setValueAtTime(midiToFreq(midi), now);
    oscA.detune.setValueAtTime(pal.detuneCents / 2, now);
    oscB.detune.setValueAtTime(-pal.detuneCents / 2, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(pal.bedGain, now + 6 + i * 1.5); // staggered bloom
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(input);
    oscA.start(now);
    oscB.start(now);
    return { oscA, oscB, gain, midi };
  });

  // Breathing LFO on the bed input (amplitude, not pitch — under the ambient
  // drone's pitch LFO so the two layers don't phase-lock).
  const lfoOsc = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfoOsc.type = 'sine';
  lfoOsc.frequency.setValueAtTime(0.02, now);
  lfoGain.gain.setValueAtTime(0.12, now); // ±12% swell on the music input
  lfoOsc.connect(lfoGain);
  lfoGain.connect(input.gain);
  lfoOsc.start(now);
  bedLfo = { osc: lfoOsc, gain: lfoGain };

  // Sub-bass root, one octave under the chord's bottom voice.
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(midiToFreq(Math.max(BASS_MIDI_MIN, chord[0] - 12)), now);
  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.linearRampToValueAtTime(pal.bassGain, now + 8);
  bassOsc.connect(bassGain);
  bassGain.connect(input);
  bassOsc.start(now);
  bassVoice = { osc: bassOsc, gain: bassGain };

  // Melody layer bus.
  const melBus = ctx.createGain();
  melodyGainNode = melBus;
  melBus.gain.setValueAtTime(pal.melodyGain, now);
  melBus.connect(input);

  return true;
}

function teardownGraph(fadeSeconds: number): void {
  const out = getMusicOutput();
  const nodes: { stop?: () => void; disconnect: () => void }[] = [];
  for (const v of bedVoices) nodes.push(v.oscA, v.oscB, v.gain);
  if (bedLfo) nodes.push(bedLfo.osc, bedLfo.gain);
  if (bassVoice) nodes.push(bassVoice.osc, bassVoice.gain);
  if (melodyGainNode) nodes.push(melodyGainNode);
  if (delayNodes) nodes.push(delayNodes.send, delayNodes.delay, delayNodes.feedback, delayNodes.damp);
  if (musicIn) nodes.push(musicIn);
  if (lowpass) nodes.push(lowpass);
  const bus = musicBus;
  if (out && bus) {
    try {
      bus.gain.cancelScheduledValues(out.ctx.currentTime);
      bus.gain.setValueAtTime(bus.gain.value, out.ctx.currentTime);
      bus.gain.linearRampToValueAtTime(0, out.ctx.currentTime + fadeSeconds);
    } catch { /* ignore */ }
  }
  setTimeout(() => {
    for (const n of nodes) {
      try { n.stop?.(); } catch { /* ignore */ }
      try { n.disconnect(); } catch { /* ignore */ }
    }
    try { bus?.disconnect(); } catch { /* ignore */ }
  }, fadeSeconds * 1000 + 300);
  bedVoices = [];
  bedLfo = null;
  bassVoice = null;
  melodyGainNode = null;
  delayNodes = null;
  musicIn = null;
  lowpass = null;
  musicBus = null;
}

// ─── Schedulers ─────────────────────────────────────────────────────────────

function clearTimers(): void {
  if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
  if (melodyTimer) { clearTimeout(melodyTimer); melodyTimer = null; }
  for (const t of noteTimers) clearTimeout(t);
  noteTimers = [];
}

function scheduleNextChord(delayMs?: number): void {
  if (chordTimer) clearTimeout(chordTimer);
  const pal = palette();
  const hold = delayMs ?? rand(pal.chordHoldMs[0], pal.chordHoldMs[1]);
  chordTimer = setTimeout(() => {
    if (!musicPlaying) return;
    advanceChord();
    scheduleNextChord();
  }, hold);
}

function advanceChord(): void {
  const out = getMusicOutput();
  if (!out || bedVoices.length === 0) return;
  const { ctx } = out;
  const pal = palette();

  // Pick a different chord from the current palette (seeded walk, no repeat).
  let next = Math.floor(rng() * pal.chords.length);
  if (next === chordIndex % pal.chords.length) next = (next + 1) % pal.chords.length;
  chordIndex = next;
  const chord = pal.chords[next];

  // Voice-lead the existing voices to the new chord with slow glides —
  // the setAmbientRegion glide precedent, stretched to musical time.
  const targets = leadVoices(bedVoices.map(v => v.midi), chord);
  const now = ctx.currentTime;
  bedVoices.forEach((v, i) => {
    const f = midiToFreq(targets[i]);
    try {
      v.oscA.frequency.cancelScheduledValues(now);
      v.oscB.frequency.cancelScheduledValues(now);
      v.oscA.frequency.linearRampToValueAtTime(f, now + CHORD_GLIDE_S);
      v.oscB.frequency.linearRampToValueAtTime(f, now + CHORD_GLIDE_S);
      v.oscA.detune.setTargetAtTime(pal.detuneCents / 2, now, 3);
      v.oscB.detune.setTargetAtTime(-pal.detuneCents / 2, now, 3);
      // Gentle dip-and-swell so the change breathes instead of smearing.
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(pal.bedGain * 0.6, now + CHORD_GLIDE_S * 0.5);
      v.gain.gain.linearRampToValueAtTime(pal.bedGain, now + CHORD_GLIDE_S * 1.6);
    } catch { /* ignore */ }
    v.midi = targets[i];
  });

  const bass = bassVoice;
  if (bass) {
    try {
      const bassMidi = Math.max(BASS_MIDI_MIN, chord[0] - 12);
      bass.osc.frequency.cancelScheduledValues(now);
      bass.osc.frequency.linearRampToValueAtTime(midiToFreq(bassMidi), now + CHORD_GLIDE_S * 0.8);
      bass.gain.gain.setTargetAtTime(pal.bassGain, now, MOOD_XFADE_S / 3);
    } catch { /* ignore */ }
  }
}

function scheduleNextPhrase(): void {
  if (melodyTimer) clearTimeout(melodyTimer);
  const pal = palette();
  const rest = rand(pal.phraseRestMs[0], pal.phraseRestMs[1]);
  melodyTimer = setTimeout(() => {
    if (!musicPlaying) return;
    playPhrase();
    scheduleNextPhrase();
  }, rest);
}

/** Pick the next melody note: random walk over the scale within the mood's
 *  register, biased toward small intervals from the previous note. */
function pickMelodyMidi(pal: MoodPalette): number {
  const [lo, hi] = pal.melodyRegister;
  const candidates: number[] = [];
  for (let m = lo; m <= hi; m++) {
    if (pal.scale.includes(((m % 12) + 12) % 12)) candidates.push(m);
  }
  if (candidates.length === 0) return lo;
  if (lastMelodyMidi === null) {
    return candidates[Math.floor(rng() * candidates.length)];
  }
  const prev = lastMelodyMidi;
  // Weight ∝ 1/(1+distance) — stepwise motion dominates, leaps are rare.
  const weights = candidates.map(m => 1 / (1 + Math.abs(m - prev)));
  let total = 0;
  for (const w of weights) total += w;
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function playPhrase(): void {
  const out = getMusicOutput();
  const mel = melodyGainNode;
  if (!out || !mel || isMuted()) return;
  const { ctx } = out;
  const pal = palette();
  const notes = Math.round(rand(pal.phraseNotes[0], pal.phraseNotes[1]));

  let offsetS = 0;
  for (let i = 0; i < notes; i++) {
    const midi = pickMelodyMidi(pal);
    lastMelodyMidi = midi;
    const dur = rand(2.5, 4.5);
    const gap = rand(1.2, 2.6);
    const startAt = ctx.currentTime + offsetS;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(midi), startAt);
      osc.detune.setValueAtTime(rand(-4, 4), startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(1, startAt + 0.9);      // slow bloom
      gain.gain.setValueAtTime(1, startAt + dur * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur); // long tail
      osc.connect(gain);
      gain.connect(mel);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.1);
    } catch { /* ignore */ }
    offsetS += gap;
  }
}

// ─── Mood transitions ───────────────────────────────────────────────────────

function applyMoodTransition(): void {
  const out = getMusicOutput();
  const lp = lowpass;
  const mel = melodyGainNode;
  if (!out || !lp || !mel) return;
  const { ctx } = out;
  const pal = palette();
  const now = ctx.currentTime;
  const tau = MOOD_XFADE_S / 3; // setTargetAtTime reaches ~95% at 3τ ≈ 10 s

  // Never hard-cut: filter temperature, layer levels, and detune all ramp
  // over the crossfade window…
  try {
    lp.frequency.cancelScheduledValues(now);
    lp.frequency.setTargetAtTime(pal.lowpassHz, now, tau);
    mel.gain.setTargetAtTime(pal.melodyGain, now, tau);
    if (bassVoice) bassVoice.gain.gain.setTargetAtTime(pal.bassGain, now, tau);
    for (const v of bedVoices) v.gain.gain.setTargetAtTime(pal.bedGain, now, tau);
  } catch { /* ignore */ }

  // …and the bed voice-leads into the new palette at a near-term chord
  // boundary, so harmony crosses over rather than switching.
  scheduleNextChord(2_500 + rng() * 2_000);
  // Melody re-times to the new mood's rest cadence.
  scheduleNextPhrase();
}

// ─── Visibility suspension (SolarMap3D's visibilitychange pattern) ──────────

function ensureVisibilityHook(): void {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (musicPlaying) {
        hiddenSuspended = true;
        stopMusicInternal(0.4);
      }
    } else if (hiddenSuspended) {
      hiddenSuspended = false;
      // Resume is not a gesture, but the AudioContext was already unlocked by
      // the gesture that originally started music, so this is policy-safe.
      startMusic(currentMood);
    }
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Start the generative score. No-op while muted or already playing — the
 *  same guards as startAmbient. Must ultimately trace to a user gesture. */
export function startMusic(mood?: MusicMood): void {
  loadPrefs();
  if (musicPlaying || isMuted()) return;
  if (mood) { currentMood = mood; if (mood !== 'triumph') baseMood = mood; }
  // Fresh time-based seed per session — presentation-only randomness.
  rng = mulberry32(hashStringToSeed(`music:${Date.now()}`));
  if (!buildGraph()) return;
  musicPlaying = true;
  _musicEnabled = true;
  savePrefs();
  ensureVisibilityHook();
  scheduleNextChord();
  scheduleNextPhrase();
}

function stopMusicInternal(fadeSeconds: number): void {
  if (!musicPlaying) return;
  musicPlaying = false;
  clearTimers();
  teardownGraph(fadeSeconds);
  lastMelodyMidi = null;
}

/** Stop the score (user intent — clears the auto-resume preference). */
export function stopMusic(): void {
  loadPrefs();
  hiddenSuspended = false;
  stopMusicInternal(1.2);
  _musicEnabled = false;
  savePrefs();
}

export function isMusicPlaying(): boolean {
  return musicPlaying;
}

export function toggleMusic(): boolean {
  if (musicPlaying) stopMusic();
  else startMusic();
  return musicPlaying;
}

/** Music-layer volume (independent slider; master mute still wins). */
export function setMusicVolume(vol: number): void {
  loadPrefs();
  _musicVolume = Math.max(0, Math.min(1, vol));
  const out = getMusicOutput();
  if (musicBus && out) {
    try { musicBus.gain.setTargetAtTime(_musicVolume, out.ctx.currentTime, 0.1); } catch { /* ignore */ }
  }
  savePrefs();
}

export function getMusicVolume(): number {
  loadPrefs();
  return _musicVolume;
}

/**
 * Request a mood. Crossfades over ~MOOD_XFADE_S; a 'triumph' request is
 * transient and decays back to the last base mood after TRIUMPH_HOLD_MS.
 * Safe to call while music is off (remembered for the next start).
 */
export function setMusicMood(mood: MusicMood): void {
  if (mood !== 'triumph') baseMood = mood;
  if (mood === currentMood) return;
  currentMood = mood;
  if (musicPlaying) applyMoodTransition();
  if (mood === 'triumph') {
    if (triumphTimer) clearTimeout(triumphTimer);
    triumphTimer = setTimeout(() => {
      if (currentMood === 'triumph') setMusicMood(baseMood);
    }, TRIUMPH_HOLD_MS);
  }
}

export function getMusicMood(): MusicMood {
  return currentMood;
}

/**
 * The wiring entry point (setAmbientRegion precedent): call-sites hand over
 * whatever context they own — page.tsx passes GameState + active tab,
 * MapCommandCenter passes its layer — and the pure selectMusicMood() derives
 * the mood from the merged picture.
 */
export function updateMusicMood(state?: GameState | null, hints?: Partial<MusicMoodHints>): void {
  if (state) _lastState = state;
  if (hints) _hints = { ..._hints, ...hints };
  if (!_lastState) return;
  setMusicMood(selectMusicMood(_lastState, _hints));
}

/**
 * Autoplay-policy-safe session resume: if the player had music on last
 * session, arm a one-time pointer/key listener that restarts it on their
 * first gesture (which also unlocks the AudioContext). Idempotent.
 */
let autoResumeArmed = false;
export function initMusicAutoResume(onResumed?: () => void): void {
  if (autoResumeArmed || typeof window === 'undefined') return;
  autoResumeArmed = true;
  loadPrefs();
  if (!_musicEnabled) return;
  const handler = () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    if (!musicPlaying && !isMuted()) {
      startMusic();
      onResumed?.();
    }
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
}
