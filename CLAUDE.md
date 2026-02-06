# SpaceNexus Project Context

## Deployment
- **Platform**: Railway (auto-deploys on push)
- **Branch**: `dev` branch triggers deployment
- **Database**: PostgreSQL on Railway
- **GitHub Repo**: jackosaurus2014/spacehub

## Tech Stack
- Next.js 14 (App Router)
- Prisma ORM with PostgreSQL
- TypeScript
- Tailwind CSS
- Zod (validation)
- Jest (testing)

## Key Commands
- `npm run build` - Build the project
- `npm run dev` - Start dev server
- `npm test` - Run Jest test suite
- `npx prisma db push` - Push schema changes to database
- `npx tsx scripts/<name>.ts` - Run initialization scripts

## Workflow
1. Make changes
2. Run `npm run build` to verify
3. Commit and push to `dev` branch
4. Railway auto-deploys from dev branch

## CI/CD
- GitHub Actions workflow in `.github/workflows/ci.yml`
- Railway auto-deploys from `dev` branch

## Database Initialization
When adding new modules with seed data, create a script in `scripts/` and run with `npx tsx`, or hit the `/api/<module>/init` endpoint after deployment.

## Validation & Error Handling
- **Schemas**: Zod schemas in `src/lib/validations.ts`
- **Helper**: `validateBody(schema, body)` parses and returns `{ success, data, error }`
- **Error utilities**: `src/lib/errors.ts` exports `validationError()`, `internalError()`, etc. (return `NextResponse` objects)
- **Reference**: See `src/app/api/contact/route.ts` for the standard pattern

## Testing
- **Config**: `jest.config.ts` using `next/jest` preset (requires `ts-node` devDependency)
- **Tests**: `src/lib/__tests__/` (validations, errors, contact-validation, news-categorizer)
- **Note**: Tests using `NextResponse` need `@jest-environment node` pragma; validation tests use default jsdom

## Security
- **CSRF protection**: Origin/Referer header check on mutations in `src/middleware.ts`
- **Rate limiting**: In-memory sliding window in `src/middleware.ts`
- **HTML sanitization**: `sanitize-html` used for RSS feed content

## UI Components
- **Toast notifications**: `src/lib/toast.ts` (API) + `src/components/ui/Toast.tsx` (component)
- **Skeleton loaders**: `src/components/ui/Skeleton.tsx`

## PWA
- **Icons**: `public/icons/` (192x192, 512x512)
- **Service worker**: Registration component in layout
- **Icon generation**: `scripts/generate-icons.ts` using sharp
