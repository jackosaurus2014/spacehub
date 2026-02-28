import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { internalError, unauthorizedError, validationError } from '@/lib/errors';

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
    logger.error('Error fetching module preferences', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch module preferences');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { moduleOrder } = await req.json();

    if (!Array.isArray(moduleOrder)) {
      return validationError('moduleOrder must be an array');
    }

    await reorderModules(session.user.id, moduleOrder);
    const modules = await getUserModulePreferences(session.user.id);

    return NextResponse.json({ modules });
  } catch (error) {
    logger.error('Error updating module order', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update module order');
  }
}
