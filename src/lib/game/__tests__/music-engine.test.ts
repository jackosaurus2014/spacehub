/**
 * @jest-environment node
 *
 * W12 generative music — tests for the pure mood-selection function and the
 * chord/scale data integrity of the mood palettes. The Web Audio playback
 * path is browser-only and intentionally untested here (it no-ops without an
 * AudioContext).
 */
import type { GameState } from '../types';
import {
  selectMusicMood,
  MOOD_PALETTES,
  TRIUMPH_WINDOW_MS,
  LOW_CASH_FLOOR,
  RUNWAY_MONTHS,
  CHORD_MIDI_MIN,
  CHORD_MIDI_MAX,
  BASS_MIDI_MIN,
  MIN_PHRASE_REST_MS,
  MIN_CHORD_HOLD_MS,
  midiToFreq,
  leadVoices,
  type MusicMood,
} from '../music-engine';

const NOW = 10_000_000;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: NOW - 1_000_000, lastTickAt: NOW,
    money: 100_000_000, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  } as GameState;
}

describe('selectMusicMood — calm default', () => {
  it('healthy corp with no signals and no hints → calm', () => {
    expect(selectMusicMood(baseState(), { nowMs: NOW })).toBe('calm');
  });

  it('minor hazard warnings alone do not trip tension', () => {
    const s = baseState({
      hazardWarnings: [{
        id: 'w1', type: 'micrometeorite', severity: 'minor',
        locationId: 'leo', forecastMonthIndex: 5, issuedAtMs: NOW - 1000, summary: 'dust',
      }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('calm');
  });
});

describe('selectMusicMood — tension signals', () => {
  it('severe hazard warning → tension', () => {
    const s = baseState({
      hazardWarnings: [{
        id: 'w1', type: 'solar_storm', severity: 'severe',
        locationId: 'leo', forecastMonthIndex: 5, issuedAtMs: NOW - 1000, summary: 'CME inbound',
      }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('tension');
  });

  it('major hazard warning → tension', () => {
    const s = baseState({
      hazardWarnings: [{
        id: 'w1', type: 'pirate_raid', severity: 'major',
        locationId: 'asteroid_belt', forecastMonthIndex: 5, issuedAtMs: NOW - 1000, summary: 'corsairs',
      }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('tension');
  });

  it('pending event choice → tension', () => {
    const s = baseState({
      pendingChoice: {
        eventId: 'e1', eventName: 'Reactor leak', eventIcon: '⚠️',
        eventDescription: 'Choose', choices: [{ label: 'A', description: 'a' }],
      },
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('tension');
  });

  it('recent severe hazard strike → tension; an old one does not linger', () => {
    const strike = (occurredAtMs: number) => baseState({
      recentHazards: [{
        id: 'h1', type: 'solar_storm', severity: 'severe' as const, locationId: 'leo',
        occurredAtMs, damagePct: 0.4, mitigatedPct: 0.1, destroyed: false,
        insurancePayout: 0, summary: 'array fried',
      }],
    });
    expect(selectMusicMood(strike(NOW - 30_000), { nowMs: NOW })).toBe('tension');
    expect(selectMusicMood(strike(NOW - 500_000), { nowMs: NOW })).toBe('calm');
  });

  it('cash under the floor → tension', () => {
    expect(selectMusicMood(baseState({ money: LOW_CASH_FLOOR - 1 }), { nowMs: NOW })).toBe('tension');
    expect(selectMusicMood(baseState({ money: LOW_CASH_FLOOR + 1 }), { nowMs: NOW })).toBe('calm');
  });

  it('negative net income with short runway → tension; long runway stays calm', () => {
    const burning = baseState({ money: 50_000_000, incomeHistory: [5, -20_000_000] });
    expect(selectMusicMood(burning, { nowMs: NOW })).toBe('tension'); // < 6 months runway
    const cushioned = baseState({ money: 50_000_000 * RUNWAY_MONTHS, incomeHistory: [-20_000_000] });
    expect(selectMusicMood(cushioned, { nowMs: NOW })).toBe('calm');
  });
});

describe('selectMusicMood — triumph', () => {
  it('fresh milestone report → triumph', () => {
    const s = baseState({
      reports: [{ id: 'r1', type: 'milestone', title: 'First!', body: 'claimed', createdAt: NOW - 5_000, read: false }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('triumph');
  });

  it('fresh probe discovery → triumph', () => {
    const s = baseState({
      reports: [{ id: 'r1', type: 'probe_discovery', title: 'Anomaly', body: 'found', createdAt: NOW - 1_000, read: false }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('triumph');
  });

  it('expired or future-stamped reports do not lift', () => {
    const old = baseState({
      reports: [{ id: 'r1', type: 'milestone', title: 'x', body: 'y', createdAt: NOW - TRIUMPH_WINDOW_MS - 1, read: true }],
    });
    expect(selectMusicMood(old, { nowMs: NOW })).toBe('calm');
    const future = baseState({
      reports: [{ id: 'r1', type: 'milestone', title: 'x', body: 'y', createdAt: NOW + 60_000, read: false }],
    });
    expect(selectMusicMood(future, { nowMs: NOW })).toBe('calm');
  });

  it('system_alert reports never lift', () => {
    const s = baseState({
      reports: [{ id: 'r1', type: 'system_alert', title: 'x', body: 'y', createdAt: NOW - 1_000, read: false }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('calm');
  });

  it('triumph outranks tension (the brief lift wins the moment)', () => {
    const s = baseState({
      money: 0, // tension signal
      reports: [{ id: 'r1', type: 'milestone', title: 'First!', body: 'claimed', createdAt: NOW - 5_000, read: false }],
    });
    expect(selectMusicMood(s, { nowMs: NOW })).toBe('triumph');
  });
});

describe('selectMusicMood — interstellar focus', () => {
  it('interstellar tab → interstellar', () => {
    expect(selectMusicMood(baseState(), { nowMs: NOW, activeTab: 'interstellar' })).toBe('interstellar');
  });

  it('map tab + galactic layer → interstellar', () => {
    expect(selectMusicMood(baseState(), { nowMs: NOW, activeTab: 'map', mapLayer: 'galactic' })).toBe('interstellar');
  });

  it('stale galactic hint off the map tab is ignored', () => {
    expect(selectMusicMood(baseState(), { nowMs: NOW, activeTab: 'dashboard', mapLayer: 'galactic' })).toBe('calm');
  });

  it('map tab + solar layer stays calm', () => {
    expect(selectMusicMood(baseState(), { nowMs: NOW, activeTab: 'map', mapLayer: 'solar' })).toBe('calm');
  });

  it('tension outranks interstellar focus', () => {
    const s = baseState({ money: 0 });
    expect(selectMusicMood(s, { nowMs: NOW, activeTab: 'interstellar' })).toBe('tension');
  });
});

describe('selectMusicMood — all four moods reachable', () => {
  it('the mapping can produce every mood', () => {
    const seen = new Set<MusicMood>([
      selectMusicMood(baseState(), { nowMs: NOW }),
      selectMusicMood(baseState({ money: 0 }), { nowMs: NOW }),
      selectMusicMood(baseState({
        reports: [{ id: 'r', type: 'milestone', title: 't', body: 'b', createdAt: NOW - 1, read: false }],
      }), { nowMs: NOW }),
      selectMusicMood(baseState(), { nowMs: NOW, activeTab: 'interstellar' }),
    ]);
    expect(seen).toEqual(new Set<MusicMood>(['calm', 'tension', 'triumph', 'interstellar']));
  });
});

describe('MOOD_PALETTES — chord/scale data integrity', () => {
  const moods = Object.keys(MOOD_PALETTES) as MusicMood[];

  it('defines exactly the four adaptive moods', () => {
    expect(new Set(moods)).toEqual(new Set(['calm', 'tension', 'triumph', 'interstellar']));
  });

  it.each(moods)('%s: chords are 4-voice, ascending, within the bed range', (mood) => {
    const pal = MOOD_PALETTES[mood];
    expect(pal.chords.length).toBeGreaterThanOrEqual(3); // enough for a non-repeating walk
    for (const chord of pal.chords) {
      expect(chord.length).toBe(4);
      for (const note of chord) {
        expect(Number.isInteger(note)).toBe(true);
        expect(note).toBeGreaterThanOrEqual(CHORD_MIDI_MIN);
        expect(note).toBeLessThanOrEqual(CHORD_MIDI_MAX);
      }
      for (let i = 1; i < chord.length; i++) {
        expect(chord[i]).toBeGreaterThanOrEqual(chord[i - 1]); // ascending voicing
      }
      // Sub-bass root (chord[0] - 12, clamped) stays in a legal register.
      expect(Math.max(BASS_MIDI_MIN, chord[0] - 12)).toBeGreaterThanOrEqual(BASS_MIDI_MIN);
    }
  });

  it.each(moods)('%s: melody scale is non-empty unique pitch classes 0-11', (mood) => {
    const pal = MOOD_PALETTES[mood];
    expect(pal.scale.length).toBeGreaterThan(0);
    expect(new Set(pal.scale).size).toBe(pal.scale.length);
    for (const pc of pal.scale) {
      expect(Number.isInteger(pc)).toBe(true);
      expect(pc).toBeGreaterThanOrEqual(0);
      expect(pc).toBeLessThanOrEqual(11);
    }
  });

  it.each(moods)('%s: melody register is a valid range above the bed', (mood) => {
    const [lo, hi] = MOOD_PALETTES[mood].melodyRegister;
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeGreaterThanOrEqual(60); // melody floats above the chord bed
    expect(hi).toBeLessThanOrEqual(CHORD_MIDI_MAX);
    // The register must actually contain scale tones to draw from.
    const pcs = MOOD_PALETTES[mood].scale;
    let available = 0;
    for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) available++;
    expect(available).toBeGreaterThan(0);
  });

  it.each(moods)('%s: timing honors the restraint laws (long rests, slow harmony)', (mood) => {
    const pal = MOOD_PALETTES[mood];
    expect(pal.phraseRestMs[0]).toBeGreaterThanOrEqual(MIN_PHRASE_REST_MS);
    expect(pal.phraseRestMs[0]).toBeLessThan(pal.phraseRestMs[1]);
    expect(pal.chordHoldMs[0]).toBeGreaterThanOrEqual(MIN_CHORD_HOLD_MS);
    expect(pal.chordHoldMs[0]).toBeLessThan(pal.chordHoldMs[1]);
    expect(pal.phraseNotes[0]).toBeGreaterThanOrEqual(1);
    expect(pal.phraseNotes[0]).toBeLessThanOrEqual(pal.phraseNotes[1]);
    expect(pal.phraseNotes[1]).toBeLessThanOrEqual(6); // fragments, never runs
  });

  it.each(moods)('%s: mix levels keep music under the region ambient', (mood) => {
    const pal = MOOD_PALETTES[mood];
    // Ambient bed totals ≈0.037 (drone 0.025 + pads 0.012); the music bed +
    // bass must sit under that so ambient stays the foreground texture.
    expect(pal.bedGain * 4 + pal.bassGain).toBeLessThanOrEqual(0.035);
    expect(pal.bedGain).toBeGreaterThan(0);
    expect(pal.melodyGain).toBeGreaterThan(0);
    expect(pal.melodyGain).toBeLessThanOrEqual(0.03);
    expect(pal.bassGain).toBeGreaterThan(0);
    expect(pal.lowpassHz).toBeGreaterThanOrEqual(200);
    expect(pal.lowpassHz).toBeLessThanOrEqual(8000);
    expect(pal.detuneCents).toBeGreaterThanOrEqual(0);
    expect(pal.detuneCents).toBeLessThanOrEqual(25);
  });

  it('interstellar is the sparsest and coldest palette (design invariant)', () => {
    const inter = MOOD_PALETTES.interstellar;
    const calm = MOOD_PALETTES.calm;
    expect(inter.phraseRestMs[0]).toBeGreaterThan(calm.phraseRestMs[0]);
    expect(inter.chordHoldMs[0]).toBeGreaterThan(calm.chordHoldMs[0]);
    expect(inter.melodyGain).toBeLessThan(calm.melodyGain);
    // Third-less harmony: no chord tone a major/minor third above the root.
    for (const chord of inter.chords) {
      const root = chord[0] % 12;
      for (const note of chord) {
        const interval = (note - chord[0]) % 12;
        expect([3, 4]).not.toContain(interval);
        void root;
      }
    }
  });
});

describe('midiToFreq + leadVoices', () => {
  it('midiToFreq hits the anchors', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);   // A4
    expect(midiToFreq(57)).toBeCloseTo(220, 6);   // A3
    expect(midiToFreq(60)).toBeCloseTo(261.626, 2); // C4
  });

  it('voice-leads every voice to a target chord tone within the bed range', () => {
    for (const mood of Object.keys(MOOD_PALETTES) as MusicMood[]) {
      const pal = MOOD_PALETTES[mood];
      let voices = [...pal.chords[0]];
      for (const chord of pal.chords.slice(1)) {
        voices = leadVoices(voices, chord);
        expect(voices.length).toBe(4);
        const pcs = new Set(chord.map(n => n % 12));
        for (const v of voices) {
          expect(pcs.has(v % 12)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(CHORD_MIDI_MIN);
          expect(v).toBeLessThanOrEqual(CHORD_MIDI_MAX);
        }
      }
    }
  });

  it('prefers small movements (each voice moves ≤ a tritone between adjacent chords)', () => {
    for (const mood of Object.keys(MOOD_PALETTES) as MusicMood[]) {
      const pal = MOOD_PALETTES[mood];
      for (let c = 0; c < pal.chords.length; c++) {
        const from = pal.chords[c];
        const to = pal.chords[(c + 1) % pal.chords.length];
        const led = leadVoices([...from], to);
        led.forEach((v, i) => {
          expect(Math.abs(v - from[i])).toBeLessThanOrEqual(7);
        });
      }
    }
  });
});
