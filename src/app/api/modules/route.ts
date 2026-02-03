import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import {
  getUserModulePreferences,
  getDefaultModulePreferences,
  reorderModules,
} from '@/lib/module-preferences';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      const modules = await getUserModulePreferences(session.user.id);
      return NextResponse.json({ modules });
    }

    // Return default preferences for non-authenticated users
    const modules = await getDefaultModulePreferences();
    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error fetching module preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { moduleOrder } = await req.json();

    if (!Array.isArray(moduleOrder)) {
      return NextResponse.json(
        { error: 'moduleOrder must be an array' },
        { status: 400 }
      );
    }

    await reorderModules(session.user.id, moduleOrder);
    const modules = await getUserModulePreferences(session.user.id);

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error updating module order:', error);
    return NextResponse.json(
      { error: 'Failed to update module order' },
      { status: 500 }
    );
  }
}
