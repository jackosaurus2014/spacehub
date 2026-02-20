'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProposalCard from '@/components/marketplace/ProposalCard';
import ProposalForm from '@/components/marketplace/ProposalForm';
import MatchScore from '@/components/marketplace/MatchScore';
import ClarificationThread from '@/components/marketplace/ClarificationThread';
import ComingSoonBadge from '@/components/marketplace/ComingSoonBadge';
import { getCategoryIcon, getCategoryLabel, formatPrice, RFQ_STATUSES } from '@/lib/marketplace-types';
import { toast } from '@/lib/toast';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export default function RFQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/marketplace/rfq/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load RFQ');
        }
        setRfq(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleProposalAction = async (proposalId: string, status: string) => {
    try {
      const res = await fetch(`/api/marketplace/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update proposal');

      toast.success(`Proposal ${status}`);
      // Reload
      const rfqRes = await fetch(`/api/marketplace/rfq/${id}`);
      if (rfqRes.ok) setRfq(await rfqRes.json());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || !rfq) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-slate-400">{error || 'RFQ not found'}</div>
          <Link href="/marketplace" className="text-cyan-400 text-sm hover:underline mt-2 block">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const rfqData = rfq.rfq || rfq;
  const userRole = rfq.role || 'public';
  const statusInfo = RFQ_STATUSES[rfqData.status as keyof typeof RFQ_STATUSES] || RFQ_STATUSES.open;
  const daysLeft = rfqData.deadline
    ? Math.max(0, Math.ceil((new Date(rfqData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Marketplace', href: '/marketplace' },
          { name: rfqData?.title || 'RFQ' },
        ]} />
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-slate-300 transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{rfqData?.title || 'RFQ'}</span>
        </nav>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span>{getCategoryIcon(rfqData.category)}</span>
            <span className="text-xs text-slate-400">{getCategoryLabel(rfqData.category)}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusInfo.bgColor}/20 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{rfqData.title}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Posted {new Date(rfqData.createdAt).toLocaleDateString()}</span>
            {daysLeft !== null && daysLeft > 0 && (
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                daysLeft <= 3 ? 'bg-red-500/15 text-red-400' :
                daysLeft <= 7 ? 'bg-orange-500/15 text-orange-400' :
                'bg-green-500/15 text-green-400'
              }`}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
              </span>
            )}
            {daysLeft !== null && daysLeft <= 0 && (
              <span className="px-2 py-0.5 rounded-full font-medium bg-slate-500/15 text-slate-400">
                Deadline passed
              </span>
            )}
            {rfqData.proposalCount > 0 && (
              <span>{rfqData.proposalCount} proposal{rfqData.proposalCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3">
            <div className="text-[10px] text-slate-500 uppercase">Budget Range</div>
            <div className="text-sm font-semibold text-emerald-400">
              {formatPrice(rfqData.budgetMin, rfqData.budgetMax)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-slate-500 uppercase">Deadline</div>
            <div className={`text-sm font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-orange-400' : 'text-slate-300'}`}>
              {rfqData.deadline ? new Date(rfqData.deadline).toLocaleDateString() : 'Open'}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-slate-500 uppercase">Delivery</div>
            <div className="text-sm font-semibold text-slate-300">
              {rfqData.deliveryDate ? new Date(rfqData.deliveryDate).toLocaleDateString() : 'Flexible'}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-slate-500 uppercase">Proposals</div>
            <div className="text-sm font-semibold text-cyan-400">
              {rfqData.proposals?.length ?? rfqData._count?.proposals ?? 0}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{rfqData.description}</p>
        </div>

        {/* Compliance Requirements */}
        {rfqData.complianceReqs?.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Required Certifications</h3>
            <div className="flex flex-wrap gap-2">
              {rfqData.complianceReqs.map((cert: string) => (
                <span key={cert} className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Proposals (buyer view) */}
        {rfqData.proposals && rfqData.proposals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Proposals ({rfqData.proposals.length})
            </h3>
            {userRole === 'buyer' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3 flex items-center gap-2">
                <span className="text-xs text-blue-300">You can shortlist and evaluate proposals. Secure contract awarding with payments is</span>
                <ComingSoonBadge />
              </div>
            )}
            <div className="space-y-3">
              {rfqData.proposals.map((proposal: any) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isBuyer={userRole === 'buyer'}
                  onAction={handleProposalAction}
                />
              ))}
            </div>
          </div>
        )}

        {/* Matches (buyer view) */}
        {rfqData.matches && rfqData.matches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Matched Providers ({rfqData.matches.length})
            </h3>
            <div className="space-y-2">
              {rfqData.matches.map((match: any) => (
                <div key={match.id || match.listingId} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-sm">
                      {match.listing?.company?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {match.listing?.company?.name || 'Provider'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {match.listing?.name || 'Service'}
                      </div>
                    </div>
                  </div>
                  <MatchScore score={match.matchScore} reasons={match.matchReasons} showDetails />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Proposal (provider view) */}
        {userRole === 'provider' && rfqData.status === 'open' && (
          <div>
            {showProposalForm ? (
              <div className="card p-5">
                <ProposalForm
                  rfqId={id}
                  onSuccess={() => {
                    setShowProposalForm(false);
                    // Reload
                    fetch(`/api/marketplace/rfq/${id}`).then(r => r.json()).then(setRfq);
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowProposalForm(true)}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition-all"
              >
                Submit a Proposal
              </button>
            )}
          </div>
        )}

        {/* Clarifications Q&A */}
        {(userRole === 'buyer' || userRole === 'provider' || rfqData.isPublic) && (
          <ClarificationThread rfqId={id} userRole={userRole as 'buyer' | 'provider' | 'public'} />
        )}

        {/* Public view message */}
        {userRole === 'public' && rfqData.status === 'open' && (
          <div className="card p-5 text-center">
            <p className="text-sm text-slate-400 mb-3">
              Sign in and claim a company profile to submit a proposal for this RFQ.
            </p>
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
              Sign In →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
