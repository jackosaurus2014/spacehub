/**
 * V3 Section Header — left-aligned with accent bar indicator.
 * Replaces centered text-display headings across the site.
 *
 * Pattern:
 * ┌─ [accent bar]  Section Title          [meta text] ─┐
 * │  Description text in secondary color                │
 */
interface SectionHeaderProps {
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Gradient color for the accent bar (Tailwind gradient classes) */
  accentGradient?: string;
  /** Small meta text on the right (e.g., "264+ tools", "Updated Q1 2026") */
  meta?: string;
  /** Additional className on the wrapper */
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  accentGradient = 'from-indigo-400 to-indigo-600',
  meta,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={className}>
      <div className="section-header">
        <div className="flex items-center">
          <div className={`section-header__bar bg-gradient-to-b ${accentGradient}`} />
          <h2 className="section-header__title">{title}</h2>
        </div>
        {meta && <span className="section-header__meta">{meta}</span>}
      </div>
      {description && <p className="section-header__desc">{description}</p>}
    </div>
  );
}
