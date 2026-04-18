'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSubscription } from './SubscriptionProvider';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@/types';
import { getRequiredTierForModule } from '@/lib/subscription';
import { trackGA4Event } from '@/lib/analytics';

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
  | 'customer-discovery'
  | 'market-intel'
  | 'satellite-tracking'
  | 'launch-tracking'
  | 'patent-tracker';

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
    title: 'ITAR/EAR Export Control Database',
    description:
      'Access the complete ITAR/EAR export control database, treaty monitoring, and regulatory filing trackers. Stay compliant across all jurisdictions.',
    requiredTier: 'enterprise',
    highlights: [
      'Complete ITAR/EAR export control database',
      'Treaty monitoring & filing deadline alerts',
      'Jurisdiction-specific compliance checklists',
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
  'market-intel': {
    icon: '\u{1F4C8}',
    title: 'Space Market Intelligence',
    description:
      'Unlock real-time space stock tracking and 200+ company valuations. Monitor market cap movements, earnings, and sector performance across the space economy.',
    requiredTier: 'pro',
    highlights: [
      'Real-time stock tracking for 20+ space companies',
      '200+ company valuations & financial profiles',
      'Sector performance analytics & trend detection',
    ],
  },
  'satellite-tracking': {
    icon: '\u{1F6F0}\u{FE0F}',
    title: 'Full Satellite Catalog',
    description:
      'Track every active satellite in orbit with real-time TLE data. The free tier covers 50 satellites \u2014 upgrade for the full catalog plus conjunction alerts.',
    requiredTier: 'pro',
    highlights: [
      'Full catalog of 8,000+ active satellites',
      'Real-time conjunction & collision alerts',
      'Custom tracking lists & ground station passes',
    ],
  },
  'launch-tracking': {
    icon: '\u{1F680}',
    title: 'Advanced Launch Intelligence',
    description:
      'Go beyond basic launch schedules with window calculators, payload manifests, and provider comparison tools. Enterprise includes full API access.',
    requiredTier: 'pro',
    highlights: [
      'Launch window calculator & delta-v planner',
      'Payload manifest & provider comparison',
      'Historical success rate analytics',
    ],
  },
  'patent-tracker': {
    icon: '\u{1F4DD}',
    title: 'Space Patent Intelligence',
    description:
      'Monitor patent filings across the space industry. Track competitor IP strategies, identify white space opportunities, and get alerts on new filings.',
    requiredTier: 'enterprise',
    highlights: [
      'Space patent database & search',
      'Competitor IP landscape analysis',
      'New filing alerts & trend reports',
    ],
  },
};

// Map moduleId values to their corresponding UpgradeContext so that
// PremiumGate can automatically show module-specific messaging even when
// only a moduleId is provided (e.g. from ModuleContainer).
const MODULE_ID_TO_CONTEXT: Record<string, UpgradeContext> = {
  'resource-exchange': 'resource-exchange',
  'business-opportunities': 'business-opportunities',
  'compliance': 'compliance',
  'spectrum-tracker': 'spectrum-tracker',
  'space-insurance': 'space-insurance',
  'orbital-services': 'orbital-services',
  'deal-flow': 'deal-flow',
  'supply-chain-map': 'supply-chain-map',
  'supply-chain': 'supply-chain-map',
  'regulatory-calendar': 'regulatory-calendar',
  'executive-moves': 'executive-moves',
  'intel-reports': 'intel-reports',
  'investment-thesis': 'investment-thesis',
  'deal-rooms': 'deal-rooms',
  'funding-tracker': 'funding-tracker',
  'customer-discovery': 'customer-discovery',
  'api-docs': 'api-access',
  'patent-tracker': 'patent-tracker',
  'space-economy': 'market-intel',
  'space-capital': 'deal-flow',
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

  // Resolve contextual message — prefer explicit context, fall back to moduleId mapping
  const resolvedContext = context || (moduleId ? MODULE_ID_TO_CONTEXT[moduleId] : undefined);
  const contextMessage = resolvedContext ? CONTEXTUAL_MESSAGES[resolvedContext] : null;
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
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-purple-500/10 pointer-events-none" />

          <div className="relative">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-white/5 to-purple-500/20 border border-white/10 flex items-center justify-center"
            >
              <span className="text-3xl">{contextMessage?.icon || '\u{1F680}'}</span>
            </motion.div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2">
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
                    className="flex items-center gap-2 text-sm text-white/70"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </motion.ul>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Link
                href="/pricing"
                onClick={() => trackGA4Event('upgrade_clicked', { source: 'paywall' })}
                className="block w-full py-3 px-6 rounded-xl bg-gradient-to-r from-white to-purple-500 text-white font-semibold hover:from-slate-300 hover:to-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-black/15"
              >
                {plan?.trialDays
                  ? `Start ${plan.trialDays}-Day Free Trial`
                  : `View Plans - Starting at $${plan?.price || 19.99}/mo`}
              </Link>
              <Link
                href="/pricing"
                onClick={() => trackGA4Event('upgrade_clicked', { source: 'paywall_compare' })}
                className="block text-slate-400 hover:text-white text-sm transition-colors"
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
    pro: 'bg-white/5 text-white/90 border-white/10',
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
      onClick={() => trackGA4Event('upgrade_clicked', { source: 'inline_prompt', feature })}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/90 text-sm hover:bg-slate-100/20 hover:border-white/15 transition-all duration-200"
    >
      <span>{contextMessage?.icon || '\u{1F512}'}</span>
      <span>{contextMessage ? contextMessage.title : `Upgrade to unlock ${feature}`}</span>
    </Link>
  );
}
