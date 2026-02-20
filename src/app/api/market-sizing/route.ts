import { NextRequest, NextResponse } from 'next/server';
import {
  MARKET_SEGMENTS,
  HISTORICAL_DATA,
  REGIONAL_BREAKDOWN,
  getChildSegments,
  getTopLevelSegments,
} from '@/lib/market-sizing-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const segmentId = searchParams.get('segment');

  if (segmentId) {
    const segment = MARKET_SEGMENTS.find(s => s.id === segmentId);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }
    const children = getChildSegments(segmentId);
    const history = HISTORICAL_DATA.filter(d => d.segmentId === segmentId);
    const regional = REGIONAL_BREAKDOWN.filter(r => r.segmentId === segmentId);
    return NextResponse.json({ segment, children, history, regional });
  }

  // Return overview
  const topLevel = getTopLevelSegments();
  const allSegments = MARKET_SEGMENTS;
  const globalHistory = HISTORICAL_DATA.filter(d => d.segmentId === 'global-space-economy');
  return NextResponse.json({ topLevel, allSegments, globalHistory });
}
