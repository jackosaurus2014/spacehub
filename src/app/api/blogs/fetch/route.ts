import { NextResponse } from 'next/server';
import { initializeBlogSources, fetchBlogPosts } from '@/lib/blogs-fetcher';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // First ensure blog sources are initialized
    const sourcesCount = await initializeBlogSources();

    // Then fetch posts from all sources
    const postsCount = await fetchBlogPosts();

    return NextResponse.json({
      success: true,
      message: `Initialized ${sourcesCount} sources and fetched ${postsCount} blog posts`
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blogs', details: String(error) },
      { status: 500 }
    );
  }
}
