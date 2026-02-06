import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validationError, internalError } from '@/lib/errors';
import { orbitalServiceRequestSchema, validateBody } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = validateBody(orbitalServiceRequestSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { email, companyName, category, serviceType, description, requirements, budget, timeline } = validation.data;

    // Create the request
    const serviceRequest = await prisma.orbitalServiceRequest.create({
      data: {
        email: email || null,
        companyName: companyName || null,
        category,
        serviceType: serviceType || null,
        description,
        requirements: requirements ? JSON.stringify(requirements) : null,
        budget: budget || null,
        timeline: timeline || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Service request submitted successfully',
      id: serviceRequest.id,
    });
  } catch (error) {
    console.error('Error creating orbital service request:', error);
    return internalError();
  }
}

export async function GET() {
  try {
    const requests = await prisma.orbitalServiceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching orbital service requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service requests' },
      { status: 500 }
    );
  }
}
