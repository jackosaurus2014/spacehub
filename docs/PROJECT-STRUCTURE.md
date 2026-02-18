# SpaceNexus Project Structure

## Directory Overview

```
spacehub/
├── .github/workflows/       # CI/CD (GitHub Actions)
├── android-twa/             # Android Trusted Web Activity (Play Store app)
├── docs/                    # Project documentation (organized by category)
│   ├── launch/              # App store submissions, launch plans, checklists
│   ├── marketing/           # Marketing strategies, content calendars, ad guides
│   ├── technical/           # Technical docs, security audits, data sources
│   ├── business/            # Business strategy, legal, competitive analysis
│   └── proposals/           # Future feature proposals
├── ios-assets/              # iOS privacy manifest and App Store assets
├── notes/                   # Personal notes, brainstorming, task lists (gitignored)
│   ├── brainstorming/       # Strategic brainstorms and research
│   ├── task-lists/          # Historical task lists and project plans
│   └── build-logs/          # Build output logs
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets served by Next.js
│   ├── apple-store/         # Apple App Store screenshots
│   ├── icons/               # PWA icons (192x192, 512x512)
│   ├── play-store/          # Google Play Store screenshots
│   ├── screenshots/         # Development screenshots (gitignored)
│   └── .well-known/         # App association files (Android + iOS deep linking)
├── scripts/                 # Database seeding and asset generation scripts
├── src/                     # Application source code
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/             # API routes (REST endpoints)
│   │   ├── blog/            # Original blog content pages
│   │   ├── guide/           # SEO pillar content pages
│   │   ├── space-industry/  # City-specific landing pages
│   │   └── ...              # All other pages (40+ modules)
│   ├── components/          # React components
│   │   ├── ads/             # Ad slot, banner, native ad components
│   │   ├── analytics/       # Google Analytics, cookie consent
│   │   ├── charts/          # Chart components and tooltips
│   │   ├── dashboard/       # Dashboard builder widgets
│   │   ├── launch/          # Launch day dashboard components
│   │   ├── marketplace/     # Marketplace cards, forms, badges
│   │   ├── mobile/          # Mobile-specific components (tab bar, swipe, transitions)
│   │   ├── modules/         # Module container and individual module components
│   │   ├── search/          # Search and command palette
│   │   ├── seo/             # SEO components (FAQ schema, structured data)
│   │   └── ui/              # Shared UI (toast, skeleton, progress, modals)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Shared utilities, services, and business logic
│   │   ├── ads/             # Ad server and targeting logic
│   │   ├── alerts/          # Alert processing, delivery, templates
│   │   ├── dashboard/       # Dashboard builder logic
│   │   ├── launch/          # Launch tracking utilities
│   │   ├── newsletter/      # Email templates and drip sequence
│   │   ├── procurement/     # SAM.gov and SBIR integration
│   │   └── __tests__/       # Jest test suites
│   └── types/               # TypeScript type definitions
└── CLAUDE.md                # AI assistant project context
```

## Documentation Map

### docs/launch/ — Launch & App Store
| File | Description |
|------|-------------|
| `CLAUDE_CEO.md` | 30-day launch playbook with day-by-day calendar |
| `APP-STORE-LAUNCH-CHECKLIST.md` | Pre-launch checklist for both app stores |
| `APPLE-APP-STORE-SUBMISSION.md` | iOS submission guide (Xcode, App Store Connect) |
| `PLAY-STORE-MARKETING-PLAN.md` | Google Play marketing strategy |
| `PRODUCT_HUNT_LAUNCH_STRATEGY.md` | Product Hunt launch playbook |

### docs/marketing/ — Marketing & Growth
| File | Description |
|------|-------------|
| `MARKETING-IMPLEMENTATION.md` | Technical log of all marketing features built |
| `WEBSITE-MARKETING-PLAN.md` | 6-month web marketing roadmap |
| `LINKEDIN_B2B_STRATEGY.md` | LinkedIn B2B targeting strategy |
| `LINKEDIN_CONTENT_CALENDAR.md` | 30-day LinkedIn content calendar |
| `EMAIL_NURTURE_SEQUENCE.md` | Email drip campaign strategy |
| `ADSENSE.md` | Google AdSense setup guide (web + Android) |
| `AD_INTEGRATION_GUIDE.md` | Custom ad system documentation |
| `CASE_STUDIES.md` | Customer case study templates |
| `CONTENT_EXPANSION_PROPOSAL.md` | Content scaling plan |

### docs/technical/ — Technical Documentation
| File | Description |
|------|-------------|
| `MARKETPLACE-IMPLEMENTATION.md` | Marketplace architecture and API docs |
| `SECURITY-AUDIT-REPORT.md` | Security audit findings and fixes |
| `STRIPE_SETUP.md` | Stripe payment integration guide |
| `STRIPE_AUDIT_REPORT.md` | Payment system security audit |
| `SPACE-DEFENSE-DATA-SOURCES.md` | Space defense API sources |
| `COMPANY-INTELLIGENCE-ANALYSIS.md` | Company data model documentation |
| `ADDITIONAL-COMPANIES-TO-PROFILE.md` | 117 companies to add to profiles |

### docs/business/ — Business Strategy
| File | Description |
|------|-------------|
| `CEO_EVALUATION_REPORT.md` | Strategic business analysis |
| `COMPETITIVE_INTEL_PAYLOAD_SPACE.md` | Competitor analysis |
| `GOVERNMENT_PROCUREMENT_STRATEGY.md` | SAM.gov/SBIR strategy |
| `MARKETPLACE-STRATEGY.md` | B2B marketplace go-to-market |
| `SpaceNexus-LLC-Operating-Agreement.md` | LLC operating agreement |

### docs/proposals/ — Future Features
| File | Description |
|------|-------------|
| `AI_INTEGRATION_PROPOSAL.md` | AI feature roadmap |
| `PERSONALIZATION_PROPOSAL.md` | User personalization features |

## Key Source Files

### Configuration
| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant context and project instructions |
| `.eslintrc.json` | ESLint config (Next.js + TypeScript) |
| `jest.config.ts` | Jest test configuration |
| `next.config.js` | Next.js config (redirects, security headers, bundle analyzer) |
| `capacitor.config.json` | Capacitor config for native iOS/Android |
| `prisma/schema.prisma` | Database schema |
| `tailwind.config.ts` | Tailwind CSS configuration |

### Core Libraries
| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/stripe.ts` | Stripe lazy initialization |
| `src/lib/logger.ts` | Structured logging |
| `src/lib/errors.ts` | API error response helpers |
| `src/lib/validations.ts` | Zod validation schemas |
| `src/lib/analytics.ts` | GA4 event tracking utilities |
| `src/lib/toast.ts` | Toast notification API |
| `src/lib/api-cache.ts` | TTL cache for external APIs |
| `src/lib/circuit-breaker.ts` | Circuit breaker for external calls |
| `src/lib/capacitor.ts` | Native platform detection bridge |
| `src/lib/blog-content.ts` | Original blog post data |
| `src/lib/city-data.ts` | City landing page data |
| `src/lib/changelog.ts` | Version changelog data |
| `src/lib/module-routes.ts` | Module routing configuration |
| `src/lib/marketplace-types.ts` | Marketplace taxonomy |

### Scripts
| Script | Purpose |
|--------|---------|
| `scripts/seed-company-profiles.ts` | Seed 101 company profiles |
| `scripts/seed-marketplace.ts` | Seed 80 marketplace listings |
| `scripts/seed-procurement.ts` | Seed procurement data |
| `scripts/generate-icons.ts` | Generate PWA icons |
| `scripts/generate-play-store-assets.ts` | Generate Play Store screenshots |
| `scripts/generate-apple-store-screenshots.ts` | Generate App Store screenshots |
| `scripts/check-data-freshness.ts` | Check API data freshness |

## Conventions

- **New documentation:** Add to the appropriate `docs/` subfolder
- **Personal notes:** Keep in `notes/` (gitignored, local only)
- **API routes:** Follow pattern from `src/app/api/contact/route.ts`
- **Validation:** Use Zod schemas in `src/lib/validations.ts`
- **Error responses:** Use helpers from `src/lib/errors.ts`
- **Logging:** Use `logger` from `src/lib/logger.ts` (never `console.log` in API routes)
- **Database:** Import `prisma` from `@/lib/db` (not `@/lib/prisma`)
- **Tests:** Place in `src/lib/__tests__/`, use `@jest-environment node` for API tests
