import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const INDEXNOW_KEY = '8f3a9b2c4d5e6f7a1b2c3d4e5f6a7b8c';
const HOST = 'spacenexus.us';

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret or admin auth
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const urls: string[] = body.urls || [];

    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Submit to IndexNow
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000), // IndexNow max 10k URLs per request
      }),
    });

    logger.info('IndexNow submission', { urlCount: urls.length, status: res.status });

    return NextResponse.json({ success: true, submitted: urls.length, status: res.status });
  } catch (error) {
    logger.error('IndexNow submission failed', { error: String(error) });
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
