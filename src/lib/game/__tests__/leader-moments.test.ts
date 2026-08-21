import {
  FACTION_LEADERS,
  FACTION_ACCENT_HEX,
  resolveCommanderSpeaker,
  resolveFactionSpeaker,
  resolveChainStageFaction,
  resolveChoiceSpeaker,
  commanderIdFromRetirementEvent,
  detectLeaderMomentsFromEvents,
  detectStandingMoments,
  enqueueLeaderMoments,
  dequeueLeaderMoment,
  speakerMonogram,
  MAX_LEADER_QUEUE,
  type LeaderMoment,
} from '../leader-moments';
import { FACTIONS, getStanding, type FactionId } from '../factions';
import { COMMANDER_DEFS, COMMANDER_MAP, hasPortraitArt } from '../commanders';
import { CHAIN_DEFINITIONS } from '../narrative-events';
import { CHAPTER_DEFINITIONS } from '../chapters';
import type { GameEvent } from '../types';

const DATE = { year: 2150, month: 1, day: 1 } as GameEvent['date'];

function evt(id: string, title = 'x'): GameEvent {
  return { id, date: DATE, type: 'milestone', title, description: '' };
}

// ─── Speaker tables ────────────────────────────────────────────────────────

describe('LORE-anchored speaker tables', () => {
  it('names a leader for every faction the game defines', () => {
    for (const f of FACTIONS) {
      expect(FACTION_LEADERS[f.id]).toBeDefined();
      expect(FACTION_LEADERS[f.id].name.length).toBeGreaterThan(0);
      expect(FACTION_LEADERS[f.id].title.length).toBeGreaterThan(0);
      expect(FACTION_ACCENT_HEX[f.id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('does not invent a singular Hive Collective leader (LORE.md canon)', () => {
    // "None singular. The Collective's interfaces rotate." — the entry must
    // name the interface, not a person.
    expect(FACTION_LEADERS['hive-collective'].name).toMatch(/spokesbody/i);
  });
});

describe('resolveCommanderSpeaker', () => {
  it('returns null for an unknown id rather than fabricating a person', () => {
    expect(resolveCommanderSpeaker('not-a-commander')).toBeNull();
  });

  it('carries name, title and a portrait path for a real commander', () => {
    const def = COMMANDER_DEFS.find(d => hasPortraitArt(d))!;
    const speaker = resolveCommanderSpeaker(def.id)!;
    expect(speaker.name).toBe(def.name);
    expect(speaker.title).toBe(def.title);
    expect(speaker.portraitUrl).toBe(`/game/commander-${def.id}.webp`);
    expect(speaker.cohort).toBe('commander');
  });

  it('resolves a speaker for every commander on the roster', () => {
    for (const def of COMMANDER_DEFS) {
      expect(resolveCommanderSpeaker(def.id)).not.toBeNull();
    }
  });

  it('falls back to a null portrait (never a broken path) without art', () => {
    const def = COMMANDER_DEFS.find(d => !hasPortraitArt(d));
    if (!def) return; // whole roster has art today; guard stays honest if that changes
    const speaker = resolveCommanderSpeaker(def.id)!;
    expect(speaker.portraitUrl).toBeNull();
    expect(speaker.cohort).toBe('none');
  });
});

describe('resolveFactionSpeaker', () => {
  it('returns null for an unknown faction', () => {
    expect(resolveFactionSpeaker('the-galactic-empire')).toBeNull();
  });

  it('pairs each faction with its own leader portrait and affiliation', () => {
    for (const f of FACTIONS) {
      const speaker = resolveFactionSpeaker(f.id)!;
      expect(speaker.affiliation).toBe(f.name);
      expect(speaker.portraitUrl).toBe(`/game/faction-leader-${f.id}.webp`);
      expect(speaker.cohort).toBe('faction-leader');
      expect(speaker.name).toBe(FACTION_LEADERS[f.id].name);
    }
  });
});

// ─── Chain-stage attribution ───────────────────────────────────────────────

describe('resolveChainStageFaction', () => {
  it('attributes a stage whose every branch moves exactly one faction', () => {
    // contamination_protocols' planetary-protection categories stage: both
    // branches move only Echo Remnants, so the Remnants are at the table.
    const chain = CHAIN_DEFINITIONS.find(c => c.id === 'accord_council')!;
    const idx = chain.stages.findIndex(s => {
      if (!s.choices || s.choices.length < 2) return false;
      const sets = s.choices.map(c => Object.keys(c.consequence?.factionRep ?? {}));
      return sets.every(set => set.length === 1 && set[0] === sets[0][0]);
    });
    if (idx === -1) return; // content changed; the generic coverage test below still guards
    expect(resolveChainStageFaction('accord_council', idx)).toBe(sets1(chain, idx));
  });

  function sets1(chain: (typeof CHAIN_DEFINITIONS)[number], idx: number): string {
    return Object.keys(chain.stages[idx].choices![0].consequence!.factionRep!)[0];
  }

  it('refuses to attribute a two-sided "pick a side" stage', () => {
    // Every stage where the branches touch DIFFERENT factions must stay
    // unattributed — nobody is speaking, the player is choosing between them.
    for (const chain of CHAIN_DEFINITIONS) {
      chain.stages.forEach((stage, idx) => {
        if (!stage.choices || stage.choices.length < 2) return;
        const sets = stage.choices.map(c => Object.keys(c.consequence?.factionRep ?? {}));
        const common = sets[0].filter(f => sets.every(s => s.includes(f)));
        if (common.length === 1) return; // attributable — checked elsewhere
        expect(resolveChainStageFaction(chain.id, idx)).toBeNull();
      });
    }
  });

  it('returns null for unknown chains, info stages and out-of-range indices', () => {
    expect(resolveChainStageFaction('no-such-chain', 0)).toBeNull();
    expect(resolveChainStageFaction('accord_council', 999)).toBeNull();
    const infoStage = CHAIN_DEFINITIONS
      .flatMap(c => c.stages.map((s, i) => ({ c, s, i })))
      .find(x => x.s.kind === 'info')!;
    expect(resolveChainStageFaction(infoStage.c.id, infoStage.i)).toBeNull();
  });

  // Coverage guard: the intersection rule must not be dead code. If a future
  // content edit removes every attributable stage, this fails loudly rather
  // than silently reverting all chain decisions to the plain modal.
  it('attributes a meaningful number of real chain stages', () => {
    let attributed = 0;
    let choiceStages = 0;
    for (const chain of CHAIN_DEFINITIONS) {
      chain.stages.forEach((stage, idx) => {
        if (!stage.choices || stage.choices.length === 0) return;
        choiceStages++;
        if (resolveChainStageFaction(chain.id, idx)) attributed++;
      });
    }
    expect(choiceStages).toBeGreaterThan(5);
    expect(attributed).toBeGreaterThanOrEqual(3);
    // …and it must stay CONSERVATIVE: if it fired on nearly everything the
    // rule would be attributing decisions nobody actually owns.
    expect(attributed).toBeLessThan(choiceStages);
  });
});

describe('resolveChoiceSpeaker', () => {
  it('has no speaker for a one-shot random event', () => {
    expect(resolveChoiceSpeaker({})).toBeNull();
    expect(resolveChoiceSpeaker(null)).toBeNull();
    expect(resolveChoiceSpeaker(undefined)).toBeNull();
  });

  it('gives a Story Chapter the faction leader the chapter itself declares', () => {
    for (const chapter of CHAPTER_DEFINITIONS) {
      const speaker = resolveChoiceSpeaker({ chapterId: chapter.id });
      if (!chapter.factionId) {
        expect(speaker).toBeNull();
        continue;
      }
      expect(speaker).not.toBeNull();
      expect(speaker!.id).toBe(chapter.factionId);
      expect(speaker!.portraitUrl).toBe(`/game/faction-leader-${chapter.factionId}.webp`);
    }
  });

  it('every shipped chapter declares a driving faction, so every act is spoken', () => {
    expect(CHAPTER_DEFINITIONS.every(c => !!c.factionId)).toBe(true);
  });

  it('requires a stageIndex before attributing a chain choice', () => {
    expect(resolveChoiceSpeaker({ chainId: 'accord_council' })).toBeNull();
  });
});

// ─── Retirement ────────────────────────────────────────────────────────────

describe('commanderIdFromRetirementEvent', () => {
  it('reads the definition id back out of the engine event id', () => {
    expect(commanderIdFromRetirementEvent('evt_retire_lyra-chen_1755000000000')).toBe('lyra-chen');
  });
  it('ignores unrelated events', () => {
    expect(commanderIdFromRetirementEvent('evt_hazard_123')).toBeNull();
    expect(commanderIdFromRetirementEvent('evt_retire_')).toBeNull();
  });
});

describe('detectLeaderMomentsFromEvents', () => {
  it('builds a retirement moment for a real commander', () => {
    const def = COMMANDER_DEFS[0];
    const [moment] = detectLeaderMomentsFromEvents([evt(`evt_retire_${def.id}_1700000000000`)]);
    expect(moment.kind).toBe('retirement');
    expect(moment.speaker.name).toBe(def.name);
    expect(moment.message).toContain(def.name);
    // The status must be a WORD, not a colour — greyscale/SR safety.
    expect(moment.statusLabel.trim().length).toBeGreaterThan(0);
  });

  it('ignores retirement events for ids not on the roster', () => {
    expect(detectLeaderMomentsFromEvents([evt('evt_retire_ghost-officer_1')])).toEqual([]);
  });

  it('ignores every other kind of event', () => {
    expect(detectLeaderMomentsFromEvents([evt('evt_milestone_1'), evt('evt_hazard_2')])).toEqual([]);
  });
});

// ─── Standing ──────────────────────────────────────────────────────────────

describe('detectStandingMoments', () => {
  const F: FactionId = 'echo-remnants';

  it('fires only when the tier boundary is actually crossed', () => {
    // 0 -> 9 is neutral -> neutral: no moment, even though rep moved.
    expect(detectStandingMoments({ [F]: 0 }, { [F]: 9 }, 't')).toEqual([]);
    // 9 -> 10 crosses neutral -> friendly.
    expect(getStanding(9)).toBe('neutral');
    expect(getStanding(10)).toBe('friendly');
    expect(detectStandingMoments({ [F]: 9 }, { [F]: 10 }, 't')).toHaveLength(1);
  });

  it('names the new tier in the status text, not just a colour', () => {
    const [m] = detectStandingMoments({ [F]: 9 }, { [F]: 55 }, 't');
    expect(m.statusLabel).toContain('Allied');
    expect(m.statusLabel).toContain('Improved to');
  });

  it('words a downgrade differently from an upgrade', () => {
    const [m] = detectStandingMoments({ [F]: 20 }, { [F]: -60 }, 't');
    expect(m.statusLabel).toContain('Fallen to');
    expect(m.statusLabel).toContain('Hostile');
    expect(m.speaker.affiliation).toBe('Echo Remnants');
  });

  it('treats a missing prior reading as neutral, not as a crossing', () => {
    expect(detectStandingMoments(undefined, { [F]: 3 }, 't')).toEqual([]);
    expect(detectStandingMoments({}, { [F]: 60 }, 't')).toHaveLength(1);
  });

  it('ignores keys that are not real factions', () => {
    expect(detectStandingMoments({}, { 'made-up': 90 } as never, 't')).toEqual([]);
  });

  it('handles several factions moving in the same tick', () => {
    const moments = detectStandingMoments(
      { 'echo-remnants': 0, 'the-dominion': 0 },
      { 'echo-remnants': 60, 'the-dominion': -60 },
      't',
    );
    expect(moments).toHaveLength(2);
    expect(new Set(moments.map(m => m.id)).size).toBe(2);
  });
});

// ─── Queue ─────────────────────────────────────────────────────────────────

describe('leader moment queue', () => {
  const make = (id: string): LeaderMoment => ({
    id,
    kind: 'appointment',
    speaker: resolveCommanderSpeaker(COMMANDER_DEFS[0].id)!,
    eyebrow: 'e',
    message: 'm',
    statusLabel: 's',
  });

  it('dedupes by id so a re-render cannot double-queue a moment', () => {
    const q = enqueueLeaderMoments([make('a')], [make('a'), make('b')]);
    expect(q.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('caps the queue so a returning player is not buried in modals', () => {
    const many = Array.from({ length: MAX_LEADER_QUEUE + 4 }, (_, i) => make(`m${i}`));
    expect(enqueueLeaderMoments([], many)).toHaveLength(MAX_LEADER_QUEUE);
  });

  it('dequeues from the head and tolerates an empty queue', () => {
    expect(dequeueLeaderMoment([make('a'), make('b')]).map(m => m.id)).toEqual(['b']);
    expect(dequeueLeaderMoment([])).toEqual([]);
  });
});

describe('speakerMonogram', () => {
  it('uses first and last initials', () => {
    expect(speakerMonogram('Valeria Starforge')).toBe('VS');
    expect(speakerMonogram('Magnus  Varna')).toBe('MV');
    expect(speakerMonogram('Dr. Amara Reyes Voss')).toBe('DV');
  });
  it('degrades for single names and empty input', () => {
    expect(speakerMonogram('Kraal')).toBe('KR');
    expect(speakerMonogram('   ')).toBe('?');
  });
});

describe('roster integrity for portrait moments', () => {
  it('every commander id in COMMANDER_MAP round-trips through a retirement event id', () => {
    for (const id of Array.from(COMMANDER_MAP.keys())) {
      expect(commanderIdFromRetirementEvent(`evt_retire_${id}_1700000000000`)).toBe(id);
    }
  });
});
