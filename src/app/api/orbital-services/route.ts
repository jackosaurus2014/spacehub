import { NextResponse } from 'next/server';
import { getOrbitalServices, getOrbitalServicesStats } from '@/lib/orbital-services-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const pricingModel = searchParams.get('pricingModel') || undefined;
    const availability = searchParams.get('availability') || undefined;
    const status = searchParams.get('status') || undefined;

    const [services, stats] = await Promise.all([
      getOrbitalServices({ category, provider, pricingModel, availability, status }),
      getOrbitalServicesStats(),
    ]);

    // Parse JSON specifications for each service
    const parsedServices = services.map(service => ({
      ...service,
      specifications: service.specifications ? JSON.parse(service.specifications) : null,
    }));

    return NextResponse.json({
      services: parsedServices,
      stats,
    });
  } catch (error) {
    console.error('Error fetching orbital services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orbital services' },
      { status: 500 }
    );
  }
}
