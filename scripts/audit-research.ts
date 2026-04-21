// Research audit.
//
// For every research in the game, check:
//   1. Does its `id` appear anywhere besides its own definition? (Used as
//      prerequisite? Required by a building/service/colony? Special-cased in
//      game-engine?)
//   2. Does its `category` actually grant a mechanical bonus via
//      getResearchBonuses? (If the category isn't in the switch, completing
//      the research does nothing.)
//   3. Does the flavor text (the `effect` field) match the actual mechanical
//      effect the research grants?
//
// Produces a report flagging:
//   ❌ DEAD — research does nothing (unrecognized category, no references)
//   ⚠️ FLAVOR-ONLY — research category gives a bonus but flavor text is
//       misleading / doesn't correspond to the actual effect
//   🔒 GATE-ONLY — research grants no stat bonus but IS used as a gate for
//       buildings/services/colonies (prerequisite only — still meaningful)
//   ✅ OK — research has a real effect and flavor text is reasonable

import { RESEARCH, RESEARCH_CATEGORIES, getResearchBonuses, getResearchMechanicalEffect } from '../src/lib/game/research-tree';
import { BUILDINGS } from '../src/lib/game/buildings';
import { SERVICES } from '../src/lib/game/services';
import { EXPANDED_LOCATIONS } from '../src/lib/game/colonies';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const VALID_CATEGORIES = new Set(RESEARCH_CATEGORIES.map(c => c.id));

// Categories that the getResearchBonuses switch actually handles:
const HANDLED_CATEGORIES = new Set([
  'rocketry', 'propulsion', 'mining', 'materials', 'spacecraft', 'infrastructure',
  'solar_arrays', 'services', 'economy', 'sensors', 'ai_chips', 'satellite_components',
  'crew', 'ships', 'defense', 'exploration', 'terraforming',
]);

// Grep a file for occurrences of researchId (quoted).
function fileContainsReference(contents: string, researchId: string): boolean {
  const pattern = new RegExp(`'${researchId}'|"${researchId}"|\\b${researchId}\\b`);
  return pattern.test(contents);
}

// Files we scan for direct research-id references beyond research-tree.ts itself.
const SCAN_FILES = [
  'src/lib/game/buildings.ts',
  'src/lib/game/services.ts',
  'src/lib/game/colonies.ts',
  'src/lib/game/game-engine.ts',
  'src/lib/game/formulas.ts',
  'src/lib/game/resources.ts',
  'src/lib/game/catchup-mechanics.ts',
  'src/lib/game/ships.ts',
  'src/lib/game/production-chains.ts',
  'src/lib/game/research-generator.ts',
];

function loadScanCorpus(): string {
  let corpus = '';
  for (const f of SCAN_FILES) {
    try {
      corpus += '\n' + readFileSync(join(PROJECT_ROOT, f), 'utf8');
    } catch { /* skip missing */ }
  }
  return corpus;
}

interface AuditRow {
  id: string;
  name: string;
  category: string;
  tier: number;
  flavor: string;
  mechanical: string;
  categoryHandled: boolean;
  directlyReferenced: boolean;
  usedAsPrereqBy: string[];
  usedAsBuildingGateBy: string[];
  usedAsServiceGateBy: string[];
  usedAsColonyGateBy: string[];
  specialCase: boolean;       // uses it as an engine flag (e.g. parallel_research)
  classification: 'DEAD' | 'GATE-ONLY' | 'FLAVOR-ONLY' | 'OK';
}

function audit(): AuditRow[] {
  const corpus = loadScanCorpus();
  const specialCaseIds = ['parallel_research'];  // known engine flags

  const rows: AuditRow[] = [];

  // Index: research id → research that has it as a prerequisite
  const prereqIndex = new Map<string, string[]>();
  for (const r of RESEARCH) {
    for (const p of r.prerequisites || []) {
      const arr = prereqIndex.get(p) || [];
      arr.push(r.name);
      prereqIndex.set(p, arr);
    }
  }

  for (const r of RESEARCH) {
    const categoryHandled = HANDLED_CATEGORIES.has(r.category);
    const mechanical = getResearchMechanicalEffect(r);

    // Direct references (besides research-tree.ts itself)
    const directlyReferenced = fileContainsReference(corpus, r.id);

    // Building / service / colony prerequisite usage
    const usedAsBuildingGateBy = BUILDINGS
      .filter(b => (b.requiredResearch || []).includes(r.id))
      .map(b => b.name);
    const usedAsServiceGateBy = SERVICES
      .filter(s => (s.requiredResearch || []).includes(r.id))
      .map(s => s.name);
    const usedAsColonyGateBy = (EXPANDED_LOCATIONS as any[])
      .filter(l => (l.requiredResearch || []).includes(r.id))
      .map(l => l.name);

    const usedAsPrereqBy = prereqIndex.get(r.id) || [];
    const specialCase = specialCaseIds.includes(r.id);

    let classification: AuditRow['classification'];
    if (categoryHandled) {
      classification = 'OK';  // flavor text mismatches handled separately below
    } else if (
      usedAsBuildingGateBy.length > 0 ||
      usedAsServiceGateBy.length > 0 ||
      usedAsColonyGateBy.length > 0 ||
      usedAsPrereqBy.length > 0 ||
      specialCase
    ) {
      classification = 'GATE-ONLY';
    } else {
      classification = 'DEAD';
    }

    rows.push({
      id: r.id,
      name: r.name,
      category: r.category,
      tier: r.tier,
      flavor: r.effect,
      mechanical,
      categoryHandled,
      directlyReferenced,
      usedAsPrereqBy,
      usedAsBuildingGateBy,
      usedAsServiceGateBy,
      usedAsColonyGateBy,
      specialCase,
      classification,
    });
  }

  return rows;
}

function printReport(rows: AuditRow[]) {
  console.log('\n' + '═'.repeat(120));
  console.log(`RESEARCH AUDIT — ${rows.length} research items`);
  console.log('═'.repeat(120));

  const byClass = {
    OK: rows.filter(r => r.classification === 'OK'),
    'GATE-ONLY': rows.filter(r => r.classification === 'GATE-ONLY'),
    'FLAVOR-ONLY': rows.filter(r => r.classification === 'FLAVOR-ONLY'),
    DEAD: rows.filter(r => r.classification === 'DEAD'),
  };

  console.log(`\nSummary:`);
  console.log(`  ✅ OK          : ${byClass.OK.length} — category handled, mechanical effect applies`);
  console.log(`  🔒 GATE-ONLY   : ${byClass['GATE-ONLY'].length} — no stat bonus, but gates buildings/services/colonies`);
  console.log(`  ❌ DEAD        : ${byClass.DEAD.length} — does literally nothing`);

  // ─── DEAD researches — highest priority fix ────────────────────────
  if (byClass.DEAD.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log(`❌ DEAD RESEARCHES (${byClass.DEAD.length}) — these complete with no effect and no gating:`);
    console.log('─'.repeat(120));
    for (const r of byClass.DEAD) {
      console.log(`  ${r.id.padEnd(35)} | ${r.name.padEnd(40)} | category: ${r.category.padEnd(20)} | tier ${r.tier}`);
      console.log(`    Flavor: ${r.flavor}`);
    }
  }

  // ─── GATE-ONLY researches — useful but flavor might mislead ───────
  if (byClass['GATE-ONLY'].length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log(`🔒 GATE-ONLY RESEARCHES (${byClass['GATE-ONLY'].length}) — unlock something but grant no stat bonus:`);
    console.log('─'.repeat(120));
    for (const r of byClass['GATE-ONLY']) {
      console.log(`  ${r.id.padEnd(35)} | ${r.name.padEnd(40)} | tier ${r.tier}`);
      console.log(`    Flavor: ${r.flavor}`);
      const gates: string[] = [];
      if (r.usedAsBuildingGateBy.length) gates.push(`${r.usedAsBuildingGateBy.length} buildings`);
      if (r.usedAsServiceGateBy.length)  gates.push(`${r.usedAsServiceGateBy.length} services`);
      if (r.usedAsColonyGateBy.length)   gates.push(`${r.usedAsColonyGateBy.length} colonies`);
      if (r.usedAsPrereqBy.length)       gates.push(`prereq for ${r.usedAsPrereqBy.length} research`);
      if (r.specialCase)                 gates.push('engine-special-case flag');
      console.log(`    Gates: ${gates.join(', ') || '(nothing)'}`);
    }
  }

  // ─── OK researches — quick tabular summary ────────────────────────
  console.log('\n' + '─'.repeat(120));
  console.log(`✅ OK RESEARCHES (${byClass.OK.length}) — mechanical effect applied:`);
  console.log('─'.repeat(120));
  console.log('ID                                   | Name                                     | Tier | Mechanical effect');
  console.log('─'.repeat(120));
  for (const r of byClass.OK) {
    const id = r.id.padEnd(36);
    const name = r.name.slice(0, 40).padEnd(40);
    console.log(`${id} | ${name} | T${r.tier}   | ${r.mechanical}`);
  }

  // ─── Flavor-vs-mechanical mismatch heuristic ──────────────────────
  console.log('\n' + '─'.repeat(120));
  console.log('⚠️ FLAVOR-VS-MECHANICAL MISMATCH SAMPLES — quick human-review flags:');
  console.log('─'.repeat(120));
  let flagged = 0;
  for (const r of rows) {
    if (r.classification === 'DEAD') continue;  // already reported
    // Flavor text usually names a specific number, e.g. "-15% launch cost"
    // Mechanical text names the actual percent. If the flavor's number
    // differs from the mechanical's number by a large factor, flag it.
    const flavorNums = (r.flavor.match(/(\d+(?:\.\d+)?)%/g) || []).map(s => parseFloat(s));
    const mechNums = (r.mechanical.match(/(\d+(?:\.\d+)?)%/g) || []).map(s => parseFloat(s));
    if (flavorNums.length === 0 || mechNums.length === 0) continue;

    // Compare largest number in each
    const flavorMax = Math.max(...flavorNums);
    const mechMax = Math.max(...mechNums);
    if (flavorMax === 0 || mechMax === 0) continue;
    const ratio = flavorMax / mechMax;
    // Flag if the flavor is >2x or <0.5x the mechanical
    if (ratio > 2 || ratio < 0.5) {
      flagged++;
      console.log(`  ${r.id.padEnd(36)} | flavor claims ${flavorMax}%, mechanical gives ${mechMax}% (ratio ${ratio.toFixed(1)}x)`);
      console.log(`    "${r.flavor}"  →  "${r.mechanical}"`);
    }
  }
  if (flagged === 0) {
    console.log('  (no mismatches detected)');
  } else {
    console.log(`\n  ${flagged} research items have flavor text that's ≥2x off from the mechanical value.`);
    console.log(`  Recommend: rewrite flavor to match mechanical, OR refactor research-tree.ts to`);
    console.log(`  support per-research custom effects beyond the category-tier pattern.`);
  }

  console.log('\n' + '═'.repeat(120));
}

const rows = audit();
printReport(rows);
