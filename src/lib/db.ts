import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        // Append connection_limit if not already in the URL to prevent
        // exhausting Railway PostgreSQL's max_connections during builds
        url: appendConnectionLimit(process.env.DATABASE_URL || ''),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

function appendConnectionLimit(url: string): string {
  if (!url || url.includes('connection_limit')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=10`;
}
