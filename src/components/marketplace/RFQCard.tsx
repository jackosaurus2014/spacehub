'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCategoryIcon, getCategoryLabel, formatPrice, RFQ_STATUSES } from '@/lib/marketplace-types';

interface RFQSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  subcategory: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string | null;
  status: string;
  isPublic: boolean;
  createdAt: string;
  _count?: { proposals: number };
}

interface RFQCardProps {
  rfq: RFQSummary;
  index?: number;
}

export default function RFQCard({ rfq, index = 0 }: RFQCardProps) {
  const statusInfo = RFQ_STATUSES[rfq.status as keyof typeof RFQ_STATUSES] || RFQ_STATUSES.open;
  const daysLeft = rfq.deadline
    ? Math.max(0, Math.ceil((new Date(rfq.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
    >
      <Link href={`/marketplace/rfq/${rfq.id}`}>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="card p-5 h-full group cursor-pointer"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{getCategoryIcon(rfq.category)}</span>
              <span>{getCategoryLabel(rfq.category)}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusInfo.bgColor}/20 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-2 line-clamp-2">
            {rfq.title}
          </h3>

          {/* Details Row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Budget</div>
              <div className="text-xs font-semibold text-emerald-400">
                {formatPrice(rfq.budgetMin, rfq.budgetMax)}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Deadline</div>
              <div className={`text-xs font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-orange-400' : 'text-slate-300'}`}>
                {daysLeft !== null ? `${daysLeft}d left` : 'Open'}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Proposals</div>
              <div className="text-xs font-semibold text-cyan-400">
                {rfq._count?.proposals ?? 0}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-[10px] text-slate-500">
            Posted {new Date(rfq.createdAt).toLocaleDateString()}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
