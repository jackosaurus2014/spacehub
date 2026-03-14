'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildBreadcrumbTrail } from '@/lib/breadcrumb-config';

// ─── Routes where breadcrumbs should NOT render ──────────────────────────────
const HIDDEN_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]);

// Widget / embed pages (no chrome)
const HIDDEN_PREFIXES = ['/widgets/'];

/**
 * AutoBreadcrumb — auto-generates visible breadcrumb trail + Schema.org JSON-LD
 * from the current URL path.
 *
 * Placed in root layout so every page gets breadcrumbs automatically.
 * Uses centralized route config from breadcrumb-config.ts.
 */
export default function AutoBreadcrumb() {
  const pathname = usePathname();

  // Skip rendering on certain routes
  if (HIDDEN_ROUTES.has(pathname)) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const trail = buildBreadcrumbTrail(pathname);

  // Need at least Home + one page to show breadcrumbs
  if (trail.length < 2) return null;

  // Schema.org BreadcrumbList JSON-LD
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(index < trail.length - 1
        ? { item: `https://spacenexus.us${item.href}` }
        : {}),
    })),
  };

  return (
    <>
      {/* Schema.org JSON-LD (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData).replace(/</g, '\\u003c'),
        }}
      />

      {/* Visible breadcrumb trail */}
      <nav
        aria-label="Breadcrumb"
        className="container mx-auto px-4 pt-3 pb-1"
      >
        <ol className="flex items-center gap-1.5 text-sm text-slate-400 overflow-x-auto scrollbar-hide">
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1;
            const isFirst = index === 0;

            return (
              <li key={item.href} className="flex items-center gap-1.5 flex-shrink-0">
                {/* Separator */}
                {index > 0 && (
                  <svg
                    className="w-3 h-3 text-slate-600 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}

                {isLast ? (
                  <span className="text-white/70 truncate max-w-[200px]" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-slate-400 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    {/* Home icon */}
                    {isFirst && (
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                        />
                      </svg>
                    )}
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
