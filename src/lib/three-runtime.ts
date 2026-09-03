/**
 * Whether the WebGL (React Three Fiber) surfaces may render.
 *
 * Production incident 2026-09-03: @react-three/fiber v8 bundles
 * react-reconciler 0.29, which reads React 18's
 * `ReactSharedInternals.ReactCurrentBatchConfig`. Next.js 15's App Router
 * runs on React 19 internals, where that field no longer exists, so the
 * reconciler threw `Cannot read properties of undefined (reading
 * 'ReactCurrentBatchConfig')` the moment its module evaluated — taking down
 * the whole page, not just the canvas. Launch pages crashed outright and the
 * game map tripped its error boundary ("Mission Failure") as soon as a
 * signed-in player joined. Every 3D surface fell back to 2D while this was
 * false.
 *
 * RESOLVED 2026-09-03: the app now runs React 19 (19.2.8) with
 * @react-three/fiber v9, @react-three/drei v10 and
 * @react-three/postprocessing v3 — plus its `postprocessing` ^6.36 peer, which
 * v3 no longer pulls in on its own and which must stay an explicit dependency.
 * R3F v9's reconciler targets React 19 internals, so the crash is gone and the
 * 3D surfaces are live again.
 *
 * The constant stays as the kill switch: flip it back to false to route every
 * 3D surface to its 2D fallback if the WebGL stack ever regresses. Do not
 * delete it or its call sites.
 *
 * Call sites: MapCommandCenter (solar map), LaunchDayDashboard (trajectory),
 * solar-exploration page and SolarExplorationModule (planetary scene).
 */
export const THREE_D_ENABLED = true;

/** Copy shown where a 3D view is suppressed and no richer fallback exists. */
export const THREE_D_DISABLED_NOTE =
  '3D view is temporarily unavailable while we finish a rendering upgrade. Everything else on this page works normally.';
