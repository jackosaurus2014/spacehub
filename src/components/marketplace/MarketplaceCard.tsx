'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCategoryIcon, getCategoryLabel, getSubcategoryLabel } from '@/lib/marketplace-types';
import PriceDisplay from './PriceDisplay';
import VerificationBadge from './VerificationBadge';

interface ServiceListing {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  pricingType: string;
  priceMin: number | null;
  priceMax: number | null;
  priceUnit: string | null;
  certifications: string[];
  status: string;
  viewCount: number;
  isEditorial?: boolean;
  company: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    verificationLevel: string | null;
    tier: number;
  };
}

interface MarketplaceCardProps {
  listing: ServiceListing;
  index?: number;
}

export default function MarketplaceCard({ listing, index = 0 }: MarketplaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
    >
      <Link href={`/marketplace/listings/${listing.slug}`}>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="card p-5 h-full group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30" />
            <div className="absolute inset-[1px] rounded-xl bg-slate-900/95" />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{getCategoryIcon(listing.category)}</span>
                <span>{getCategoryLabel(listing.category)}</span>
                {listing.subcategory && (
                  <>
                    <span className="text-slate-600">/</span>
                    <span>{getSubcategoryLabel(listing.category, listing.subcategory)}</span>
                  </>
                )}
                {listing.isEditorial && (
                  <span className="text-[9px] px-1 py-0.5 bg-purple-500/15 text-purple-400 rounded font-medium">Editorial</span>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1 line-clamp-1">
              {listing.name}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {listing.description || 'No description available.'}
            </p>

            {/* Provider */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                {listing.company.logoUrl ? (
                  <img src={listing.company.logoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                ) : (
                  listing.company.name.charAt(0)
                )}
              </div>
              <span className="text-xs text-slate-300 truncate">{listing.company.name}</span>
              <VerificationBadge level={listing.company.verificationLevel} />
            </div>

            {/* Price + Certs */}
            <div className="flex items-end justify-between">
              <PriceDisplay
                pricingType={listing.pricingType}
                priceMin={listing.priceMin}
                priceMax={listing.priceMax}
                priceUnit={listing.priceUnit}
              />
              {listing.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                  {listing.certifications.slice(0, 3).map((cert) => (
                    <span key={cert} className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                      {cert}
                    </span>
                  ))}
                  {listing.certifications.length > 3 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-500 rounded">
                      +{listing.certifications.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
