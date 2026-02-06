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

## Key Commands
- `npm run build` - Build the project
- `npm run dev` - Start dev server
- `npx prisma db push` - Push schema changes to database
- `npx tsx scripts/<name>.ts` - Run initialization scripts

## Workflow
1. Make changes
2. Run `npm run build` to verify
3. Commit and push to `dev` branch
4. Railway auto-deploys from dev branch

## Database Initialization
When adding new modules with seed data, create a script in `scripts/` and run with `npx tsx`, or hit the `/api/<module>/init` endpoint after deployment.
