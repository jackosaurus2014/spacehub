import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Server-side verify-then-embed check for a single YouTube video id.
 *
 * MissionStream.tsx calls this before rendering an iframe for missions
 * flagged "suspect" by isSuspectSpaceXYouTube() — SpaceX broadcasts on X and
 * spacex.com, so a YouTube videoUrl supplied by Launch Library for a SpaceX
 * mission is often dead, private, or a stale mirror. Uses YouTube's free
 * oEmbed endpoint (no API key/quota) rather than the client-side postMessage
 * detection alone, since that only fires reliably after playback has already
 * attempted and failed — this catches the dead-link case before ever
 * rendering a broken iframe.
 *
 * Runs server-side (not a direct browser fetch to youtube.com) to sidestep
 * any CORS uncertainty and keep this consistent with the existing
 * server-side oEmbed check in lib/livestream-detector.ts (verifyVideoOwner).
 */
export const dynamic = 'force-dynamic';

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return NextResponse.json({ available: false, reason: 'invalid_video_id' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { signal: AbortSignal.timeout(6000) },
    );

    if (!res.ok) {
      // YouTube itself says this video is gone, private, or embedding is
      // disabled — fail closed so the caller skips straight to the fallback
      // panel instead of rendering a doomed iframe.
      return NextResponse.json(
        { available: false, reason: `oembed_${res.status}` },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
      );
    }

    const data = (await res.json().catch(() => null)) as { title?: string } | null;

    return NextResponse.json(
      { available: !!data, title: data?.title ?? null },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (err) {
    // Our own network hiccup, not a signal about the video — fail open so a
    // transient error on our side doesn't hide a perfectly good stream.
    logger.warn('[YouTube verify] oEmbed check failed', {
      videoId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ available: true, unverified: true });
  }
}
