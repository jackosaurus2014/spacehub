/**
 * USML categories that are space (Jay's ruling, 2026-09-11: "Cat XI doesn't
 * come up often in the space context"). IV = launch vehicles / missiles,
 * XV = spacecraft. A regulatory document whose subject is another category
 * (XI military electronics, VIII aircraft, XII sensors, …) is skipped unless
 * it also talks about space, satellites, launch or orbit. Documents that name
 * no category are unaffected: general ITAR/EAR rules still qualify.
 */
const SPACE_USML_CATEGORIES = new Set(['IV', 'XV']);
const SPACE_TERMS = /\b(space|spacecraft|satellite|satellites|launch vehicle|launch|orbit|orbital|rocket|propulsion|remote sensing|GNSS|GPS|lunar|missile)\b/i;
const CATEGORY_MENTION = /\bCategor(?:y|ies)\s+((?:[IVX]{1,5})(?:\s*\([a-z0-9]+\))?(?:\s*(?:,|and|&)\s*[IVX]{1,5}(?:\s*\([a-z0-9]+\))?)*)/gi;

export function isNonSpaceUsmlDocument(title: string | null | undefined, summary: string | null | undefined): boolean {
  const text = (title || '') + ' ' + (summary || '');
  const cats = new Set<string>();
  for (const m of text.matchAll(CATEGORY_MENTION)) {
    for (const c of m[1].matchAll(/[IVX]{1,5}/g)) cats.add(c[0].toUpperCase());
  }
  if (cats.size === 0) return false;
  if ([...cats].some((c) => SPACE_USML_CATEGORIES.has(c))) return false;
  return !SPACE_TERMS.test(text);
}
