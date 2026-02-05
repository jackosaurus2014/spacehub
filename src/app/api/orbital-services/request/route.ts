import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, companyName, category, serviceType, description, requirements, budget, timeline } = body;

    // Validate required fields
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Create the request
    const serviceRequest = await prisma.orbitalServiceRequest.create({
      data: {
        email: email?.trim() || null,
        companyName: companyName?.trim() || null,
        category: category.trim(),
        serviceType: serviceType?.trim() || null,
        description: description.trim(),
        requirements: requirements ? JSON.stringify(requirements) : null,
        budget: budget?.trim() || null,
        timeline: timeline?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Service request submitted successfully',
      id: serviceRequest.id,
    });
  } catch (error) {
    console.error('Error creating orbital service request:', error);
    return NextResponse.json(
      { error: 'Failed to submit service request' },
      { status: 500 }
    );
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
