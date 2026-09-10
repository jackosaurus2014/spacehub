/**
 * Cloud save (2026-09-09): a signed-in player's full client state rides
 * along with the periodic sync and can be restored on another device.
 */
import fs from 'fs';
import path from 'path';
import { getNewGameState, migrateLoadedState } from '../save-load';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('cloud save', () => {
  it('migrateLoadedState brings a current save through unchanged and rejects an old epoch', () => {
    const fresh = getNewGameState();
    const roundTripped = JSON.parse(JSON.stringify(fresh));
    const migrated = migrateLoadedState(roundTripped);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(fresh.version);
    expect(migrated!.tickSpeed).toBe(1);
    expect(migrateLoadedState({ ...roundTripped, worldEpoch: 0 })).toBeNull();
    expect(migrateLoadedState({} as never)).toBeNull();
  });

  it('local load and cloud restore share one migration path', () => {
    const src = read('src/lib/game/save-load.ts');
    expect(src).toMatch(/return migrateLoadedState\(state\);/);
    expect(src).toMatch(/export function migrateLoadedState\(/);
  });

  it('the sync hook pushes the full state on a throttle and the route stores it bounded', () => {
    const hook = read('src/hooks/useGameSync.ts');
    expect(hook).toMatch(/CLOUD_SAVE_INTERVAL_MS = 5 \* 60_000/);
    expect(hook).toMatch(/cloudSave: state, cloudSavedAt: Date\.now\(\)/);
    const route = read('src/app/api/space-tycoon/sync/route.ts');
    expect(route).toMatch(/CLOUD_SAVE_MAX_BYTES = 2_000_000/);
    expect(route).toMatch(/cloudSave: blob as object/);
    const schema = read('prisma/schema.prisma');
    expect(schema).toMatch(/cloudSave\s+Json\?/);
    expect(schema).toMatch(/cloudSavedAt\s+DateTime\?/);
  });

  it('the start menu offers the cloud save and the page runs migrations before offering it', () => {
    const menu = read('src/components/game/GameStartMenu.tsx');
    expect(menu).toMatch(/Continue from cloud/);
    const page = read('src/app/space-tycoon/page.tsx');
    expect(page).toMatch(/fetch\('\/api\/space-tycoon\/cloud-save'\)/);
    expect(page).toMatch(/migrateLoadedState\(data\.save as GameState\)/);
  });
});
