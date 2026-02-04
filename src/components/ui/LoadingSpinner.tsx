export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizes[size]} border-nebula-500/30 rounded-full animate-spin`}
          style={{ borderWidth: '3px', borderTopColor: '#4c1d95' }}
        />
        {/* Inner ring */}
        <div
          className={`absolute inset-1 border-plasma-400/20 rounded-full animate-spin`}
          style={{
            borderWidth: '2px',
            borderTopColor: '#06b6d4',
            animationDirection: 'reverse',
            animationDuration: '0.8s',
          }}
        />
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.15)',
          }}
        />
      </div>
    </div>
  );
}
