/**
 * Stale-bundle recovery (2026-09-11). After a deploy, a visitor with an
 * older page open can request a JS chunk that no longer exists; the app
 * throws "Loading chunk N failed" / ChunkLoadError and shows the error
 * boundary. One automatic reload fetches the current bundle. The
 * sessionStorage flag stops a reload loop if the error is something else.
 */
const KEY = 'spacenexus-chunk-reload';

export function isChunkLoadError(error: { message?: string; name?: string } | null | undefined): boolean {
  if (!error) return false;
  return /Loading chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(`${error.name || ''} ${error.message || ''}`);
}

/** Returns true when a reload was triggered (the caller should render nothing). */
export function reloadOnceForChunkError(error: { message?: string; name?: string } | null | undefined): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false; // already reloaded within the last minute
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: still worth one reload */ }
  window.location.reload();
  return true;
}
