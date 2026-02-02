import { NextResponse } from 'next/server';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';

export async function POST() {
  try {
    const count = await fetchLaunchLibraryEvents();
    return NextResponse.json({
      success: true,
      message: `Fetched and saved ${count} space events`
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
