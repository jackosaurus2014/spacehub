/**
 * Live-Service Wave LS7 — economic-seasons.ts (commodity super-cycles).
 * Covers: deterministic theme scheduling, bias-lookup bounds (BALANCE.md
 * "bounded ±25%"), and the seasonal mean-reversion target hook.
 */
import {
  SUPER_CYCLE_THEMES,
  MAX_SUPER_CYCLE_BIAS,
  getSuperCycleForSeason,
  getResourceBias,
  getResourceBiasBySlug,
  getSeasonalMeanRevertTarget,
  formatBiasLabel,
  getThemeHeadlines,
} from '../economic-seasons';
import { RESOURCES } from '../resources';

describe('economic-seasons: getSuperCycleForSeason determinism', () => {
  test('same season number always returns the same theme', () => {
    const a = getSuperCycleForSeason(9);
    const b = getSuperCycleForSeason(9);
    expect(a.id).toBe(b.id);
  });

  test('every theme in the catalog is reachable', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 60; n++) {
      seen.add(getSuperCycleForSeason(n).id);
    }
    expect(seen.size).toBe(SUPER_CYCLE_THEMES.length);
  });

  test('adjacent seasons never repeat the same theme', () => {
    let prev = getSuperCycleForSeason(1).id;
    for (let n = 2; n <= 100; n++) {
      const cur = getSuperCycleForSeason(n).id;
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });

  test('season numbers below 1 clamp to season 1', () => {
    expect(getSuperCycleForSeason(0).id).toBe(getSuperCycleForSeason(1).id);
    expect(getSuperCycleForSeason(-5).id).toBe(getSuperCycleForSeason(1).id);
  });
});

describe('economic-seasons: bias bounds', () => {
  test('every authored theme bias is inside ±MAX_SUPER_CYCLE_BIAS', () => {
    for (const theme of SUPER_CYCLE_THEMES) {
      for (const bias of Object.values(theme.categoryBias)) {
        expect(Math.abs(bias as number)).toBeLessThanOrEqual(MAX_SUPER_CYCLE_BIAS);
      }
      for (const bias of Object.values(theme.resourceOverrides || {})) {
        expect(Math.abs(bias as number)).toBeLessThanOrEqual(MAX_SUPER_CYCLE_BIAS);
      }
    }
  });

  test('getResourceBias clamps a defensively out-of-band value', () => {
    const wildTheme = {
      id: 'wild', name: 'Wild', icon: '❓', description: 'test',
      categoryBias: { metal: 999 },
    };
    const bias = getResourceBias(wildTheme, 'iron');
    expect(bias).toBe(MAX_SUPER_CYCLE_BIAS);
  });

  test('getResourceBiasBySlug clamps a defensively out-of-band negative value', () => {
    const wildTheme = {
      id: 'wild', name: 'Wild', icon: '❓', description: 'test',
      categoryBias: { water: -999 },
    };
    const bias = getResourceBiasBySlug(wildTheme, 'lunar_water', 'water');
    expect(bias).toBe(-MAX_SUPER_CYCLE_BIAS);
  });

  test('resourceOverrides take precedence over categoryBias', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'volatiles_boom')!;
    const categoryBias = theme.categoryBias.exotic!;
    const overrideBias = getResourceBias(theme, 'helium3');
    expect(overrideBias).not.toBe(categoryBias);
    expect(overrideBias).toBe(theme.resourceOverrides!.helium3);
  });

  test('a category/resource the theme does not mention has zero bias', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'metals_squeeze')!;
    expect(getResourceBias(theme, 'rare_earth')).toBe(0);
  });

  test('every RESOURCES entry resolves without throwing for every theme', () => {
    for (const theme of SUPER_CYCLE_THEMES) {
      for (const r of RESOURCES) {
        const bias = getResourceBias(theme, r.id);
        expect(Math.abs(bias)).toBeLessThanOrEqual(MAX_SUPER_CYCLE_BIAS);
      }
    }
  });
});

describe('economic-seasons: getSeasonalMeanRevertTarget', () => {
  test('applies the season bias to basePrice', () => {
    // Find a season where volatiles_boom is active for a deterministic check.
    let seasonNumber = 1;
    while (getSuperCycleForSeason(seasonNumber).id !== 'volatiles_boom' && seasonNumber < 200) seasonNumber++;
    const basePrice = 50_000;
    const target = getSeasonalMeanRevertTarget(basePrice, 'lunar_water', 'water', seasonNumber);
    // volatiles_boom: water +0.20
    expect(target).toBe(Math.round(basePrice * 1.20));
  });

  test('never returns a non-positive price even at -25%', () => {
    const target = getSeasonalMeanRevertTarget(1, 'iron', 'metal', 5);
    expect(target).toBeGreaterThanOrEqual(1);
  });

  test('is deterministic for identical inputs', () => {
    const a = getSeasonalMeanRevertTarget(25_000, 'titanium', 'metal', 12);
    const b = getSeasonalMeanRevertTarget(25_000, 'titanium', 'metal', 12);
    expect(a).toBe(b);
  });

  test('a resource in an untouched category reverts to unmodified basePrice', () => {
    const theme = getSuperCycleForSeason(3);
    // Pick a category this theme doesn't mention, if one exists.
    const categories = ['water', 'metal', 'precious', 'rare_earth', 'hydrocarbon', 'exotic'] as const;
    const untouched = categories.find(c => theme.categoryBias[c] === undefined);
    if (untouched) {
      const target = getSeasonalMeanRevertTarget(10_000, 'some_slug', untouched, 3);
      expect(target).toBe(10_000);
    }
  });
});

describe('economic-seasons: formatBiasLabel / getThemeHeadlines', () => {
  test('formatBiasLabel returns null for an untouched resource', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'metals_squeeze')!;
    expect(formatBiasLabel(theme, 'rare_earth')).toBeNull();
  });

  test('formatBiasLabel returns a demand label for a positive bias', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'metals_squeeze')!;
    const label = formatBiasLabel(theme, 'iron');
    expect(label).toMatch(/demand \+22%/);
  });

  test('formatBiasLabel returns a glut label for a negative bias', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'volatiles_boom')!;
    const label = formatBiasLabel(theme, 'helium3');
    expect(label).toMatch(/glut -15%/);
  });

  test('getThemeHeadlines is sorted by magnitude descending and matches formatBiasLabel', () => {
    const theme = SUPER_CYCLE_THEMES.find(t => t.id === 'volatiles_boom')!;
    const headlines = getThemeHeadlines(theme);
    expect(headlines.length).toBeGreaterThan(0);
    for (let i = 1; i < headlines.length; i++) {
      expect(Math.abs(headlines[i - 1].bias)).toBeGreaterThanOrEqual(Math.abs(headlines[i].bias));
    }
    const he3 = headlines.find(h => h.resourceId === 'helium3');
    expect(he3?.label).toBe(formatBiasLabel(theme, 'helium3'));
  });
});
