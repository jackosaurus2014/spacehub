export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizes[size]} border-3 border-nebula-500 border-t-transparent rounded-full animate-spin`}
        style={{ borderWidth: '3px' }}
      />
    </div>
  );
}
