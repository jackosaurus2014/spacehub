import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ContactFormData {
  name: string;
  email: string;
  subject: 'general' | 'technical' | 'billing' | 'partnership';
  message: string;
}

// Mock storage for contact submissions (in production, store in database)
const contactSubmissions: Array<ContactFormData & { id: string; createdAt: string; userId?: string }> = [];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body: ContactFormData = await req.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const validSubjects = ['general', 'technical', 'billing', 'partnership'];
    if (!subject || !validSubjects.includes(subject)) {
      return NextResponse.json(
        { error: 'Please select a valid subject' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Create contact submission record
    const submission = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject,
      message: message.trim(),
      userId: session?.user?.id || undefined,
      createdAt: new Date().toISOString(),
    };

    // Store submission (mock - in production, use database)
    contactSubmissions.push(submission);

    // Log for debugging/monitoring
    console.log('Contact form submission:', {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      messageLength: submission.message.length,
      userId: submission.userId,
      createdAt: submission.createdAt,
    });

    // In production, you might also:
    // - Send email notification to support team
    // - Store in database using Prisma
    // - Create a support ticket in external system
    // - Send auto-reply to user

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been received. We will get back to you soon.',
        submissionId: submission.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form. Please try again later.' },
      { status: 500 }
    );
  }
}

// Admin endpoint to view submissions (requires admin auth)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredSubmissions = contactSubmissions;

    if (subject) {
      filteredSubmissions = filteredSubmissions.filter((s) => s.subject === subject);
    }

    // Sort by newest first
    filteredSubmissions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedSubmissions = filteredSubmissions.slice(offset, offset + limit);

    return NextResponse.json({
      submissions: paginatedSubmissions,
      total: filteredSubmissions.length,
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact submissions' },
      { status: 500 }
    );
  }
}
