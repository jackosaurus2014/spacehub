'use client';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl card">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>
      <div className="relative p-8 md:p-12 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-700/50 animate-float shadow-lg shadow-slate-900/50">
          {icon}
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">{description}</p>
        {action && <div className="mt-4 md:mt-6 [&>a]:w-full [&>a]:md:w-auto [&>button]:w-full [&>button]:md:w-auto">{action}</div>}
      </div>
    </div>
  );
}
