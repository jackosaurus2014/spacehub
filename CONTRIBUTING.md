# Contributing to SpaceNexus

A practical guide for getting up and running quickly.

## Getting Started

### Prerequisites

- **Node.js 20+** (check with `node -v`)
- **npm** (comes with Node)
- **PostgreSQL** (local instance or a cloud provider like Railway, Neon, etc.)

### Setup

```bash
# Clone the repo
git clone https://github.com/jackosaurus2014/spacehub.git
cd spacehub

# Install dependencies
npm install

# Create your environment file
cp .env.example .env   # or create .env manually
```

### Environment Variables

Create a `.env` file at the project root with at minimum:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/spacenexus"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup

```bash
# Push the Prisma schema to your database (creates tables)
npx prisma db push

# Generate the Prisma client (also runs automatically on npm install)
npx prisma generate
```

### Run the Dev Server

```bash
npm run dev
# Open http://localhost:3000
```

## Project Architecture

**Stack:** Next.js 14 (App Router) | TypeScript | Prisma + PostgreSQL | Tailwind CSS | Zod | Jest

### Directory Structure

```
src/
  app/              # Pages and API routes (Next.js App Router)
    api/            # API endpoints (e.g., api/contact/route.ts)
    dashboard/      # Dashboard page
    news/           # News module page
    ...             # Other page modules
  components/       # React components
    ui/             # Reusable UI primitives (Toast, Skeleton, etc.)
    charts/         # Data visualization components
    modules/        # Module-specific components
  hooks/            # Custom React hooks (useIsMobile, useKeyboardShortcut, etc.)
  lib/              # Utilities, data fetchers, business logic
    __tests__/      # Jest test files
    db.ts           # Prisma client singleton
    errors.ts       # Standardized API error responses
    validations.ts  # Zod schemas and validateBody() helper
    logger.ts       # Structured logging utility
    auth.ts         # NextAuth configuration
    toast.ts        # Client-side toast notification API
  types/            # TypeScript type definitions
  middleware.ts     # Rate limiting and CSRF protection (Edge Runtime)
prisma/
  schema.prisma     # Database schema
scripts/            # Initialization and utility scripts (run with npx tsx)
public/             # Static assets, PWA icons, manifest
```

## Key Patterns

### API Route Pattern

Every API route follows the same structure: validate input with Zod, execute business logic, return a standardized response. See `src/app/api/contact/route.ts` as the canonical example.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validationError, internalError } from '@/lib/errors';
import { mySchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate
    const validation = validateBody(mySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    // 2. Business logic
    const result = await prisma.myModel.create({
      data: validation.data,
    });

    // 3. Log and respond
    logger.info('Created resource', { id: result.id });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create resource', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Something went wrong');
  }
}
```

### Error Handling

Import helpers from `@/lib/errors`. Each returns a properly formatted `NextResponse`:

| Helper | Status | Use Case |
|--------|--------|----------|
| `validationError(msg, details?)` | 400 | Invalid input |
| `unauthorizedError(msg?)` | 401 | Not authenticated |
| `forbiddenError(msg?)` | 403 | Insufficient permissions |
| `notFoundError(resource?)` | 404 | Resource not found |
| `internalError(msg?)` | 500 | Unexpected server error |

### Validation

Zod schemas live in `src/lib/validations.ts`. Use the `validateBody()` helper to parse request data:

```typescript
import { z } from 'zod';

// Define schema
export const mySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform(val => val.trim()),
  email: z.string().email('Invalid email').max(255),
});

// In your route handler
const validation = validateBody(mySchema, body);
if (!validation.success) {
  // validation.errors is Record<string, string[]>
  return validationError('Validation failed', validation.errors);
}
// validation.data is fully typed and transformed
```

**Note:** Zod v4 runs `.email()` validation *before* `.transform()`, so `" user@example.com "` will fail email validation because the spaces are not trimmed first. Keep email trimming separate if needed.

### Database Access

Always import the Prisma singleton:

```typescript
import prisma from '@/lib/db';
```

### Structured Logging

```typescript
import { logger } from '@/lib/logger';

logger.info('Something happened', { userId, action: 'create' });
logger.error('Something failed', { error: error.message });
```

## Adding a New API Route

1. **Define a Zod schema** in `src/lib/validations.ts` for your request body.
2. **Create the route file** at `src/app/api/<your-endpoint>/route.ts`.
3. **Follow the pattern** from the section above: validate, execute, respond.
4. **Add `export const dynamic = 'force-dynamic';`** if the route reads dynamic data.
5. **Use auth** if needed: `const session = await getServerSession(authOptions);`
6. **Write tests** in `src/lib/__tests__/` for your validation logic.

## Adding a New Page/Module

1. **Create a directory** under `src/app/<module-name>/` with a `page.tsx`.
2. **Use server components** by default. Only add `'use client'` when you need interactivity.
3. **Follow the dark theme** conventions:
   - Background: `bg-slate-900`, `bg-slate-800`
   - Text: `text-white`, `text-gray-300`, `text-gray-400`
   - Cards/panels: `bg-slate-800 rounded-lg p-6`
   - Accent colors: `text-blue-400`, `text-green-400`
   - Borders: `border-slate-700`
4. **Extract reusable components** into `src/components/modules/<module-name>/`.
5. **Add data fetchers** in `src/lib/<module-name>-data.ts` if your module has static or seed data.
6. **Add seed/init logic** as a script in `scripts/` (run with `npx tsx scripts/<name>.ts`) or as an `/api/<module>/init` endpoint.

## Testing

```bash
# Run the full test suite
npm test

# Watch mode for development
npm run test:watch
```

- **Test location:** `src/lib/__tests__/`
- **API/server tests** (anything importing `NextResponse` or server utilities): add `/** @jest-environment node */` at the top of the file, because the default jsdom environment does not have the `Response` global.
- **Validation-only tests** work fine in the default jsdom environment.
- **Config:** `jest.config.ts` uses the `next/jest` preset. The `ts-node` devDependency is required for TypeScript config parsing.

## Deployment

- **Auto-deploy:** Push to the `dev` branch and Railway deploys automatically.
- **Build command:** `prisma db push || true && next build` (schema is synced before each build).
- **CI:** GitHub Actions runs on push (`.github/workflows/ci.yml`).
- **Schema changes:** `npx prisma db push` applies schema changes to the database. No migration files are used.
- **Init scripts:** For modules with seed data, run `npx tsx scripts/<name>.ts` or hit `/api/<module>/init` after deployment.

### Workflow Summary

1. Make your changes on the `dev` branch (or a feature branch merged into `dev`).
2. Run `npm run build` locally to verify everything compiles.
3. Commit and push to `dev`.
4. Railway picks it up and deploys.

## Code Style

- **TypeScript** in strict mode. Avoid `any` when possible.
- **Tailwind CSS** for all styling. Dark theme throughout (no light mode toggle).
- **No external state management.** Use React state for client components, server components for data fetching.
- **Import aliases:** Use `@/` for `src/` imports (e.g., `@/lib/db`, `@/components/ui/Toast`).
- **Naming:** Kebab-case for files and directories, PascalCase for components, camelCase for functions and variables.
- **Lint:** Run `npm run lint` to check for issues (uses Next.js ESLint config).
