/**
 * Saved jobs (2026-09-10): stored in the browser first, the way the game
 * saves, so nobody needs an account to keep a shortlist; signed-in members
 * are nudged to keep it on their account.
 */
export const SAVED_JOBS_KEY = 'spacenexus_saved_jobs';
export const SAVED_JOBS_EVENT = 'spacenexus:saved-jobs';

export interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  savedAt: string;
}

export function readSavedJobs(): SavedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    const list = raw ? (JSON.parse(raw) as SavedJob[]) : [];
    return Array.isArray(list) ? list.filter((j) => j && typeof j.id === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: SavedJob[]) {
  try {
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(list.slice(0, 200)));
    window.dispatchEvent(new CustomEvent(SAVED_JOBS_EVENT));
  } catch { /* storage unavailable */ }
}

export function isJobSaved(id: string): boolean {
  return readSavedJobs().some((j) => j.id === id);
}

export function toggleSavedJob(job: Omit<SavedJob, 'savedAt'>): boolean {
  const list = readSavedJobs();
  const i = list.findIndex((j) => j.id === job.id);
  if (i >= 0) { list.splice(i, 1); write(list); return false; }
  write([{ ...job, savedAt: new Date().toISOString() }, ...list]);
  return true;
}

export function removeSavedJob(id: string) {
  write(readSavedJobs().filter((j) => j.id !== id));
}
