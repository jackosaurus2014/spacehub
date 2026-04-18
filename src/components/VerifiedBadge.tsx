import {
  BadgeCheck,
  Building2,
  DollarSign,
  Newspaper,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/**
 * Server component — renders a verification badge next to a user's name.
 * Returns null for unverified / null badge values so it can be dropped in safely.
 */

type BadgeType = 'email' | 'domain' | 'founder' | 'investor' | 'media' | 'admin';

interface VerifiedBadgeProps {
  badge: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

interface BadgeConfig {
  icon: LucideIcon;
  colorClass: string;
  title: string;
  label: string;
}

const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  email: {
    icon: BadgeCheck,
    colorClass: 'text-green-400',
    title: 'Email verified',
    label: 'Email verified',
  },
  domain: {
    icon: Building2,
    colorClass: 'text-blue-400',
    title: 'Company domain verified',
    label: 'Domain verified',
  },
  founder: {
    icon: Sparkles,
    colorClass: 'text-purple-400',
    title: 'Verified founder',
    label: 'Verified founder',
  },
  investor: {
    icon: DollarSign,
    colorClass: 'text-amber-400',
    title: 'Verified investor',
    label: 'Verified investor',
  },
  media: {
    icon: Newspaper,
    colorClass: 'text-orange-400',
    title: 'Verified media/press',
    label: 'Verified media',
  },
  admin: {
    icon: ShieldCheck,
    colorClass: 'text-red-400',
    title: 'SpaceNexus admin',
    label: 'SpaceNexus admin',
  },
};

const SIZE_CLASSES: Record<NonNullable<VerifiedBadgeProps['size']>, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export default function VerifiedBadge({ badge, size = 'md' }: VerifiedBadgeProps) {
  if (!badge || badge === 'unverified') return null;

  const config = BADGE_CONFIG[badge as BadgeType];
  if (!config) return null;

  const Icon = config.icon;
  const iconClass = `${SIZE_CLASSES[size]} ${config.colorClass} inline-block flex-shrink-0`;

  return (
    <span
      className="inline-flex items-center"
      title={config.title}
      aria-label={config.label}
      role="img"
    >
      <Icon className={iconClass} strokeWidth={2.25} />
      <span className="sr-only">{config.label}</span>
    </span>
  );
}
