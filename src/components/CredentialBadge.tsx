import {
  Award,
  GraduationCap,
  ScrollText,
  ShieldAlert,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

/**
 * Server component — renders a tiny chip representing a verified credential.
 * Shows credential-type icon + issuing organization. The full title appears
 * in the native browser tooltip.
 *
 * Sensitive credential details (e.g. specific clearance level) are NEVER
 * displayed publicly — callers should pass only safe summary text in `title`
 * and avoid leaking `credentialId`.
 */

export type CredentialType =
  | 'degree'
  | 'certification'
  | 'clearance'
  | 'license'
  | 'patent';

interface CredentialBadgeProps {
  credentialType: CredentialType | string;
  issuingOrg: string;
  title?: string;
  size?: 'sm' | 'md';
}

interface CredentialConfig {
  icon: LucideIcon;
  label: string;
  colorClass: string;
}

const CONFIG: Record<CredentialType, CredentialConfig> = {
  degree: {
    icon: GraduationCap,
    label: 'Degree',
    colorClass: 'text-indigo-300',
  },
  certification: {
    icon: Award,
    label: 'Certification',
    colorClass: 'text-emerald-300',
  },
  clearance: {
    icon: ShieldAlert,
    label: 'Clearance',
    colorClass: 'text-amber-300',
  },
  license: {
    icon: ScrollText,
    label: 'License',
    colorClass: 'text-sky-300',
  },
  patent: {
    icon: Lightbulb,
    label: 'Patent',
    colorClass: 'text-purple-300',
  },
};

const SIZE_ICON: Record<NonNullable<CredentialBadgeProps['size']>, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

const SIZE_TEXT: Record<NonNullable<CredentialBadgeProps['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export default function CredentialBadge({
  credentialType,
  issuingOrg,
  title,
  size = 'md',
}: CredentialBadgeProps) {
  const config =
    CONFIG[credentialType as CredentialType] ?? CONFIG.certification;
  const Icon = config.icon;
  const tooltip = title
    ? `${config.label}: ${title} — ${issuingOrg}`
    : `${config.label} — ${issuingOrg}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.05] text-white/80 font-medium ${SIZE_TEXT[size]}`}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon
        className={`${SIZE_ICON[size]} ${config.colorClass} flex-shrink-0`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span className="truncate max-w-[140px]">{issuingOrg}</span>
    </span>
  );
}
