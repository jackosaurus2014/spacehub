/**
 * Why won't the Build panel let me build this? (2026-09-14)
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-materials-diag.ts <email> <buildingId> <locationId>
 *
 * Runs the SAME checkLocalMaterials the Build panel runs, against the
 * player's own cloud save, and prints every term it used: whether the
 * location economy is active, whether this location draws on the home pool or
 * its own stockpile, what the recipe wants, what is actually at the site, and
 * where else in the corporation the missing units are sitting.
 *
 * Built because a founder with 80 aluminium was refused a build costing 20.
 * Once `logisticsUnlocked` is true, materials must be AT the build location —
 * a home-pool balance does not count anywhere but the home cluster — and the
 * panel was not saying so loudly enough.
 *
 * Read-only. Prints `HEX <hex JSON>`.
 */
import prisma from '../src/lib/db';
import { BUILDING_MAP, checkBuildingCap } from '../src/lib/game/buildings';
import {
  checkLocalMaterials,
  getLocationInventory,
  isHomeLocation,
  isLocationEconomyActive,
} from '../src/lib/game/cargo-logistics';
import { canStartConstruction, getConstructionSlots, getActiveConstructions } from '../src/lib/game/construction-slots';
import { checkOrbitalSlotGate } from '../src/lib/game/spatial-strategy';
import { getResearchBonuses } from '../src/lib/game/research-tree';
import { scaledBuildingCost } from '../src/lib/game/formulas';
import type { GameState } from '../src/lib/game/types';

function hex(v: unknown): string {
  return Buffer.from(JSON.stringify(v)).toString('hex');
}

async function main() {
  const [email, buildingId, locationId] = process.argv.slice(2);
  if (!email || !buildingId || !locationId) {
    console.error('usage: tycoon-materials-diag.ts <email> <buildingId> <locationId>');
    process.exit(2);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { gameProfile: { select: { companyName: true, cloudSave: true, cloudSavedAt: true } } },
  });
  const save = user?.gameProfile?.cloudSave as unknown;
  if (!save) {
    console.log('HEX ' + hex({ error: `no cloud save for ${email}` }));
    return;
  }
  const state = save as GameState;
  const def = BUILDING_MAP.get(buildingId);
  if (!def) {
    console.log('HEX ' + hex({ error: `no building ${buildingId}` }));
    return;
  }

  const cost = def.resourceCost || {};
  const check = checkLocalMaterials(state, locationId, cost);
  const home = state.resources || {};
  const atSite = getLocationInventory(state, locationId);

  // Everywhere the corporation is holding any of the required resources.
  const whereIsIt: Record<string, Record<string, number>> = {};
  for (const resId of Object.keys(cost)) {
    const found: Record<string, number> = {};
    if ((home[resId] || 0) > 0) found['HOME POOL (earth/leo/geo)'] = home[resId];
    for (const [loc, inv] of Object.entries(state.locationInventories || {})) {
      const qty = (inv as Record<string, number>)[resId] || 0;
      if (qty > 0) found[loc] = qty;
    }
    whereIsIt[resId] = found;
  }

  console.log('HEX ' + hex({
    company: user?.gameProfile?.companyName,
    savedAt: user?.gameProfile?.cloudSavedAt,
    building: def.name,
    locationId,
    recipe: cost,
    logisticsUnlocked: state.logisticsUnlocked === true,
    isHomeLocation: isHomeLocation(locationId),
    locationEconomyActive: isLocationEconomyActive(state),
    // The single most important line: false means the home balance is irrelevant here.
    drawsOnHomePool: check.usesHomePool,
    stockAtSite: atSite,
    homePool: { aluminum: home.aluminum || 0, rare_earth: home.rare_earth || 0 },
    shortfalls: check.shortfalls,
    canBuild: check.ok,
    whereIsIt,
    money: state.money,
    buildingCost: def.baseCost,

    // ── every OTHER gate handleBuild and BuildPanel apply ──────────────────
    // Materials turned out not to be the blocker for the founder's Lunar
    // Orbital Solar Array, so this diagnostic covers the whole gate list
    // rather than one of them.
    gates: (() => {
      const count = state.buildings.filter(b => b.definitionId === buildingId && b.locationId === locationId).length;
      const { buildCostReduction } = getResearchBonuses(
        state.completedResearch, state.repeatableResearchLevels, state.corporationTier || 1,
      );
      const localCost = Math.round(scaledBuildingCost(def.baseCost, count) * (1 - buildCostReduction));
      const slotGate = checkOrbitalSlotGate(state, locationId);
      const capGate = checkBuildingCap(state.buildings, def);
      const missingResearch = (def.requiredResearch || []).filter(r => !(state.completedResearch || []).includes(r));
      return {
        locationUnlocked: (state.unlockedLocations || []).includes(locationId),
        missingResearch,
        scaledCost: localCost,
        affordable: state.money >= localCost,
        constructionSlots: getConstructionSlots(state),
        activeConstructions: getActiveConstructions(state),
        slotsFree: canStartConstruction(state),
        orbitalSlotGate: slotGate,
        buildingCap: capGate,
        copiesHere: count,
        inProgress: (state.buildings || [])
          .filter(b => !b.isComplete)
          .map(b => ({ id: b.definitionId, at: b.locationId })),
      };
    })(),
  }));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
