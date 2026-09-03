/**
 * Whether the WebGL (React Three Fiber) surfaces may render.
 *
 * Production incident 2026-09-03: @react-three/fiber v8 bundles
 * react-reconciler 0.29, which reads React 18's
 * `ReactSharedInternals.ReactCurrentBatchConfig`. Next.js 15's App Router
 * runs on React 19 internals, where that field no longer exists, so the
 * reconciler throws `Cannot read properties of undefined (reading
 * 'ReactCurrentBatchConfig')` the moment its module evaluates — taking down
 * the whole page, not just the canvas. Launch pages crashed outright and the
 * game map tripped its error boundary ("Mission Failure") as soon as a
 * signed-in player joined.
 *
 * Every 3D surface therefore renders its existing 2D fallback while this is
 * false. Flip it to true ONLY in the same change that upgrades React to 19
 * with @react-three/fiber v9, drei v10 and postprocessing v3 — R3F v8 cannot
 * run on React 19 at all.
 *
 * Call sites: MapCommandCenter (solar map), LaunchDayDashboard (trajectory),
 * solar-exploration page and SolarExplorationModule (planetary scene).
 */
export const THREE_D_ENABLED = false;

/** Copy shown where a 3D view is suppressed and no richer fallback exists. */
export const THREE_D_DISABLED_NOTE =
  '3D view is temporarily unavailable while we finish a rendering upgrade. Everything else on this page works normally.';
