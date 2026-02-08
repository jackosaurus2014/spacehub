'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumb?: string;
  accentColor?: string;
  children?: ReactNode;
}

export default function AnimatedPageHeader({
  title,
  subtitle,
  icon,
  breadcrumb,
  accentColor = 'cyan',
  children,
}: AnimatedPageHeaderProps) {
  const accentGradients: Record<string, string> = {
    cyan: 'from-cyan-400 to-blue-500',
    purple: 'from-purple-400 to-pink-500',
    emerald: 'from-emerald-400 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    red: 'from-red-400 to-rose-500',
  };

  const gradient = accentGradients[accentColor] || accentGradients.cyan;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      className="mb-8"
    >
      {breadcrumb && (
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
          className="text-sm text-slate-400 mb-2 tracking-wide uppercase"
        >
          {breadcrumb}
        </motion.p>
      )}

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
        }}
        className="flex items-center gap-4"
      >
        {icon && (
          <span className="text-4xl">{icon}</span>
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-100">
            {title}
          </h1>
          <div className={`h-1 w-16 mt-2 rounded-full bg-gradient-to-r ${gradient}`} />
        </div>
      </motion.div>

      {subtitle && (
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
          }}
          className="mt-3 text-lg text-slate-400 max-w-3xl"
        >
          {subtitle}
        </motion.p>
      )}

      {children && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
          }}
          className="mt-4"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
