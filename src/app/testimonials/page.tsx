import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Testimonials',
  description: 'See what space industry professionals say about SpaceNexus. Reviews from analysts, investors, engineers, and executives.',
  alternates: { canonical: 'https://spacenexus.us/testimonials' },
};

export const revalidate = 86400;

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  rating: number;
  category: 'investor' | 'analyst' | 'engineer' | 'executive' | 'founder';
}

const testimonials: Testimonial[] = [
  {
    quote: 'SpaceNexus is the Bloomberg Terminal the space industry has been waiting for. I check it every morning before my first meeting.',
    name: 'Sarah K.',
    role: 'Space Investment Analyst',
    company: 'Venture Capital Firm',
    rating: 5,
    category: 'investor',
  },
  {
    quote: 'The engineering calculators alone are worth it. Link budget, thermal, radiation — tools that used to require expensive desktop software, now free in the browser.',
    name: 'Dr. Michael R.',
    role: 'Satellite Systems Engineer',
    company: 'Aerospace Company',
    rating: 5,
    category: 'engineer',
  },
  {
    quote: 'I used to spend hours aggregating data from NASA, NOAA, and news RSS feeds. SpaceNexus consolidates everything into one dashboard with automatic updates.',
    name: 'James T.',
    role: 'Space Policy Analyst',
    company: 'Think Tank',
    rating: 5,
    category: 'analyst',
  },
  {
    quote: 'The market intelligence module tracks funding rounds I would have missed entirely. Found two investment opportunities through SpaceNexus deal flow.',
    name: 'Patricia L.',
    role: 'Managing Director',
    company: 'Space-focused PE Fund',
    rating: 5,
    category: 'investor',
  },
  {
    quote: 'As a startup founder, the procurement module and SBIR tracker have been invaluable. We won a Phase II contract after discovering an opportunity on SpaceNexus.',
    name: 'David C.',
    role: 'CEO & Co-Founder',
    company: 'Space Technology Startup',
    rating: 5,
    category: 'founder',
  },
  {
    quote: 'The blog content is genuinely useful — not filler. The articles on ITAR compliance and satellite licensing saved me hours of research.',
    name: 'Rachel M.',
    role: 'Regulatory Affairs Manager',
    company: 'Satellite Operator',
    rating: 4,
    category: 'analyst',
  },
  {
    quote: 'Our BD team uses SpaceNexus to research companies before every meeting. The company profiles with SpaceNexus Score give us a quick read on potential partners.',
    name: 'Tom H.',
    role: 'VP Business Development',
    company: 'Defense Contractor',
    rating: 5,
    category: 'executive',
  },
  {
    quote: 'The space weather integration is excellent. We get NOAA data alongside launch schedules and satellite tracking — all in one place instead of 5 different websites.',
    name: 'Ana S.',
    role: 'Mission Operations Engineer',
    company: 'LEO Constellation Operator',
    rating: 5,
    category: 'engineer',
  },
  {
    quote: 'Having the Android app means I can check launch status and market updates on the go. Push notifications for upcoming launches are a game-changer.',
    name: 'Kevin W.',
    role: 'Space Industry Reporter',
    company: 'Trade Publication',
    rating: 4,
    category: 'analyst',
  },
];

const categoryLabels: Record<string, string> = {
  investor: 'Investor',
  analyst: 'Analyst',
  engineer: 'Engineer',
  executive: 'Executive',
  founder: 'Founder',
};

const categoryColors: Record<string, string> = {
  investor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  analyst: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  engineer: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  executive: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  founder: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Testimonials"
          subtitle="What space industry professionals say about SpaceNexus"
          icon="💬"
          accentColor="cyan"
        >
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Start Free
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Stats Bar */}
          <ScrollReveal>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">4.8/5</p>
                <p className="text-slate-500 text-xs">Average Rating</p>
              </div>
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">260+</p>
                <p className="text-slate-500 text-xs">Pages & Tools</p>
              </div>
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">Free</p>
                <p className="text-slate-500 text-xs">To Get Started</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i}>
                <div className="card p-5 h-full flex flex-col">
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <svg key={s} className={`w-4 h-4 ${s < t.rating ? 'text-yellow-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-slate-300 text-sm leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  {/* Attribution */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                    <div>
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <p className="text-slate-500 text-xs">{t.role}, {t.company}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryColors[t.category]}`}>
                      {categoryLabels[t.category]}
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* CTA */}
          <ScrollReveal>
            <div className="card p-8 text-center border border-cyan-500/20">
              <h3 className="text-xl font-bold text-white mb-2">Join Thousands of Space Professionals</h3>
              <p className="text-slate-400 text-sm mb-5 max-w-md mx-auto">
                Start free. No credit card required. Access 260+ pages of space intelligence, 170+ articles, and 50+ data sources.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                  Create Free Account
                </Link>
                <Link href="/app" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Or get the Android app
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
