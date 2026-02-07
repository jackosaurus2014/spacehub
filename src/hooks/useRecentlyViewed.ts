'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'spacenexus-recently-viewed';
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  path: string;
  title: string;
  timestamp: number;
}

function readFromStorage(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(readFromStorage());
  }, []);

  const addPage = useCallback((path: string, title: string) => {
    setItems((prev) => {
      // Remove existing entry for this path (dedup)
      const filtered = prev.filter((item) => item.path !== path);
      // Add new entry at front
      const updated = [{ path, title, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      writeToStorage(updated);
      return updated;
    });
  }, []);

  const getRecent = useCallback((): RecentlyViewedItem[] => {
    return items;
  }, [items]);

  const clearRecent = useCallback(() => {
    writeToStorage([]);
    setItems([]);
  }, []);

  return { items, addPage, getRecent, clearRecent };
}

/**
 * Format a timestamp into a human-readable relative time string.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
}
