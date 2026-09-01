/**
 * The only User fields safe to hand to *anyone* who can read a listing —
 * rosters, message authors, leaderboards, public directories.
 *
 * Deliberately excludes `email`: several public GETs used to select it purely
 * to render a display name, which made the registered user base harvestable
 * by walking public listings (docs/SECURITY_AUDIT_2026-08.md, D1-D4 and P8).
 * `User` has no avatar/image column today; add one here if it ever grows one.
 *
 * Use this constant instead of an inline `select: { id, name, ... }` so a
 * future "just add email" edit has one place to be reviewed.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  verifiedBadge: true,
} as const;

export type PublicUser = {
  id: string;
  name: string | null;
  verifiedBadge: string | null;
};
