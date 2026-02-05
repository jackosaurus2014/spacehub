import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set - admin notifications disabled');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@spacenexus.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, description, website, submitterEmail } = body;

    // Validate required fields
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Company description is required' }, { status: 400 });
    }

    // Validate URL if provided
    if (website) {
      try {
        new URL(website);
      } catch {
        return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
      }
    }

    // Validate email if provided
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Check for duplicate pending requests
    const existingRequest = await prisma.companyAddRequest.findFirst({
      where: {
        companyName: {
          equals: companyName.trim(),
          mode: 'insensitive',
        },
        status: 'pending',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A request for this company is already pending review' },
        { status: 409 }
      );
    }

    // Create the request
    const companyRequest = await prisma.companyAddRequest.create({
      data: {
        companyName: companyName.trim(),
        description: description.trim(),
        website: website?.trim() || null,
        submitterEmail: submitterEmail?.trim() || null,
      },
    });

    // Send email notification to admin
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `[SpaceNexus] New Company Request: ${companyName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; padding: 24px; border-radius: 12px;">
              <h1 style="color: #8b5cf6; margin-bottom: 24px;">New Company Addition Request</h1>

              <div style="background: #1a1a3e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Company Details</h2>

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Name:</strong> ${companyName}
                </p>

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Description:</strong><br/>
                  ${description}
                </p>

                ${website ? `
                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Website:</strong>
                  <a href="${website}" style="color: #8b5cf6;">${website}</a>
                </p>
                ` : ''}

                ${submitterEmail ? `
                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Submitter Email:</strong>
                  <a href="mailto:${submitterEmail}" style="color: #8b5cf6;">${submitterEmail}</a>
                </p>
                ` : '<p style="color: #a0a0b8; margin: 8px 0;"><strong style="color: #c0c0d8;">Submitter:</strong> Anonymous</p>'}
              </div>

              <p style="color: #808090; font-size: 12px; margin-top: 24px;">
                Request ID: ${companyRequest.id}<br/>
                Submitted at: ${new Date().toISOString()}
              </p>
            </div>
          `,
          text: `
New Company Addition Request

Company Details:
- Name: ${companyName}
- Description: ${description}
- Website: ${website || 'Not provided'}
- Submitter Email: ${submitterEmail || 'Anonymous'}

Request ID: ${companyRequest.id}
Submitted at: ${new Date().toISOString()}
          `,
        });
        console.log('Admin notification sent for company request:', companyRequest.id);
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send admin notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Company request submitted successfully',
      id: companyRequest.id,
    });
  } catch (error) {
    console.error('Error creating company request:', error);
    return NextResponse.json(
      { error: 'Failed to submit company request' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve requests (admin only in future)
export async function GET() {
  try {
    const requests = await prisma.companyAddRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching company requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company requests' },
      { status: 500 }
    );
  }
}
