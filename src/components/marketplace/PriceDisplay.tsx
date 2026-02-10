'use client';

import { formatPrice, PRICING_TYPES } from '@/lib/marketplace-types';

interface PriceDisplayProps {
  pricingType: string;
  priceMin?: number | null;
  priceMax?: number | null;
  priceUnit?: string | null;
}

export default function PriceDisplay({ pricingType, priceMin, priceMax, priceUnit }: PriceDisplayProps) {
  const typeInfo = PRICING_TYPES.find((t) => t.value === pricingType);

  if (pricingType === 'rfq_only') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-sm italic">Request Quote</span>
      </div>
    );
  }

  return (
    <div>
      <div className="text-cyan-400 font-semibold">
        {formatPrice(priceMin, priceMax, priceUnit)}
      </div>
      {typeInfo && (
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
          {typeInfo.label}
        </div>
      )}
    </div>
  );
}
