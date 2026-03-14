'use client';

import Image from 'next/image';
import { PROPOSAL_STATUSES } from '@/lib/marketplace-types';
import MatchScore from './MatchScore';
import ComingSoonBadge from './ComingSoonBadge';

interface Proposal {
  id: string;
  price: number | null;
  timeline: string | null;
  approach: string | null;
  status: string;
  submittedAt: string;
  company?: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    verificationLevel?: string | null;
  };
  rfq?: {
    id: string;
    slug?: string;
    title: string;
    category?: string;
    status?: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    deadline?: string | null;
  };
  matchScore?: number | null;
}

interface ProposalCardProps {
  proposal: Proposal;
  isBuyer?: boolean;
  onAction?: (proposalId: string, action: string) => void;
}

export default function ProposalCard({ proposal, isBuyer, onAction }: ProposalCardProps) {
  const statusInfo = PROPOSAL_STATUSES[proposal.status as keyof typeof PROPOSAL_STATUSES] || PROPOSAL_STATUSES.submitted;

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {proposal.rfq && !isBuyer ? (
            <>
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                📋
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{proposal.rfq.title}</div>
                <div className="text-xs text-slate-500">
                  Submitted {new Date(proposal.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  {proposal.rfq.status && <span className="ml-1">· RFQ {proposal.rfq.status}</span>}
                </div>
              </div>
            </>
          ) : proposal.company ? (
            <>
              <div className="w-8 h-8 rounded bg-white/[0.08] flex items-center justify-center text-sm flex-shrink-0">
                {proposal.company.logoUrl ? (
                  <Image src={proposal.company.logoUrl} alt={`${proposal.company.name} logo`} width={24} height={24} className="w-6 h-6 rounded object-contain" unoptimized />
                ) : (
                  proposal.company.name.charAt(0)
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{proposal.company.name}</div>
                <div className="text-xs text-slate-500">
                  Submitted {new Date(proposal.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">
              Submitted {new Date(proposal.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </div>
          )}
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${statusInfo.bgColor}/20 ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {proposal.price && (
          <div className="bg-white/[0.04] rounded p-2">
            <div className="text-xs text-slate-500 uppercase">Proposed Price</div>
            <div className="text-sm font-semibold text-emerald-400">
              ${proposal.price.toLocaleString()}
            </div>
          </div>
        )}
        {proposal.timeline && (
          <div className="bg-white/[0.04] rounded p-2">
            <div className="text-xs text-slate-500 uppercase">Timeline</div>
            <div className="text-sm font-semibold text-white/70">{proposal.timeline}</div>
          </div>
        )}
      </div>

      {proposal.approach && (
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{proposal.approach}</p>
      )}

      {proposal.matchScore && (
        <div className="pt-2 border-t border-white/[0.06]">
          <div className="text-xs text-slate-500 mb-1">Match Score</div>
          <MatchScore score={proposal.matchScore} />
        </div>
      )}

      {/* Actions (buyer only) */}
      {isBuyer && proposal.status === 'submitted' && onAction && (
        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <button
            onClick={() => onAction(proposal.id, 'shortlisted')}
            className="flex-1 text-xs py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
          >
            Shortlist
          </button>
          <button
            onClick={() => onAction(proposal.id, 'rejected')}
            className="flex-1 text-xs py-1.5 bg-white/[0.04] text-slate-400 rounded hover:bg-white/[0.08] transition-colors"
          >
            Decline
          </button>
        </div>
      )}
      {isBuyer && proposal.status === 'shortlisted' && (
        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <button
            disabled
            title="Secure contract awarding with escrow payments is coming soon"
            className="flex-1 text-xs py-1.5 bg-green-500/10 text-green-400/50 rounded font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            Award Contract <ComingSoonBadge />
          </button>
        </div>
      )}
    </div>
  );
}
