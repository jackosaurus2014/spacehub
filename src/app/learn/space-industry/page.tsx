'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const STORAGE_KEY = 'spacenexus-learning-path-progress';

interface LearningStep {
  id: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  gradient: string;
}

const LEARNING_STEPS: LearningStep[] = [
  {
    id: 1,
    title: 'What is the Space Industry?',
    description:
      'Start with the fundamentals. Understand how the $546B space economy is structured, who the major players are, and why the industry is growing faster than ever.',
    href: '/space-economy',
    cta: 'Start',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    id: 2,
    title: 'Top 50 Space Companies',
    description:
      'Meet the companies shaping the future of space -- from SpaceX and Rocket Lab to emerging startups across launch, satellites, defense, and Earth observation.',
    href: '/blog/top-50-space-companies-to-watch-2026',
    cta: 'Start',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    id: 3,
    title: 'How Rockets Work',
    description:
      'Explore launch vehicles, propulsion types, and how payloads get to orbit. Compare costs, capabilities, and reusability across providers.',
    href: '/launch-vehicles',
    cta: 'Start',
    gradient: 'from-orange-500 to-amber-400',
  },
  {
    id: 4,
    title: 'How Many Satellites Are in Space?',
    description:
      'Over 10,000 active satellites orbit Earth today. Learn about orbit types, mega-constellations, and how satellite numbers have tripled since 2019.',
    href: '/blog/how-many-satellites-in-space-2026',
    cta: 'Start',
    gradient: 'from-teal-500 to-emerald-400',
  },
  {
    id: 5,
    title: 'Space Economy Overview',
    description:
      'Dive into the data: market segments, growth projections, government budgets, and the commercial vs. government split driving the trillion-dollar opportunity.',
    href: '/space-stats',
    cta: 'Start',
    gradient: 'from-pink-500 to-rose-400',
  },
  {
    id: 6,
    title: 'Space Industry Careers Guide',
    description:
      'Thinking about working in space? Explore career paths, in-demand roles, salary benchmarks, and how to break into the fastest-growing sector in aerospace.',
    href: '/blog/space-industry-careers-guide-2026',
    cta: 'Start',
    gradient: 'from-indigo-500 to-blue-400',
  },
  {
    id: 7,
    title: 'Go Deeper: Acronyms & Glossary',
    description:
      'Master the language of the space industry. From TRL to ITAR, LEO to SSO -- decode the jargon with our comprehensive acronym database and glossary.',
    href: '/acronyms',
    cta: 'Start',
    gradient: 'from-slate-400 to-zinc-300',
  },
];

function getProgress(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveProgress(visited: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visited)));
  } catch {
    // localStorage not available
  }
}

export default function SpaceIndustryLearningPathPage() {
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setVisited(getProgress());
    setMounted(true);
  }, []);

  const markVisited = (stepId: number) => {
    const next = new Set(visited);
    next.add(stepId);
    setVisited(next);
    saveProgress(next);
  };

  const completedCount = visited.size;
  const totalSteps = LEARNING_STEPS.length;
  const progressPct = mounted ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-black pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-white/70 transition-colors">Learn</Link>
          <span>/</span>
          <span className="text-slate-400">Space Industry</span>
        </nav>

        {/* Header */}
        <ScrollReveal>
          <header className="mb-10 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              Learn About the Space Industry
            </h1>
            <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
              A structured learning path for newcomers to the space industry. Follow the steps below
              to build a solid foundation -- from the basics of the space economy to career
              opportunities and advanced reference material.
            </p>
          </header>
        </ScrollReveal>

        {/* Progress Bar */}
        <ScrollReveal>
          <div className="card p-5 mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Your Progress
              </h2>
              <span className="text-sm text-slate-400">
                {mounted ? `${completedCount} of ${totalSteps} steps` : `0 of ${totalSteps} steps`}
              </span>
            </div>
            <div className="h-3 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {mounted && completedCount === totalSteps && (
              <p className="text-emerald-400 text-sm mt-3 font-medium text-center">
                Congratulations! You have completed the entire learning path.
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Learning Steps */}
        <StaggerContainer className="space-y-5">
          {LEARNING_STEPS.map((step) => {
            const isVisited = mounted && visited.has(step.id);
            return (
              <StaggerItem key={step.id}>
                <div
                  className={`group relative bg-white/[0.03] border rounded-xl p-6 transition-all duration-300 hover:bg-white/[0.06] ${
                    isVisited
                      ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-5">
                    {/* Number Badge */}
                    <div
                      className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border transition-colors ${
                        isVisited
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : `bg-gradient-to-br ${step.gradient} text-white border-transparent`
                      }`}
                    >
                      {isVisited ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-white/90 transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-4">
                        {step.description}
                      </p>

                      <div className="flex items-center gap-4 flex-wrap">
                        <Link
                          href={step.href}
                          onClick={() => markVisited(step.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isVisited
                              ? 'bg-white/[0.08] text-slate-300 hover:bg-white/[0.12]'
                              : 'bg-white text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {isVisited ? 'Revisit' : step.cta}
                          <span className="text-xs">&rarr;</span>
                        </Link>
                        {step.id === 7 && (
                          <Link
                            href="/glossary"
                            onClick={() => markVisited(step.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all border border-white/[0.06]"
                          >
                            Glossary &rarr;
                          </Link>
                        )}
                        {isVisited && (
                          <span className="text-xs text-emerald-400 font-medium">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* CTA Section */}
        <ScrollReveal>
          <div className="mt-12 bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to explore deeper?
            </h2>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              The learning path is just the beginning. SpaceNexus has real-time satellite tracking,
              company profiles, market intelligence, and engineering tools -- all in one platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-block bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="/learn"
                className="inline-block bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-white/[0.1]"
              >
                Back to Learning Center
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['learn/space-industry'] || PAGE_RELATIONS['learn']} />
      </div>
    </div>
  );
}
