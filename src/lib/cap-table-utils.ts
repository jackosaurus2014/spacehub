/**
 * Cap Table utilities — BigInt serialization, percentage auto-calculation,
 * and visibility enforcement.
 *
 * Prisma stores `shareCount` and `sharesAuthorized` / `sharesOutstanding`
 * as BigInt. JSON.stringify cannot serialize BigInt natively, so the API
 * layer must convert to strings before responding.
 */

export type CapTableVisibility = 'public' | 'logged_in' | 'invite_only';

interface CapTableEntryRaw {
  id: string;
  capTableId: string;
  holderName: string;
  holderType: string;
  shareClass: string;
  shareCount: bigint | null;
  percentage: number | null;
  investmentAmount: number | null;
  roundLabel: string | null;
  acquiredAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

interface CapTableRaw {
  id: string;
  companyId: string;
  currentValuation: number | null;
  currency: string | null;
  sharesAuthorized: bigint | null;
  sharesOutstanding: bigint | null;
  asOfDate: Date | null;
  visibility: string;
  uploadedByUserId: string | null;
  documentUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Convert a BigInt (or null) to a string-or-null for safe JSON serialization. */
export function bigintToString(v: bigint | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

/** Serialize a single entry: BigInt → string, Date → ISO string. */
export function serializeCapTableEntry(entry: CapTableEntryRaw) {
  return {
    id: entry.id,
    capTableId: entry.capTableId,
    holderName: entry.holderName,
    holderType: entry.holderType,
    shareClass: entry.shareClass,
    shareCount: bigintToString(entry.shareCount),
    percentage: entry.percentage,
    investmentAmount: entry.investmentAmount,
    roundLabel: entry.roundLabel,
    acquiredAt: entry.acquiredAt ? entry.acquiredAt.toISOString() : null,
    notes: entry.notes,
    createdAt: entry.createdAt.toISOString(),
  };
}

/** Serialize the cap table itself, including BigInt fields. */
export function serializeCapTable(
  capTable: CapTableRaw,
  entries: CapTableEntryRaw[] = []
) {
  return {
    id: capTable.id,
    companyId: capTable.companyId,
    currentValuation: capTable.currentValuation,
    currency: capTable.currency,
    sharesAuthorized: bigintToString(capTable.sharesAuthorized),
    sharesOutstanding: bigintToString(capTable.sharesOutstanding),
    asOfDate: capTable.asOfDate ? capTable.asOfDate.toISOString() : null,
    visibility: capTable.visibility,
    uploadedByUserId: capTable.uploadedByUserId,
    documentUrl: capTable.documentUrl,
    notes: capTable.notes,
    createdAt: capTable.createdAt.toISOString(),
    updatedAt: capTable.updatedAt.toISOString(),
    entries: entries.map(serializeCapTableEntry),
  };
}

/**
 * Auto-calculate percentage if shareCount + sharesOutstanding are both present.
 * Returns the percentage rounded to 4 decimal places, or null.
 */
export function computePercentage(
  shareCount: bigint | null | undefined,
  sharesOutstanding: bigint | null | undefined
): number | null {
  if (!shareCount || !sharesOutstanding || sharesOutstanding === BigInt(0)) return null;
  // Convert to Number for division. For very large BigInts this loses precision,
  // but cap-table use cases stay well under 2^53.
  const sc = Number(shareCount);
  const so = Number(sharesOutstanding);
  if (!Number.isFinite(sc) || !Number.isFinite(so) || so === 0) return null;
  return Math.round((sc / so) * 100 * 10000) / 10000;
}

/**
 * Enforce visibility for a cap table given the requesting user context.
 * Returns null if access is allowed, or a string reason if denied.
 *
 *   - public:      anyone (including unauthenticated)
 *   - logged_in:   any authenticated user
 *   - invite_only: only owner, admin, or grantee with a CapTableShare row
 */
export function checkCapTableAccess(params: {
  visibility: string;
  isOwner: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hasShare: boolean;
}): { allowed: boolean; reason?: string } {
  const { visibility, isOwner, isAdmin, isAuthenticated, hasShare } = params;

  if (isOwner || isAdmin) return { allowed: true };

  if (visibility === 'public') return { allowed: true };

  if (visibility === 'logged_in') {
    if (!isAuthenticated) {
      return { allowed: false, reason: 'Sign in to view this cap table' };
    }
    return { allowed: true };
  }

  // invite_only
  if (!isAuthenticated) {
    return { allowed: false, reason: 'Sign in to view this cap table' };
  }
  if (!hasShare) {
    return { allowed: false, reason: 'This cap table is invite-only' };
  }
  return { allowed: true };
}
