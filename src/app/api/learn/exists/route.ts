import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { LEARNING_TRACKS } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// the three Learning Zone depths a real HTTP 404 for unknown values:
//
//   /learn/<track>
//   /learn/<track>/<module>
//   /learn/<track>/<module>/<lesson>
//
// One endpoint rather than three because middleware's SLUG_EXISTENCE_CHECKS
// captures a single value per entry; the three middleware entries all hand
// the whole trailing path over as ?path=<track>[/<module>[/<lesson>]].
//
// Each depth mirrors the corresponding page's notFound() gate EXACTLY:
//   - track  : must be in LEARNING_TRACKS (a static list — no DB needed, so
//              /learn/<track> is answered without touching Postgres)
//   - module : CourseModule.slug must exist, be published, and its `track`
//              column must match the track in the URL (otherwise
//              /learn/propulsion/<a-space-law-module> would render)
//   - lesson : Lesson.slug must exist under that module, and the module must
//              likewise be published and on the URL's track
export async function GET(request: NextRequest) {
  const missing = () => NextResponse.json({ exists: false }, { status: 404 });

  try {
    const raw = request.nextUrl.searchParams.get('path') || '';
    const segments = raw.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 3) {
      // Not a shape this endpoint speaks for — fail open rather than 404
      // something we haven't actually checked.
      return NextResponse.json({ exists: true, unchecked: true }, { status: 200 });
    }

    const [track, moduleSlug, lessonSlug] = segments;

    if (!(LEARNING_TRACKS as readonly string[]).includes(track)) return missing();
    if (!moduleSlug) return NextResponse.json({ exists: true }, { status: 200 });

    if (!lessonSlug) {
      const mod = await prisma.courseModule.findUnique({
        where: { slug: moduleSlug },
        select: { track: true, published: true },
      });
      if (!mod || mod.track !== track || !mod.published) return missing();
      return NextResponse.json({ exists: true }, { status: 200 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: { slug: lessonSlug, module: { slug: moduleSlug } },
      select: { module: { select: { track: true, published: true } } },
    });
    if (!lesson || lesson.module.track !== track || !lesson.module.published) {
      return missing();
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Learning Zone existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404
    // for real content — middleware treats non-404 as "exists".
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
