import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch upcoming launches from our existing events API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events?limit=1&upcoming=true`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        name: 'Next Launch TBD',
        countdown_seconds: null,
        agency: 'Unknown',
        rocket: 'Unknown',
        location: 'Unknown',
      });
    }

    const data = await res.json();
    const event = data.events?.[0] || data.results?.[0];

    if (!event) {
      return NextResponse.json({
        name: 'No upcoming launches',
        countdown_seconds: null,
        agency: 'N/A',
        rocket: 'N/A',
        location: 'N/A',
      });
    }

    const launchDate = new Date(event.date || event.net);
    const countdownSeconds = Math.max(0, Math.floor((launchDate.getTime() - Date.now()) / 1000));

    return NextResponse.json({
      name: event.name || event.title || 'Upcoming Launch',
      countdown_seconds: countdownSeconds,
      agency: event.agency || event.launch_service_provider?.name || 'Unknown',
      rocket: event.rocket || event.rocket?.configuration?.name || 'Unknown',
      location: event.location || event.pad?.location?.name || 'Unknown',
      date: launchDate.toISOString(),
    });
  } catch {
    return NextResponse.json({
      name: 'Next Launch TBD',
      countdown_seconds: null,
      agency: 'Unknown',
      rocket: 'Unknown',
      location: 'Unknown',
    });
  }
}
