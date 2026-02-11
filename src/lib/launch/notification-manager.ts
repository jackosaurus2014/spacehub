/**
 * Client-side launch notification manager using the browser Notification API.
 * Schedules alerts at T-30m, T-10m, and T-1m before launch.
 */

const STORAGE_KEY = 'spacenexus-watched-launches';

interface WatchedLaunch {
  eventId: string;
  name: string;
  launchDate: string;
  addedAt: string;
}

// Active timeout references (not persisted)
const activeTimeouts = new Map<string, NodeJS.Timeout[]>();

export function getWatchedLaunches(): WatchedLaunch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchedLaunches(launches: WatchedLaunch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(launches));
}

export function isWatching(eventId: string): boolean {
  return getWatchedLaunches().some(l => l.eventId === eventId);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendNotification(title: string, body: string, eventId: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `launch-${eventId}`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = `/launch/${eventId}`;
      notification.close();
    };
  } catch {
    // Notification API not available in some contexts
  }
}

export function scheduleNotification(eventId: string, name: string, launchDate: string): void {
  // Cancel existing timeouts for this event
  cancelNotification(eventId);

  const launchTime = new Date(launchDate).getTime();
  const now = Date.now();
  const timeouts: NodeJS.Timeout[] = [];

  const alerts = [
    { offsetMs: 30 * 60 * 1000, label: '30 minutes' },
    { offsetMs: 10 * 60 * 1000, label: '10 minutes' },
    { offsetMs: 1 * 60 * 1000, label: '1 minute' },
  ];

  for (const alert of alerts) {
    const notifyAt = launchTime - alert.offsetMs;
    const delay = notifyAt - now;

    if (delay > 0) {
      const timeout = setTimeout(() => {
        sendNotification(
          `Launch Alert: ${name}`,
          `${name} launches in ${alert.label}!`,
          eventId
        );
      }, delay);
      timeouts.push(timeout);
    }
  }

  // Also schedule a "Launch!" notification at T-0
  const t0delay = launchTime - now;
  if (t0delay > 0) {
    const timeout = setTimeout(() => {
      sendNotification(
        `LIFTOFF: ${name}`,
        `${name} is launching NOW! Watch live.`,
        eventId
      );
    }, t0delay);
    timeouts.push(timeout);
  }

  activeTimeouts.set(eventId, timeouts);

  // Save to watched list
  const watched = getWatchedLaunches();
  if (!watched.some(l => l.eventId === eventId)) {
    watched.push({
      eventId,
      name,
      launchDate,
      addedAt: new Date().toISOString(),
    });
    saveWatchedLaunches(watched);
  }
}

export function cancelNotification(eventId: string): void {
  const timeouts = activeTimeouts.get(eventId);
  if (timeouts) {
    timeouts.forEach(clearTimeout);
    activeTimeouts.delete(eventId);
  }

  // Remove from watched list
  const watched = getWatchedLaunches().filter(l => l.eventId !== eventId);
  saveWatchedLaunches(watched);
}

/**
 * Re-schedule notifications for all watched launches (call on page load).
 */
export function restoreNotifications(): void {
  const watched = getWatchedLaunches();
  const now = Date.now();

  // Clean up past launches (more than 2 hours ago)
  const active = watched.filter(l => {
    const launchTime = new Date(l.launchDate).getTime();
    return launchTime > now - 2 * 60 * 60 * 1000;
  });

  if (active.length !== watched.length) {
    saveWatchedLaunches(active);
  }

  for (const launch of active) {
    scheduleNotification(launch.eventId, launch.name, launch.launchDate);
  }
}
