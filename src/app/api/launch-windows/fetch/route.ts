import { NextResponse } from 'next/server';
import {
  fetchLaunchLibraryUpcoming,
  fetchSpaceXUpcoming,
  mergeLaunchData,
  upsertLaunchEvents,
} from '@/lib/launch-windows-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const results = {
      launchLibrary: { fetched: 0, error: null as string | null },
      spaceX: { fetched: 0, error: null as string | null },
      merged: 0,
      created: 0,
      updated: 0,
    };

    // Fetch from Launch Library 2
    let launchLibraryData: Awaited<ReturnType<typeof fetchLaunchLibraryUpcoming>> = [];
    try {
      launchLibraryData = await fetchLaunchLibraryUpcoming();
      results.launchLibrary.fetched = launchLibraryData.length;
    } catch (error) {
      console.error('Launch Library 2 fetch error:', error);
      results.launchLibrary.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Fetch from SpaceX API
    let spaceXData: Awaited<ReturnType<typeof fetchSpaceXUpcoming>> = [];
    try {
      spaceXData = await fetchSpaceXUpcoming();
      results.spaceX.fetched = spaceXData.length;
    } catch (error) {
      console.error('SpaceX API fetch error:', error);
      results.spaceX.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Merge and deduplicate
    const mergedLaunches = mergeLaunchData(launchLibraryData, spaceXData);
    results.merged = mergedLaunches.length;

    // Upsert to database
    if (mergedLaunches.length > 0) {
      const upsertResult = await upsertLaunchEvents(mergedLaunches);
      results.created = upsertResult.created;
      results.updated = upsertResult.updated;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Failed to fetch launch data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch launch data',
      },
      { status: 500 }
    );
  }
}
