/**
 * NASA EONET (Earth Observatory Natural Event Tracker) Data Fetcher
 *
 * Fetches active natural events visible from space, including wildfires,
 * volcanoes, severe storms, sea/lake ice, and more.
 *
 * API docs: https://eonet.gsfc.nasa.gov/docs/v3
 * No API key required.
 *
 * Uses the in-memory api-cache with a 30-minute TTL.
 */

import { withCache, CACHE_TTL } from './api-cache';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EONETGeometry {
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  date: string;
  type: string;
  coordinates: number[];
}

interface EONETCategory {
  id: string;
  title: string;
}

interface EONETSource {
  id: string;
  url: string;
}

interface EONETRawEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: EONETCategory[];
  sources: EONETSource[];
  geometry: EONETGeometry[];
}

interface EONETApiResponse {
  title: string;
  description: string;
  link: string;
  events: EONETRawEvent[];
}

export interface EONETEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  categoryId: string;
  geometry: {
    type: string;
    coordinates: number[];
  } | null;
  date: string;
  link: string;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
}

export interface EONETData {
  events: EONETEvent[];
  total: number;
  categories: string[];
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const EONET_API_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20';

function parseEvent(raw: EONETRawEvent): EONETEvent {
  // Use the most recent geometry entry for coordinates and date
  const latestGeometry = raw.geometry.length > 0
    ? raw.geometry[raw.geometry.length - 1]
    : null;

  // Use the first category
  const category = raw.categories.length > 0
    ? raw.categories[0]
    : { id: 'other', title: 'Other' };

  // Use the first source URL as the link, fallback to EONET event link
  const link = raw.sources.length > 0
    ? raw.sources[0].url
    : raw.link;

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: category.title,
    categoryId: category.id,
    geometry: latestGeometry
      ? { type: latestGeometry.type, coordinates: latestGeometry.coordinates }
      : null,
    date: latestGeometry?.date ?? new Date().toISOString(),
    link,
    magnitudeValue: latestGeometry?.magnitudeValue ?? null,
    magnitudeUnit: latestGeometry?.magnitudeUnit ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch active natural events from NASA EONET.
 *
 * Results are cached for 30 minutes via the shared in-memory api-cache.
 * On fetch failure, stale data is returned if available.
 */
export async function fetchEONETEvents(): Promise<EONETData> {
  return withCache<EONETData>(
    'eonet:events',
    async () => {
      logger.info('[EONET] Fetching active events from NASA EONET');

      const response = await fetch(EONET_API_URL, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`EONET API error: ${response.status} ${response.statusText}`);
      }

      const data: EONETApiResponse = await response.json();
      const events = data.events.map(parseEvent);

      // Extract unique categories
      const categories = Array.from(new Set(events.map(e => e.category))).sort();

      logger.info('[EONET] Events fetched successfully', {
        total: events.length,
        categories: categories.length,
      });

      return {
        events,
        total: events.length,
        categories,
        fetchedAt: new Date().toISOString(),
      };
    },
    {
      ttlSeconds: CACHE_TTL.STANDARD, // 30 minutes
      staleWhileRevalidate: true,
      fallbackToStale: true,
    },
  );
}
