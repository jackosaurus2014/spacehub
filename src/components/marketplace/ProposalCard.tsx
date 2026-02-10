'use client';

import { PROPOSAL_STATUSES } from '@/lib/marketplace-types';
import MatchScore from './MatchScore';

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
              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center text-sm flex-shrink-0">
                📋
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{proposal.rfq.title}</div>
                <div className="text-[10px] text-slate-500">
                  Submitted {new Date(proposal.submittedAt).toLocaleDateString()}
                  {proposal.rfq.status && <span className="ml-1">· RFQ {proposal.rfq.status}</span>}
                </div>
              </div>
            </>
          ) : proposal.company ? (
            <>
              <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                {proposal.company.logoUrl ? (
                  <img src={proposal.company.logoUrl} alt="" className="w-6 h-6 rounded object-contain" />
                ) : (
                  proposal.company.name.charAt(0)
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{proposal.company.name}</div>
                <div className="text-[10px] text-slate-500">
                  Submitted {new Date(proposal.submittedAt).toLocaleDateString()}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-slate-500">
              Submitted {new Date(proposal.submittedAt).toLocaleDateString()}
            </div>
          )}
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusInfo.bgColor}/20 ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {proposal.price && (
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-[10px] text-slate-500 uppercase">Proposed Price</div>
            <div className="text-sm font-semibold text-emerald-400">
              ${proposal.price.toLocaleString()}
            </div>
          </div>
        )}
        {proposal.timeline && (
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-[10px] text-slate-500 uppercase">Timeline</div>
            <div className="text-sm font-semibold text-slate-300">{proposal.timeline}</div>
          </div>
        )}
      </div>

      {proposal.approach && (
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{proposal.approach}</p>
      )}

      {proposal.matchScore && (
        <div className="pt-2 border-t border-slate-700/50">
          <div className="text-[10px] text-slate-500 mb-1">Match Score</div>
          <MatchScore score={proposal.matchScore} />
        </div>
      )}

      {/* Actions (buyer only) */}
      {isBuyer && proposal.status === 'submitted' && onAction && (
        <div className="flex gap-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={() => onAction(proposal.id, 'shortlisted')}
            className="flex-1 text-xs py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
          >
            Shortlist
          </button>
          <button
            onClick={() => onAction(proposal.id, 'rejected')}
            className="flex-1 text-xs py-1.5 bg-slate-700/50 text-slate-400 rounded hover:bg-slate-700 transition-colors"
          >
            Decline
          </button>
        </div>
      )}
      {isBuyer && proposal.status === 'shortlisted' && onAction && (
        <div className="flex gap-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={() => onAction(proposal.id, 'awarded')}
            className="flex-1 text-xs py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors font-semibold"
          >
            Award Contract
          </button>
        </div>
      )}
    </div>
  );
}
