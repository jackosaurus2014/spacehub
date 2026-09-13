/**
 * Why does a building project a loss for one player? (2026-09-14)
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-build-preview-diag.ts <email> <buildingId> <locationId>
 *
 * Loads that profile's cloud save and runs the SAME computeBuildPreview the
 * Build panel runs, printing every term plus the inputs that scale revenue
 * (power ratio at the location, demand multiplier, saturation from existing
 * copies, congestion on maintenance). Prints `HEX <hex JSON>`.
 */
import prisma from '../src/lib/db';
import { computeBuildPreview } from '../src/lib/game/build-preview';
import { BUILDING_MAP, getPowerByLocation } from '../src/lib/game/buildings';
import { SERVICE_MAP } from '../src/lib/game/services';
import { getServiceDemandMultiplier } from '../src/lib/game/service-pricing';
import type { GameState } from '../src/lib/game/types';

async function main() {
  const [email, buildingId, locationId] = process.argv.slice(2);
  if (!email || !buildingId || !locationId) {
    console.error('usage: tycoon-build-preview-diag.ts <email> <buildingId> <locationId>');
    process.exit(2);
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { gameProfile: { select: { id: true, companyName: true, cloudSave: true, cloudSavedAt: true } } },
  });
  const gp = user?.gameProfile;
  if (!gp?.cloudSave) { console.error('no cloud save for ' + email); process.exit(1); }
  const parsed = typeof gp.cloudSave === 'string' ? JSON.parse(gp.cloudSave) : gp.cloudSave;
  const state = (parsed?.state ?? parsed) as GameState;
  const def = BUILDING_MAP.get(buildingId);
  if (!def) { console.error('unknown building ' + buildingId); process.exit(1); }

  const preview = computeBuildPreview(state, def, locationId);
  const power = getPowerByLocation(state.buildings || [])[locationId] || null;
  const here = (state.buildings || []).filter((b) => b.locationId === locationId);
  const services = (def.enabledServices || []).map((id) => {
    const s = SERVICE_MAP.get(id);
    return s ? { id, revenue: s.revenuePerMonth, operating: s.operatingCostPerMonth, demandMult: getServiceDemandMultiplier(state, id, locationId, 0) } : { id, missing: true };
  });

  console.log('HEX ' + Buffer.from(JSON.stringify({
    company: gp.companyName, savedAt: gp.cloudSavedAt, building: def.name, locationId,
    preview, power,
    buildingsAtLocation: here.map((b) => ({ id: b.definitionId, complete: b.isComplete, mothballed: (b as { status?: string }).status })),
    sameDefinitionAtLocation: here.filter((b) => b.definitionId === buildingId).length,
    services,
  })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
