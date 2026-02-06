import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  fetchNasaDonkiSolarFlares,
  fetchNoaaXrayFlares,
  fetchNoaaPlanetaryKIndex,
  transformNasaDonkiFlare,
  transformNoaaXrayFlare,
  mergeSolarFlareData,
} from '@/lib/solar-flare-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Fetch data from both sources in parallel
    const [nasaFlares, noaaXrayFlares, noaaKpIndex] = await Promise.all([
      fetchNasaDonkiSolarFlares(),
      fetchNoaaXrayFlares(),
      fetchNoaaPlanetaryKIndex(),
    ]);

    // Transform data to internal format
    const transformedNasaFlares = nasaFlares.map(transformNasaDonkiFlare);
    const transformedNoaaFlares = noaaXrayFlares.map(transformNoaaXrayFlare);

    // Merge data from both sources (NASA takes precedence for duplicates)
    const mergedFlares = mergeSolarFlareData(transformedNasaFlares, transformedNoaaFlares);

    // Track results
    let created = 0;
    let updated = 0;

    // Upsert each flare to the database
    for (const flare of mergedFlares) {
      const existing = await prisma.solarFlare.findUnique({
        where: { flareId: flare.flareId },
      });

      if (existing) {
        await prisma.solarFlare.update({
          where: { flareId: flare.flareId },
          data: {
            classification: flare.classification,
            intensity: flare.intensity,
            startTime: flare.startTime,
            peakTime: flare.peakTime,
            endTime: flare.endTime,
            activeRegion: flare.activeRegion,
            sourceLocation: flare.sourceLocation,
            radioBlackout: flare.radioBlackout,
            solarRadiation: flare.solarRadiation,
            geomagneticStorm: flare.geomagneticStorm,
            description: flare.description,
            linkedCME: flare.linkedCME,
          },
        });
        updated++;
      } else {
        await prisma.solarFlare.create({
          data: flare,
        });
        created++;
      }
    }

    // Update current solar activity with Kp index if available
    if (noaaKpIndex && noaaKpIndex.length > 0) {
      const latestKp = noaaKpIndex[noaaKpIndex.length - 1];
      const kpValue = parseFloat(latestKp.Kp || latestKp.kp || '0');

      if (!isNaN(kpValue)) {
        await prisma.solarActivity.create({
          data: {
            timestamp: new Date(),
            kpIndex: kpValue,
            overallStatus: kpValue >= 5 ? 'stormy' : kpValue >= 4 ? 'active' : 'quiet',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: mergedFlares.length,
      sources: {
        nasa: nasaFlares.length,
        noaa: noaaXrayFlares.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch solar flare data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch solar flare data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
