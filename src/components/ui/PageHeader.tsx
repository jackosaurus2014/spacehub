import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  backLink?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  backLink,
  backLabel,
  actions,
  children
}: PageHeaderProps) {
  return (
    <div className="pt-12 pb-8">
      {backLink && (
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 text-star-300 hover:text-white text-sm mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel || 'Back'}
        </Link>
      )}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-star-300 text-sm mb-4">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-star-300/50">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-white transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="w-12 h-[3px] bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full mb-4" />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-display-md font-display font-bold text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-star-300 mt-2 text-lg">{subtitle}</p>
          )}
          {description && (
            <p className="text-star-300 mt-2">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {actions}
          {children}
        </div>
      </div>
    </div>
  );
}
