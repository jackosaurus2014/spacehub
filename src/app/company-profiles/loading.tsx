import RowSkeleton from '@/components/ui/RowSkeleton';

/**
 * Route-level loading UI. Matches the shape of the SERVER-rendered first
 * screen in page.tsx — headline, deck, provenance line, then a console of
 * table rows at the real row height — so nothing reflows when the data lands
 * (SYNTHESIS.md §2.5).
 */
export default function Loading() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <header className="mb-6">
        <div className="h-[3rem] w-[22rem] max-w-full rounded bg-[var(--elev)] motion-safe:animate-pulse" />
        <div className="mt-3 h-4 w-[34rem] max-w-full rounded bg-[var(--elev)] motion-safe:animate-pulse" />
        <div className="mt-2 h-3 w-64 max-w-full rounded bg-[var(--elev)] motion-safe:animate-pulse" />
      </header>

      <div
        className="overflow-hidden border border-[var(--line)] bg-[var(--surface)]"
        style={{ borderRadius: 'var(--radius-console)' }}
      >
        <div className="border-b border-[var(--line)] bg-[var(--elev)] px-4 py-2.5">
          <div className="h-3 w-48 rounded bg-[var(--surface)]" />
        </div>
        <RowSkeleton rows={12} height={45} label="Loading the space company directory" />
      </div>
    </div>
  );
}
