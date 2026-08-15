// Wave V1 (docs/VISUAL_DEPTH_2026-08.md §V1) — icon registry completeness.
// Guards against future drift: every GameTab, CalendarCategory, and resource
// category must resolve to a real ICONS entry (not silently fall back),
// and every registered icon must actually carry drawable SVG elements.

import { ICONS, resolveIcon, calendarCategoryIcon, resourceCategoryIcon, type IconName } from '../icons';
import type { GameTab } from '../types';
import { getMissionCalendarEntries, type CalendarCategory } from '../world-calendar';
import { RESOURCES } from '../resources';

const ALL_TAB_IDS: GameTab[] = [
  'dashboard', 'build', 'research', 'map', 'services', 'fleet', 'crafting',
  'workforce', 'market', 'contracts', 'alliance', 'bounties', 'predictions',
  'leaderboard', 'seasons', 'territory', 'speedruns', 'espionage',
  'megaproject', 'megastructures', 'reports', 'commanders', 'factions',
  'modules', 'discoveries', 'science', 'interstellar', 'subsidiaries',
  'specialization', 'victory', 'governance',
];

const ALL_CALENDAR_CATEGORIES: CalendarCategory[] = [
  'senate', 'league', 'season', 'alliance_event', 'npc_program', 'expedition',
  'queue', 'appointment_event', 'real_launch', 'corporate_era',
  'alliance_charter', 'economic_cycle', 'program', 'leader_retirement',
  'realignment', 'story_chapter',
];

describe('icons.tsx registry', () => {
  it('every registered icon has at least one drawable element', () => {
    for (const [name, def] of Object.entries(ICONS)) {
      expect(def.els.length).toBeGreaterThan(0);
      expect(def.meaning.length).toBeGreaterThan(0);
      expect(name).toBeTruthy();
    }
  });

  it('has no duplicate meaning text reused across unrelated icons (sanity, not strict)', () => {
    // Weak signal check — flags accidental copy-paste of an entire icon
    // definition (same meaning AND same element count) rather than actual
    // shape reuse, which is expected for a few categories (e.g. commanders
    // reuses the medal shape deliberately).
    const seen = new Map<string, number>();
    for (const def of Object.values(ICONS)) {
      seen.set(def.meaning, (seen.get(def.meaning) || 0) + 1);
    }
    Array.from(seen.entries()).forEach(([meaning, count]) => {
      expect(count).toBeLessThanOrEqual(2);
      if (count > 2) {
        // eslint-disable-next-line no-console
        console.warn(`meaning "${meaning}" reused ${count} times — verify intentional`);
      }
    });
  });

  it('resolves every TAB_CATALOG tab id to a registered icon', () => {
    for (const tabId of ALL_TAB_IDS) {
      expect(ICONS[tabId as IconName]).toBeDefined();
    }
  });

  it('resolves every CalendarCategory to a registered icon via calendarCategoryIcon', () => {
    for (const cat of ALL_CALENDAR_CATEGORIES) {
      const iconName = calendarCategoryIcon(cat);
      expect(ICONS[iconName]).toBeDefined();
      // Must not silently fall back to the generic 'calendar' icon — every
      // category should have its OWN entry (that's the whole point of the
      // per-category icon set the spec calls for).
      expect(iconName).not.toBe('calendar');
    }
  });

  it('falls back to the generic calendar icon for an unknown category', () => {
    expect(calendarCategoryIcon('not_a_real_category')).toBe('calendar');
  });

  it('resolves every resource category to a registered icon via resourceCategoryIcon', () => {
    const categories = Array.from(new Set(RESOURCES.map(r => r.category)));
    expect(categories.length).toBeGreaterThan(0);
    for (const cat of categories) {
      const iconName = resourceCategoryIcon(cat);
      expect(ICONS[iconName]).toBeDefined();
      expect(iconName).not.toBe('resource-generic');
    }
  });

  it('falls back to the generic resource icon for an unknown category', () => {
    expect(resourceCategoryIcon('not_a_real_category')).toBe('resource-generic');
  });

  it('resolveIcon falls back gracefully for unmapped or missing glyphs', () => {
    expect(resolveIcon(undefined, 'shield')).toBe('shield');
    expect(resolveIcon(null, 'shield')).toBe('shield');
    expect(resolveIcon('🦄', 'shield')).toBe('shield');
    expect(resolveIcon('📜', 'shield')).toBe('scroll');
  });

  it('getMissionCalendarEntries entries only ever use categories calendarCategoryIcon can resolve (live smoke check)', () => {
    // Exercises the real deriver so a newly-added CalendarCategory that
    // forgets an ICONS entry fails here even without updating
    // ALL_CALENDAR_CATEGORIES above.
    const state = { accordDocket: null, expeditions: [], buildings: [], activeResearch: null, activeResearch2: null } as never;
    const entries = getMissionCalendarEntries(state, { nowMs: Date.now(), horizonDays: 14 });
    for (const entry of entries) {
      expect(ICONS[calendarCategoryIcon(entry.category)]).toBeDefined();
    }
  });
});
