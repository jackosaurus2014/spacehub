'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSubscription } from './SubscriptionProvider';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@/types';
import { getRequiredTierForModule } from '@/lib/subscription';

// Contextual upgrade messages with feature-specific value propositions
export type UpgradeContext =
  | 'article-limit'
  | 'resource-exchange'
  | 'business-opportunities'
  | 'compliance'
  | 'spectrum-tracker'
  | 'space-insurance'
  | 'orbital-services'
  | 'alerts'
  | 'ai-insights'
  | 'api-access'
  | 'export'
  | 'deal-flow'
  | 'intel-reports'
  | 'supply-chain-map'
  | 'regulatory-calendar'
  | 'executive-moves'
  | 'investment-thesis'
  | 'deal-rooms'
  | 'funding-tracker'
  | 'customer-discovery';

interface ContextualMessage {
  icon: string;
  title: string;
  description: string;
  requiredTier: SubscriptionTier;
  highlights: string[];
}

const CONTEXTUAL_MESSAGES: Record<UpgradeContext, ContextualMessage> = {
  'article-limit': {
    icon: '\u{1F4F0}',
    title: 'Unlimited Article Access',
    description:
      "You've reached your daily article limit. Pro members get unlimited access to all space industry news and analysis.",
    requiredTier: 'pro',
    highlights: [
      'Unlimited daily articles',
      'Priority access to breaking news',
      'Full archive search',
    ],
  },
  'resource-exchange': {
    icon: '\u{1F4B1}',
    title: 'Resource Exchange Calculator',
    description:
      'Unlock the Resource Exchange calculator to estimate mission costs, compare resource pricing, and optimize procurement.',
    requiredTier: 'pro',
    highlights: [
      'Mission cost estimation',
      'Real-time resource pricing',
      'Procurement optimization',
    ],
  },
  'business-opportunities': {
    icon: '\u{1F4BC}',
    title: 'AI-Powered Opportunity Matching',
    description:
      'Get AI-powered business opportunity matching with Enterprise. Discover contracts, partnerships, and market openings tailored to your profile.',
    requiredTier: 'enterprise',
    highlights: [
      'AI contract matching',
      'Partnership discovery',
      'Competitive intelligence',
    ],
  },
  compliance: {
    icon: '\u{1F4DC}',
    title: 'Regulatory Compliance Suite',
    description:
      'Access regulatory compliance tools, treaty monitoring, and filing trackers. Stay ahead of policy changes affecting your operations.',
    requiredTier: 'enterprise',
    highlights: [
      'Treaty monitoring',
      'Filing deadline alerts',
      'Compliance checklists',
    ],
  },
  'spectrum-tracker': {
    icon: '\u{1F4E1}',
    title: 'Spectrum Management',
    description:
      'Monitor spectrum allocations and auction opportunities. Track frequency assignments and plan your communications strategy.',
    requiredTier: 'enterprise',
    highlights: [
      'Allocation tracking',
      'Auction monitoring',
      'Frequency analysis',
    ],
  },
  'space-insurance': {
    icon: '\u{1F6E1}\u{FE0F}',
    title: 'Space Insurance Tools',
    description:
      'Compare space insurance providers and calculate premiums. Assess risk profiles and optimize your coverage strategy.',
    requiredTier: 'enterprise',
    highlights: [
      'Premium calculators',
      'Provider comparison',
      'Risk assessment',
    ],
  },
  'orbital-services': {
    icon: '\u{1F6F0}\u{FE0F}',
    title: 'Orbital Services Dashboard',
    description:
      'Track orbital slot availability and manage service requests. Monitor constellation status and coordinate operations.',
    requiredTier: 'enterprise',
    highlights: [
      'Slot availability',
      'Service requests',
      'Constellation management',
    ],
  },
  alerts: {
    icon: '\u{1F514}',
    title: 'Real-Time Alerts',
    description:
      'Set up real-time alerts for launches, regulatory changes, and market moves. Never miss a critical update.',
    requiredTier: 'pro',
    highlights: [
      'Launch notifications',
      'Regulatory change alerts',
      'Market movement alerts',
    ],
  },
  'ai-insights': {
    icon: '\u{1F9E0}',
    title: 'AI-Powered Analysis',
    description:
      'Get AI-powered analysis of market trends and competitive intelligence. Leverage machine learning for strategic advantage.',
    requiredTier: 'enterprise',
    highlights: [
      'Trend analysis',
      'Competitive intelligence',
      'Predictive insights',
    ],
  },
  'api-access': {
    icon: '\u{1F517}',
    title: 'SpaceNexus API Access',
    description:
      'Access the SpaceNexus API for custom integrations and data feeds. Build on top of our comprehensive space industry data.',
    requiredTier: 'enterprise',
    highlights: [
      'RESTful API',
      'Webhook integrations',
      'Custom data feeds',
    ],
  },
  export: {
    icon: '\u{1F4CA}',
    title: 'Data Export Tools',
    description:
      'Export charts and data to CSV and PNG for presentations and reports. Share insights with your team and stakeholders.',
    requiredTier: 'pro',
    highlights: [
      'CSV data export',
      'PNG chart export',
      'Scheduled reports',
    ],
  },
  'deal-flow': {
    icon: '\u{1F4B0}',
    title: 'Deal Flow Database',
    description:
      'Access 100+ historical space industry deals — funding rounds, M&A, IPOs, and contract wins. Track deal flow in real-time.',
    requiredTier: 'pro',
    highlights: [
      '113 historical space deals',
      'Funding round tracking',
      'M&A and contract alerts',
    ],
  },
  'intel-reports': {
    icon: '\u{1F4D1}',
    title: 'Custom Intelligence Reports',
    description:
      'Generate AI-powered research reports on any space industry topic, company, or sector. Professional-grade analysis in minutes.',
    requiredTier: 'enterprise',
    highlights: [
      'AI-generated sector reports',
      'Company deep dives',
      'Competitive analysis',
    ],
  },
  'supply-chain-map': {
    icon: '\u{1F5FA}\u{FE0F}',
    title: 'Supply Chain Relationship Map',
    description:
      'Visualize supplier-customer relationships across 80+ space companies. Find hidden connections and supply chain risks.',
    requiredTier: 'pro',
    highlights: [
      '82 companies mapped',
      '163 supply relationships',
      'Path finder between companies',
    ],
  },
  'regulatory-calendar': {
    icon: '\u{1F4C5}',
    title: 'Regulatory Deadline Calendar',
    description:
      'Never miss an FCC filing, FAA license renewal, or ITU coordination deadline. 105 space regulatory deadlines tracked.',
    requiredTier: 'pro',
    highlights: [
      '105 regulatory deadlines',
      '.ics calendar export',
      'Agency-specific filtering',
    ],
  },
  'executive-moves': {
    icon: '\u{1F464}',
    title: 'Executive Move Tracker',
    description:
      'Track C-suite and VP-level leadership changes across the space industry. Stay ahead of hiring trends and talent movement.',
    requiredTier: 'pro',
    highlights: [
      '55+ tracked executive moves',
      'Company-linked profiles',
      'Real-time move alerts',
    ],
  },
  'investment-thesis': {
    icon: '\u{1F4C8}',
    title: 'AI Investment Thesis Generator',
    description:
      'Generate comprehensive, AI-powered investment theses for any space company. Get bull/bear cases, risk scoring, competitive analysis, and actionable recommendations.',
    requiredTier: 'enterprise',
    highlights: [
      'AI-powered company analysis',
      'Risk scoring & mitigation',
      'Comparable transaction analysis',
    ],
  },
  'deal-rooms': {
    icon: '\u{1F512}',
    title: 'Secure Deal Rooms',
    description:
      'Create private, NDA-protected deal rooms for investors and startups. Share confidential documents with full audit trails and member management.',
    requiredTier: 'enterprise',
    highlights: [
      'NDA workflow & tracking',
      'Secure document sharing',
      'Full activity audit trail',
    ],
  },
  'funding-tracker': {
    icon: '\u{1F4B0}',
    title: 'Funding Round Tracker',
    description:
      'Track venture capital, M&A, and IPO activity across the space industry. Monitor 50+ investors and analyze funding trends by sector and stage.',
    requiredTier: 'pro',
    highlights: [
      '50+ space investors tracked',
      'Funding round & valuation data',
      'Sector & stage analysis',
    ],
  },
  'customer-discovery': {
    icon: '\u{1F50E}',
    title: 'Customer Discovery Engine',
    description:
      'Find your space industry customers by cross-referencing procurement categories, tech needs, and government agency budgets. Match your product to buyers.',
    requiredTier: 'enterprise',
    highlights: [
      'Procurement category matching',
      'Government agency mapping',
      'Customer segment analysis',
    ],
  },
};

interface PremiumGateProps {
  moduleId?: string;
  requiredTier?: SubscriptionTier;
  children: React.ReactNode;
  showPreview?: boolean;
  context?: UpgradeContext;
}

export default function PremiumGate({
  moduleId,
  requiredTier: propRequiredTier,
  children,
  showPreview = true,
  context,
}: PremiumGateProps) {
  const { tier, canAccess, isLoading, isTrialing, trialEndsAt } = useSubscription();

  // Determine required tier
  const requiredTier = propRequiredTier || (moduleId ? getRequiredTierForModule(moduleId) : null);

  // If no premium requirement, show children
  if (!requiredTier) {
    return <>{children}</>;
  }

  // If user has access, show children (with trial badge if trialing)
  if (moduleId ? canAccess(moduleId) : true) {
    const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
    const hasAccess = tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier);
    if (hasAccess) {
      return (
        <>
          {isTrialing && <TrialBanner trialEndsAt={trialEndsAt} />}
          {children}
        </>
      );
    }
  }

  // Check access based on required tier
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
  const hasAccess = tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier);

  if (hasAccess) {
    return (
      <>
        {isTrialing && <TrialBanner trialEndsAt={trialEndsAt} />}
        {children}
      </>
    );
  }

  // Resolve contextual message
  const contextMessage = context ? CONTEXTUAL_MESSAGES[context] : null;
  const plan = SUBSCRIPTION_PLANS.find(
    (p) => p.id === (contextMessage?.requiredTier || requiredTier)
  );

  return (
    <div className="relative">
      {/* Blurred preview */}
      {showPreview && (
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="card p-8 text-center max-w-md mx-auto"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none" />

          <div className="relative">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center"
            >
              <span className="text-3xl">{contextMessage?.icon || '\u{1F680}'}</span>
            </motion.div>

            {/* Title */}
            <h3 className="text-xl font-bold text-cyan-50 mb-2">
              {contextMessage?.title || `Upgrade to ${plan?.name || 'Premium'}`}
            </h3>

            {/* Description */}
            <p className="text-slate-400 mb-5 text-sm leading-relaxed">
              {contextMessage?.description ||
                `This feature requires a ${plan?.name || 'premium'} subscription. Unlock real-time data, advanced analytics, and more.`}
            </p>

            {/* Feature highlights */}
            {contextMessage?.highlights && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-left mb-6 space-y-2"
              >
                {contextMessage.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </motion.ul>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Link
                href="/pricing"
                className="block w-full py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
              >
                {plan?.trialDays
                  ? `Start ${plan.trialDays}-Day Free Trial`
                  : `View Plans - Starting at $${plan?.price || 9.99}/mo`}
              </Link>
              <Link
                href="/pricing"
                className="block text-slate-400 hover:text-cyan-300 text-sm transition-colors"
              >
                Compare all features &rarr;
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Badge component for premium features
export function PremiumBadge({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'free') return null;

  const colors: Record<string, string> = {
    pro: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    enterprise: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    test: 'bg-green-500/10 text-green-300 border-green-500/30',
  };

  const labels: Record<string, string> = {
    pro: 'PRO',
    enterprise: 'ENTERPRISE',
    test: 'TEST',
  };

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colors[tier] || colors.enterprise}`}>
      {labels[tier] || tier.toUpperCase()}
    </span>
  );
}

// Trial banner shown when accessing premium content via trial
function TrialBanner({ trialEndsAt }: { trialEndsAt: Date | null }) {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  return (
    <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-center gap-2">
      <span>&#127919;</span>
      <span>
        Trial Active &mdash; Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.{' '}
        <Link href="/pricing" className="underline font-medium hover:text-amber-100">
          Subscribe to keep access
        </Link>
      </span>
    </div>
  );
}

// Inline upgrade prompt for smaller features
export function UpgradePrompt({
  feature,
  requiredTier = 'pro',
  context,
}: {
  feature: string;
  requiredTier?: SubscriptionTier;
  context?: UpgradeContext;
}) {
  const { tier } = useSubscription();
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

  if (tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier)) {
    return null;
  }

  const contextMessage = context ? CONTEXTUAL_MESSAGES[context] : null;

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200"
    >
      <span>{contextMessage?.icon || '\u{1F512}'}</span>
      <span>{contextMessage ? contextMessage.title : `Upgrade to unlock ${feature}`}</span>
    </Link>
  );
}
