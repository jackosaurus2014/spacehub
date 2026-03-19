/**
 * SpaceNexus logo as an inline SVG component.
 * Use this for places where the PNG logo has loading issues or
 * where you need crisp rendering at any size (footer, emails, etc.).
 *
 * The logomark is a stylized orbit ring around a nexus point,
 * representing the convergence of space data.
 */
export default function SpaceNexusLogo({
  size = 'md',
  showText = true,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { icon: 20, text: 'text-sm', gap: 'gap-1.5' },
    md: { icon: 28, text: 'text-base', gap: 'gap-2' },
    lg: { icon: 36, text: 'text-xl', gap: 'gap-2.5' },
  };

  const s = sizes[size];

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      {/* Logomark — orbit ring with nexus dot */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer orbit ring */}
        <ellipse cx="20" cy="20" rx="18" ry="10" stroke="url(#logoGrad)" strokeWidth="1.5" transform="rotate(-25 20 20)" />
        {/* Inner orbit ring */}
        <ellipse cx="20" cy="20" rx="14" ry="7" stroke="url(#logoGrad)" strokeWidth="1" transform="rotate(25 20 20)" opacity="0.5" />
        {/* Nexus point */}
        <circle cx="20" cy="20" r="4" fill="url(#logoGrad)" />
        {/* Highlight dot */}
        <circle cx="18.5" cy="18.5" r="1.2" fill="white" opacity="0.6" />
        {/* Satellite dot on orbit */}
        <circle cx="35" cy="15" r="2" fill="#06b6d4" opacity="0.8" />

        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Text */}
      {showText && (
        <span className={`${s.text} font-bold text-white tracking-tight`}>
          Space<span className="text-cyan-400">Nexus</span>
        </span>
      )}
    </div>
  );
}
