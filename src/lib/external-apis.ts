// External API Configuration and Utilities for Real-Time Data Integration

export const EXTERNAL_APIS = {
  NASA_DONKI: {
    baseUrl: 'https://api.nasa.gov/DONKI',
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
    rateLimit: { requests: 1000, period: 3600 },
  },
  NOAA_SWPC: {
    baseUrl: 'https://services.swpc.noaa.gov',
    rateLimit: { requests: 100, period: 3600 },
  },
  LAUNCH_LIBRARY: {
    baseUrl: 'https://ll.thespacedevs.com/2.2.0',
    rateLimit: { requests: 15, period: 3600 },
  },
  SPACEX: {
    baseUrl: 'https://api.spacexdata.com/v5',
    rateLimit: { requests: 50, period: 1 },
  },
  CELESTRAK: {
    baseUrl: 'https://celestrak.org/NORAD/elements',
    rateLimit: { requests: 4, period: 86400 },
  },
  SPACEFLIGHT_NEWS: {
    baseUrl: 'https://api.spaceflightnewsapi.net/v4',
    rateLimit: { requests: 100, period: 3600 },
  },
  FEDERAL_REGISTER: {
    baseUrl: 'https://www.federalregister.gov/api/v1',
    rateLimit: { requests: 100, period: 3600 },
  },
};

// Fetch with retry and exponential backoff
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options?.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      // Rate limited - wait and retry
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Server error - retry
      if (response.status >= 500) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`Server error ${response.status}, waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Client error - don't retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`Fetch error, waiting ${waitTime}ms before retry ${i + 1}/${retries}:`, error);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// NASA DONKI API helpers
export async function fetchNasaDonki(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams({
    api_key: EXTERNAL_APIS.NASA_DONKI.apiKey,
    ...params,
  });

  const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/${endpoint}?${searchParams}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// NOAA SWPC API helpers
export async function fetchNoaaSwpc(endpoint: string): Promise<unknown> {
  const url = `${EXTERNAL_APIS.NOAA_SWPC.baseUrl}${endpoint}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// Launch Library 2 API helpers
export async function fetchLaunchLibrary(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams(params);
  const url = `${EXTERNAL_APIS.LAUNCH_LIBRARY.baseUrl}/${endpoint}?${searchParams}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// SpaceX API helpers
export async function fetchSpaceX(endpoint: string): Promise<unknown> {
  const url = `${EXTERNAL_APIS.SPACEX.baseUrl}/${endpoint}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// CelesTrak API helpers
export async function fetchCelesTrak(
  group: string,
  format: 'json' | 'tle' | '3le' = 'json'
): Promise<unknown> {
  const url = `${EXTERNAL_APIS.CELESTRAK.baseUrl}/gp.php?GROUP=${group}&FORMAT=${format}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// Spaceflight News API helpers
export async function fetchSpaceflightNews(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams(params);
  const url = `${EXTERNAL_APIS.SPACEFLIGHT_NEWS.baseUrl}/${endpoint}?${searchParams}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// Federal Register API helpers
export async function fetchFederalRegister(
  params: Record<string, string> = {}
): Promise<unknown> {
  const searchParams = new URLSearchParams(params);
  const url = `${EXTERNAL_APIS.FEDERAL_REGISTER.baseUrl}/documents.json?${searchParams}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

// Date formatting helpers
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(daysBack: number, daysForward: number = 0): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  const end = new Date(now);
  end.setDate(end.getDate() + daysForward);

  return {
    startDate: formatDateForApi(start),
    endDate: formatDateForApi(end),
  };
}

// Response wrapper for consistent API responses
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  source: string;
  itemCount?: number;
}

export function createFetchResult<T>(
  source: string,
  data?: T,
  error?: string,
  itemCount?: number
): FetchResult<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: new Date().toISOString(),
    source,
    itemCount,
  };
}
