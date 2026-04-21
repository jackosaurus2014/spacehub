// ─── Space Tycoon: Corporate Governance v1 ──────────────────────────────────
// Per STATS_DESIGN.md Phase VI. Scaffolding for a multi-member corporation:
// role-based permissions, shared treasury tracking, dividend declarations,
// and (for a future wave) acquisitions / board elections.
//
// v1 is deliberately single-player-visible even in single-player games —
// it treats the player as simultaneously CEO / CFO / sole director. This
// gives us the data shape before multiplayer alliances rewire things.

import type { GameState } from './types';

// ─── Roles & permissions ─────────────────────────────────────────────────────

export type CorporateRole =
  | 'ceo'          // everything
  | 'cfo'          // treasury, finance, dividends, contracts
  | 'coo'          // operations, build, fleet, crew
  | 'cto'          // research, commanders, modules
  | 'director'     // read-only access to everything, vote on major actions
  | 'member';      // contribute, build at personal tier, no corp-wide

export interface Permission {
  id:
    | 'spend_corp_funds'
    | 'hire_fire_crew'
    | 'sign_inter_corp_contract'
    | 'accept_inter_corp_contract'
    | 'propose_acquisition'
    | 'vote_acquisition'
    | 'declare_dividend'
    | 'change_member_role'
    | 'transfer_asset'
    | 'close_futures_position';
  description: string;
}

const ROLE_PERMISSIONS: Record<CorporateRole, Permission['id'][]> = {
  ceo: [
    'spend_corp_funds', 'hire_fire_crew', 'sign_inter_corp_contract',
    'accept_inter_corp_contract', 'propose_acquisition', 'vote_acquisition',
    'declare_dividend', 'change_member_role', 'transfer_asset',
    'close_futures_position',
  ],
  cfo: [
    'spend_corp_funds', 'sign_inter_corp_contract', 'accept_inter_corp_contract',
    'declare_dividend', 'vote_acquisition', 'close_futures_position',
  ],
  coo: [
    'spend_corp_funds', 'hire_fire_crew', 'accept_inter_corp_contract',
    'transfer_asset',
  ],
  cto: [
    'spend_corp_funds', 'hire_fire_crew',
  ],
  director: [
    'vote_acquisition',
  ],
  member: [],
};

export function hasPermission(role: CorporateRole, perm: Permission['id']): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

export function getRolePermissions(role: CorporateRole): Permission['id'][] {
  return ROLE_PERMISSIONS[role];
}

// ─── Treasury ────────────────────────────────────────────────────────────────

/**
 * Corporate treasury is the shared wallet of the corporation. In v1 this
 * mirrors the player's money exactly (single-player treats player as sole
 * shareholder). Once multiplayer alliances exist, treasury is distinct
 * from personal wallets and governed by CFO permissions.
 */
export function getCorporateTreasury(state: GameState): number {
  return state.corporateTreasury ?? state.money;
}

export function contributeToTreasury(state: GameState, amount: number): GameState {
  if (state.money < amount || amount <= 0) return state;
  return {
    ...state,
    money: state.money - amount,
    corporateTreasury: (state.corporateTreasury ?? 0) + amount,
  };
}

export function withdrawFromTreasury(state: GameState, amount: number, role: CorporateRole): GameState {
  if (!hasPermission(role, 'spend_corp_funds')) return state;
  const treasury = state.corporateTreasury ?? 0;
  if (treasury < amount || amount <= 0) return state;
  return {
    ...state,
    money: state.money + amount,
    corporateTreasury: treasury - amount,
  };
}

// ─── Dividends ───────────────────────────────────────────────────────────────

export interface DividendRecord {
  id: string;
  declaredAtMs: number;
  perShareAmount: number;     // $ per share paid
  totalPayout: number;        // $ total distributed
  declaringUserId?: string;
  /** Source: treasury before the payout was deducted. */
  treasuryBefore: number;
}

/**
 * Declare a dividend. In single-player this sends the full payout back to
 * the player's personal wallet. In multiplayer (future), payout is split
 * across all members proportionally to their shareholdings.
 */
export function declareDividend(
  state: GameState,
  perShareAmount: number,
  role: CorporateRole,
  now: number = Date.now(),
): GameState {
  if (!hasPermission(role, 'declare_dividend')) return state;
  if (perShareAmount <= 0) return state;
  const treasury = state.corporateTreasury ?? 0;
  // v1: assume 1 share = whole corporation = single player
  const totalPayout = perShareAmount;
  if (treasury < totalPayout) return state;

  const record: DividendRecord = {
    id: `div-${now.toString(36)}`,
    declaredAtMs: now,
    perShareAmount,
    totalPayout,
    treasuryBefore: treasury,
  };
  return {
    ...state,
    corporateTreasury: treasury - totalPayout,
    money: state.money + totalPayout,
    totalEarned: state.totalEarned + totalPayout,
    dividendHistory: [record, ...(state.dividendHistory || [])].slice(0, 50),
  };
}

// ─── Acquisition offer (stubbed for future multiplayer) ──────────────────────

export interface AcquisitionOffer {
  id: string;
  offeringCorpId: string;
  targetCorpId: string;
  offeredPerShare: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  proposedAtMs: number;
  resolvedAtMs?: number;
}

// Stub only — acquisition mechanics require a real multi-corporation world
// model to be meaningful. Shape is declared so UI can sketch the flow without
// a functional engine yet.
