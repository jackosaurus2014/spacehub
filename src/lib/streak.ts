// Streak tracking utility using localStorage
// No React dependencies - pure utility module

const STORAGE_KEY = 'spacenexus-streak';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string; // YYYY-MM-DD
  totalVisits: number;
}

export interface MilestoneInfo {
  threshold: number;
  label: string;
  emoji: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'legend';
}

const MILESTONES: MilestoneInfo[] = [
  { threshold: 365, label: 'Orbital Master', emoji: '\u{1F30D}', tier: 'legend' },
  { threshold: 100, label: 'Legend', emoji: '\u{1F451}', tier: 'master' },
  { threshold: 60, label: 'Space Commander', emoji: '\u{1F3C6}', tier: 'diamond' },
  { threshold: 30, label: 'Mission Veteran', emoji: '\u2B50', tier: 'platinum' },
  { threshold: 14, label: 'Dedicated Explorer', emoji: '\u{1F680}', tier: 'gold' },
  { threshold: 7, label: 'Week Warrior', emoji: '\u{1F525}', tier: 'silver' },
  { threshold: 3, label: 'Getting Started', emoji: '\u{1F331}', tier: 'bronze' },
];

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterday(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidStreakData(data: unknown): data is StreakData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.currentStreak === 'number' &&
    typeof d.longestStreak === 'number' &&
    typeof d.lastVisitDate === 'string' &&
    typeof d.totalVisits === 'number' &&
    d.currentStreak >= 0 &&
    d.longestStreak >= 0 &&
    d.totalVisits >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.lastVisitDate)
  );
}

function getDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastVisitDate: '',
    totalVisits: 0,
  };
}

function readStorage(): StreakData {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultStreak();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStreak();
    const parsed = JSON.parse(raw);
    if (!isValidStreakData(parsed)) {
      // Corrupted data -- wipe it
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultStreak();
    }
    return parsed;
  } catch {
    // JSON parse error or storage access error
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage completely unavailable
    }
    return getDefaultStreak();
  }
}

function writeStorage(data: StreakData): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable -- silently fail
  }
}

/**
 * Record a visit. Call on page load.
 * - If lastVisitDate is today: no-op (returns current data unchanged).
 * - If lastVisitDate is yesterday: increment streak.
 * - If lastVisitDate is older or missing: reset streak to 1.
 * Always increments totalVisits when the day is new.
 *
 * Returns the updated streak data.
 */
export function recordVisit(): StreakData {
  const data = readStorage();
  const today = getToday();

  // Already visited today -- no-op
  if (data.lastVisitDate === today) {
    return data;
  }

  const yesterday = getYesterday();

  if (data.lastVisitDate === yesterday) {
    // Consecutive day -- extend the streak
    data.currentStreak += 1;
  } else if (data.lastVisitDate === '') {
    // First visit ever
    data.currentStreak = 1;
  } else {
    // Streak broken -- reset
    data.currentStreak = 1;
  }

  // Update longest streak
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  data.totalVisits += 1;
  data.lastVisitDate = today;

  writeStorage(data);
  return data;
}

/**
 * Returns the current streak data without modifying it.
 */
export function getStreak(): StreakData {
  return readStorage();
}

/**
 * Returns the milestone info for a given streak number,
 * or null if no milestone has been reached yet (streak < 3).
 */
export function getMilestone(streak: number): MilestoneInfo | null {
  // MILESTONES is sorted descending by threshold
  for (const milestone of MILESTONES) {
    if (streak >= milestone.threshold) {
      return milestone;
    }
  }
  return null;
}

/**
 * Returns all milestones (sorted descending by threshold).
 */
export function getAllMilestones(): MilestoneInfo[] {
  return [...MILESTONES];
}
