'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import RFQForm from '@/components/marketplace/RFQForm';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export default function NewRFQPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Marketplace', href: '/marketplace' },
          { name: 'New RFQ' },
        ]} />
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-slate-300 transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">New RFQ</span>
        </nav>
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
