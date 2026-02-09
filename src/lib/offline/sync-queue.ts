import { getAll, put, remove } from './idb-store';

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  createdAt: string;
  retryCount: number;
}

const STORE_NAME = 'sync-queue';
const MAX_RETRIES = 3;

/**
 * Add an action to the offline sync queue.
 */
export async function enqueueAction(
  action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount'>
): Promise<void> {
  const entry: OfflineAction = {
    ...action,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await put(STORE_NAME, entry);
}

/**
 * Process all queued actions sequentially.
 * Returns count of successful and failed actions.
 */
export async function processQueue(): Promise<{ success: number; failed: number }> {
  const actions = await getAll<OfflineAction>(STORE_NAME);
  let success = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      if (response.ok) {
        await remove(STORE_NAME, action.id);
        success++;
      } else if (action.retryCount >= MAX_RETRIES) {
        await remove(STORE_NAME, action.id);
        failed++;
      } else {
        await put(STORE_NAME, { ...action, retryCount: action.retryCount + 1 });
        failed++;
      }
    } catch {
      if (action.retryCount >= MAX_RETRIES) {
        await remove(STORE_NAME, action.id);
        failed++;
      } else {
        await put(STORE_NAME, { ...action, retryCount: action.retryCount + 1 });
        failed++;
      }
    }
  }

  // Dispatch event for UI notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-queue-processed', {
      detail: { success, failed },
    }));
  }

  return { success, failed };
}

/**
 * Get the number of pending actions in the queue.
 */
export async function getQueueSize(): Promise<number> {
  const actions = await getAll<OfflineAction>(STORE_NAME);
  return actions.length;
}
