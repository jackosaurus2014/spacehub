import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to test YouTube API directly.
 * Shows raw API responses to diagnose livestream detection issues.
 * TODO: Remove or protect behind admin auth before production.
 */
export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const results: Record<string, unknown> = {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET',
    timestamp: new Date().toISOString(),
    tests: {},
  };

  if (!apiKey) {
    return NextResponse.json({ ...results, error: 'YOUTUBE_API_KEY not set' });
  }

  const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

  // Test 1: Search NASA channel for live videos
  try {
    const url = `${YOUTUBE_API}/search?part=snippet&channelId=UCLA_DiR1FfKNvjuUpBHmylQ&eventType=live&type=video&maxResults=5&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    results.tests = {
      ...results.tests as object,
      nasaChannelLive: {
        status: res.status,
        totalResults: data.pageInfo?.totalResults ?? 0,
        items: (data.items ?? []).map((item: any) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
        })),
        error: data.error ?? null,
      },
    };
  } catch (err) {
    results.tests = { ...results.tests as object, nasaChannelLive: { error: String(err) } };
  }

  // Test 2: Broad search for "ISS live"
  try {
    const url = `${YOUTUBE_API}/search?part=snippet&q=ISS+live&eventType=live&type=video&maxResults=5&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    results.tests = {
      ...results.tests as object,
      issLiveSearch: {
        status: res.status,
        totalResults: data.pageInfo?.totalResults ?? 0,
        items: (data.items ?? []).map((item: any) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
        })),
        error: data.error ?? null,
      },
    };
  } catch (err) {
    results.tests = { ...results.tests as object, issLiveSearch: { error: String(err) } };
  }

  // Test 3: Broad search for "NASA live"
  try {
    const url = `${YOUTUBE_API}/search?part=snippet&q=NASA+live&eventType=live&type=video&maxResults=5&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    results.tests = {
      ...results.tests as object,
      nasaLiveSearch: {
        status: res.status,
        totalResults: data.pageInfo?.totalResults ?? 0,
        items: (data.items ?? []).map((item: any) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
        })),
        error: data.error ?? null,
      },
    };
  } catch (err) {
    results.tests = { ...results.tests as object, nasaLiveSearch: { error: String(err) } };
  }

  // Test 4: Simple API validation (non-search, just 1 quota unit)
  try {
    const url = `${YOUTUBE_API}/videos?part=snippet&id=jfKfPfyJRdk&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    results.tests = {
      ...results.tests as object,
      apiValidation: {
        status: res.status,
        working: !!(data.items && data.items.length > 0),
        error: data.error ?? null,
      },
    };
  } catch (err) {
    results.tests = { ...results.tests as object, apiValidation: { error: String(err) } };
  }

  return NextResponse.json(results);
}
