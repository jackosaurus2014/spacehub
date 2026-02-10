'use client';

import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import RFQForm from '@/components/marketplace/RFQForm';

export default function NewRFQPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Submit a Request for Quote"
          subtitle="Describe what you need and we'll match you with qualified providers"
        />
        <div className="mt-8">
          <RFQForm
            onSuccess={(rfq) => {
              router.push(`/marketplace/rfq/${rfq.id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
