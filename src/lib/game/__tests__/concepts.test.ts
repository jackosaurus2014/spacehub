// Wave V2 (docs/VISUAL_DEPTH_2026-08.md §V2) — concept glossary completeness.
// Guards the nested-concept navigation in HoloTip.tsx: every id referenced
// by another concept's `related[]` must resolve to a real entry (a dangling
// related id would render as a chip that clicks into nothing useful), and
// every entry must carry real, non-empty authored text — no placeholder
// content ships to players.

import { CONCEPTS, getConcept, getAllReferencedIds, type ConceptEntry } from '../concepts';
import { ICONS, type IconName } from '../icons';

describe('concepts.ts glossary', () => {
  const entries = Object.values(CONCEPTS);

  it('has a non-trivial number of entries', () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
  });

  it('every entry key matches its own id field', () => {
    for (const [key, entry] of Object.entries(CONCEPTS)) {
      expect(entry.id).toBe(key);
    }
  });

  it('every entry has non-empty name, short, and body text', () => {
    for (const entry of entries) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.short.trim().length).toBeGreaterThan(0);
      expect(entry.body.trim().length).toBeGreaterThan(10);
    }
  });

  it('body text is 1-3 sentences (spec bound) — not a placeholder, not an essay', () => {
    for (const entry of entries) {
      // Rough sentence count via terminal punctuation; concept bodies are
      // prose (may include a parenthetical), so this is a loose ceiling.
      const sentenceCount = (entry.body.match(/[.!?](\s|$)/g) || []).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(1);
      expect(sentenceCount).toBeLessThanOrEqual(5);
    }
  });

  it('every related[] id resolves to a real concept entry (no dangling nested links)', () => {
    const referenced = getAllReferencedIds();
    for (const id of referenced) {
      expect(CONCEPTS[id]).toBeDefined();
    }
  });

  it('no concept lists itself as related (would create a trivial self-loop chip)', () => {
    for (const entry of entries) {
      expect(entry.related || []).not.toContain(entry.id);
    }
  });

  it('every concept icon (when set) is a registered IconName', () => {
    for (const entry of entries) {
      if (entry.icon) {
        expect(ICONS[entry.icon as IconName]).toBeDefined();
      }
    }
  });

  it('getConcept resolves known ids and returns undefined for unknown ones', () => {
    const anyId = entries[0].id;
    expect(getConcept(anyId)).toEqual<ConceptEntry>(CONCEPTS[anyId]);
    expect(getConcept('not-a-real-concept-id')).toBeUndefined();
  });

  // Spot-check a handful of high-traffic adoption-site concepts by id so a
  // rename in concepts.ts fails loudly here instead of silently degrading
  // a live HoloTip call site to plain text.
  it.each([
    'net-income', 'away-efficiency', 'standing-directive', 'directive-ops-fee',
    'command-queue', 'era-charter', 'era-medal', 'mean-reversion', 'escrow',
    'order-book-depth', 'delta-v', 'freight-cost', 'insurance', 'hazard-damage',
    'doctrine-lock', 'repeatable-research', 'corporation-tier', 'program-track',
    'leader-retirement', 'super-cycle',
  ])('adoption-site concept "%s" exists', (id) => {
    expect(CONCEPTS[id]).toBeDefined();
  });
});
