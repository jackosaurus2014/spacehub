'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PodcastCategory = 'news' | 'technical' | 'business' | 'educational' | 'interview';
type PodcastFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface Podcast {
  id: number;
  name: string;
  hosts: string[];
  description: string;
  category: PodcastCategory;
  frequency: PodcastFrequency;
  platforms: { applePodcasts: boolean; spotify: boolean };
  episodeCount: number;
  rating: number;
  keyTopics: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PODCASTS: Podcast[] = [
  {
    id: 1,
    name: 'The Space Show',
    hosts: ['David Livingston'],
    description: 'Long-running interview show featuring conversations with space industry leaders, scientists, astronauts, and entrepreneurs. Known for deep, unedited discussions that explore topics most other shows skip.',
    category: 'interview',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 3200,
    rating: 4.5,
    keyTopics: ['Space Policy', 'Interviews', 'Space Entrepreneurs', 'Space Science', 'Commercial Space'],
    isActive: true,
  },
  {
    id: 2,
    name: 'Main Engine Cut Off',
    hosts: ['Anthony Colangelo'],
    description: 'In-depth analysis and commentary on the space industry, spaceflight policy, and the future of exploration. Known for nuanced takes that go beyond surface-level reporting.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 400,
    rating: 4.8,
    keyTopics: ['Space Policy', 'Launch Industry', 'Spaceflight Analysis', 'NASA', 'Commercial Crew'],
    isActive: true,
  },
  {
    id: 3,
    name: 'Off-Nominal',
    hosts: ['Jake Robins', 'Anthony Colangelo'],
    description: 'Casual yet insightful discussions about spaceflight news, upcoming launches, and community questions. A companion to Main Engine Cut Off with a more relaxed format.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 300,
    rating: 4.7,
    keyTopics: ['Spaceflight News', 'Launch Updates', 'Community Q&A', 'Space Discussion', 'Rocket Science'],
    isActive: true,
  },
  {
    id: 4,
    name: 'Payload Space',
    hosts: ['Mo Islam'],
    description: 'Business-focused podcast covering space industry investments, company analysis, and the commercial space economy. Essential listening for investors and executives.',
    category: 'business',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 250,
    rating: 4.6,
    keyTopics: ['Space Investing', 'Space Business', 'SPACs', 'Venture Capital', 'Company Analysis'],
    isActive: true,
  },
  {
    id: 5,
    name: 'Space Cafe Podcast',
    hosts: ['Torsten Kriening'],
    description: 'European perspective on the global space industry with interviews from industry leaders, policy makers, and innovators. Part of the SpaceWatch.Global media network.',
    category: 'interview',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 350,
    rating: 4.4,
    keyTopics: ['European Space', 'ESA', 'Space Policy', 'NewSpace Europe', 'Global Space Industry'],
    isActive: true,
  },
  {
    id: 6,
    name: 'The Orbital Index',
    hosts: ['Ben Lachman', 'Andrew Cantino'],
    description: 'Technical and analytical coverage of spaceflight, satellite technology, and space science. Originated as a curated weekly newsletter, expanded into podcast format.',
    category: 'technical',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 180,
    rating: 4.7,
    keyTopics: ['Orbital Mechanics', 'Satellite Tech', 'Space Science', 'Launch Analysis', 'Technical Deep Dives'],
    isActive: true,
  },
  {
    id: 7,
    name: 'T-Minus Space Daily',
    hosts: ['Maria Varmazis'],
    description: 'Daily briefing on the most important space industry news. Short-format episodes that keep professionals up to speed on launches, contracts, policy changes, and discoveries.',
    category: 'news',
    frequency: 'daily',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 800,
    rating: 4.5,
    keyTopics: ['Daily News', 'Launch Updates', 'Space Contracts', 'Satellite Industry', 'Space Policy'],
    isActive: true,
  },
  {
    id: 8,
    name: 'SpacePod',
    hosts: ['Fiona Finocchiaro'],
    description: 'Bite-sized episodes making space science and exploration accessible to everyone. Perfect for newcomers and enthusiasts who want quick, engaging space content.',
    category: 'educational',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 500,
    rating: 4.3,
    keyTopics: ['Space Science', 'Astronomy', 'Accessible Science', 'Space History', 'Exploration'],
    isActive: true,
  },
  {
    id: 9,
    name: 'AstroForge Podcast',
    hosts: ['AstroForge Team'],
    description: 'Behind-the-scenes look at the asteroid mining industry from one of the leading startups. Covers technical challenges, business strategy, and the future of space resources.',
    category: 'business',
    frequency: 'monthly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 40,
    rating: 4.2,
    keyTopics: ['Asteroid Mining', 'Space Resources', 'Startup Life', 'Deep Space', 'Space Technology'],
    isActive: true,
  },
  {
    id: 10,
    name: 'Planetary Radio',
    hosts: ['Sarah Al-Ahmed'],
    description: 'The Planetary Society\'s flagship podcast exploring the wonders of our solar system and beyond. Features interviews with top scientists, mission updates, and space advocacy.',
    category: 'educational',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 900,
    rating: 4.8,
    keyTopics: ['Planetary Science', 'Space Exploration', 'Astrobiology', 'Solar System', 'Space Advocacy'],
    isActive: true,
  },
  {
    id: 11,
    name: 'Houston We Have a Podcast',
    hosts: ['NASA Johnson Space Center'],
    description: 'Official NASA Johnson Space Center podcast featuring astronauts, engineers, and scientists discussing current ISS operations, Artemis, and human spaceflight.',
    category: 'educational',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 350,
    rating: 4.6,
    keyTopics: ['NASA', 'ISS', 'Artemis', 'Astronauts', 'Human Spaceflight'],
    isActive: true,
  },
  {
    id: 12,
    name: 'Space4Women Podcast',
    hosts: ['UNOOSA'],
    description: 'Highlighting women\'s contributions and careers in the space sector. Features interviews with female astronauts, engineers, scientists, and industry leaders from around the world.',
    category: 'interview',
    frequency: 'monthly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 60,
    rating: 4.3,
    keyTopics: ['Women in Space', 'Diversity', 'STEM Careers', 'United Nations', 'Space for All'],
    isActive: true,
  },
  {
    id: 13,
    name: 'Are We There Yet?',
    hosts: ['Grant Thompson'],
    description: 'Focused on Mars exploration and the long-term goal of making humanity a multi-planetary species. Covers both technical and philosophical aspects of the Mars journey.',
    category: 'educational',
    frequency: 'biweekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 120,
    rating: 4.4,
    keyTopics: ['Mars Exploration', 'Mars Colonization', 'SpaceX Starship', 'Terraforming', 'Multi-Planetary'],
    isActive: true,
  },
  {
    id: 14,
    name: 'Rocket Science',
    hosts: ['Oxford Physics'],
    description: 'Oxford University\'s deep dive into the science and engineering behind spaceflight. Rigorous academic content made accessible through excellent presentation.',
    category: 'technical',
    frequency: 'monthly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 80,
    rating: 4.5,
    keyTopics: ['Rocket Engineering', 'Propulsion', 'Astrophysics', 'Academic Research', 'Space Engineering'],
    isActive: true,
  },
  {
    id: 15,
    name: 'Space Business Podcast',
    hosts: ['Aravind Ravichandran'],
    description: 'Interviews with founders, investors, and executives shaping the commercial space industry. Deep dives into business models, funding rounds, and market strategy.',
    category: 'business',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 200,
    rating: 4.5,
    keyTopics: ['Space Startups', 'Business Models', 'Space Economy', 'Founders', 'Space Investment'],
    isActive: true,
  },
  {
    id: 16,
    name: 'The Space Economy',
    hosts: ['Justin Daashuur Hopkins', 'Isaiah Daashuur Hopkins'],
    description: 'Financial analysis of the space industry covering public markets, venture capital, SPACs, and the economic forces driving commercial space. Data-driven approach to space finance.',
    category: 'business',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 150,
    rating: 4.4,
    keyTopics: ['Space Finance', 'Public Markets', 'Venture Capital', 'Space SPACs', 'Economic Analysis'],
    isActive: true,
  },
  {
    id: 17,
    name: 'Eyes on the Earth',
    hosts: ['NASA JPL'],
    description: 'NASA Jet Propulsion Laboratory\'s podcast focused on Earth observation, climate science, and how satellite data helps us understand our changing planet.',
    category: 'educational',
    frequency: 'biweekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 90,
    rating: 4.3,
    keyTopics: ['Earth Science', 'Climate', 'Remote Sensing', 'NASA JPL', 'Satellite Data'],
    isActive: true,
  },
  {
    id: 18,
    name: 'StarTalk Radio',
    hosts: ['Neil deGrasse Tyson'],
    description: 'Popular science podcast blending astrophysics, pop culture, and comedy. The most widely listened-to space podcast, hosted by the renowned astrophysicist.',
    category: 'educational',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 1500,
    rating: 4.6,
    keyTopics: ['Astrophysics', 'Pop Science', 'Cosmology', 'Space Culture', 'Science Communication'],
    isActive: true,
  },
  {
    id: 19,
    name: 'Space to Ground',
    hosts: ['NASA ISS Program'],
    description: 'Weekly update from the International Space Station covering current experiments, crew activities, and station operations. Short-format with stunning visuals in video episodes.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 600,
    rating: 4.5,
    keyTopics: ['ISS Operations', 'Microgravity Research', 'Crew Updates', 'Space Station', 'NASA'],
    isActive: true,
  },
  {
    id: 20,
    name: 'The WeMartians Podcast',
    hosts: ['Jake Robins'],
    description: 'Deep dives into Mars exploration missions, both past and future. Covers rover operations, orbital missions, and the science that drives our fascination with the Red Planet.',
    category: 'educational',
    frequency: 'biweekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 200,
    rating: 4.6,
    keyTopics: ['Mars Rovers', 'Mars Science', 'Perseverance', 'Mars Missions', 'Planetary Exploration'],
    isActive: true,
  },
  {
    id: 21,
    name: 'Countdown',
    hosts: ['The Verge'],
    description: 'The Verge\'s space podcast covering launches, missions, and the personalities driving the new space age. Produced with high editorial standards and engaging storytelling.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: false },
    episodeCount: 100,
    rating: 4.3,
    keyTopics: ['Space News', 'Launch Coverage', 'SpaceX', 'NASA Artemis', 'Space Tech'],
    isActive: false,
  },
  {
    id: 22,
    name: 'Interplanetary Podcast',
    hosts: ['Andrew Sheridan', 'Matthew Russell'],
    description: 'UK-based podcast covering the British and European space scene alongside global space news. Brings a unique international perspective to spaceflight coverage.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 350,
    rating: 4.4,
    keyTopics: ['UK Space', 'European Space', 'Global News', 'Launch Industry', 'Space Science'],
    isActive: true,
  },
  {
    id: 23,
    name: 'Space Industry',
    hosts: ['Erik Karapetyan'],
    description: 'Interviews with space industry executives and thought leaders exploring business strategy, market trends, and the evolving commercial space landscape.',
    category: 'business',
    frequency: 'biweekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 130,
    rating: 4.3,
    keyTopics: ['Space Industry', 'Business Strategy', 'Market Trends', 'Executive Interviews', 'Commercial Space'],
    isActive: true,
  },
  {
    id: 24,
    name: 'This Week in Space',
    hosts: ['Rod Pyle', 'Tariq Malik'],
    description: 'TWiT network\'s weekly space news roundup. Two veteran space journalists discuss the week\'s biggest stories, launches, and developments in an accessible, entertaining format.',
    category: 'news',
    frequency: 'weekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 150,
    rating: 4.5,
    keyTopics: ['Weekly News', 'Launch Roundup', 'Space Missions', 'Space History', 'Industry Trends'],
    isActive: true,
  },
  {
    id: 25,
    name: 'Aerospace Engineering Podcast',
    hosts: ['Aerospace Engineering Team'],
    description: 'Technical deep dives into aerospace engineering topics including propulsion systems, spacecraft design, materials science, and orbital mechanics. Made for engineers and enthusiasts.',
    category: 'technical',
    frequency: 'biweekly',
    platforms: { applePodcasts: true, spotify: true },
    episodeCount: 110,
    rating: 4.2,
    keyTopics: ['Aerospace Engineering', 'Propulsion', 'Spacecraft Design', 'Materials Science', 'Orbital Mechanics'],
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<PodcastCategory, { label: string; color: string; bg: string; icon: string }> = {
  news: { label: 'News & Analysis', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', icon: 'N' },
  technical: { label: 'Technical', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', icon: 'T' },
  business: { label: 'Business & Finance', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: 'B' },
  educational: { label: 'Educational & Science', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: 'E' },
  interview: { label: 'Interview', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30', icon: 'I' },
};

const FREQUENCY_LABELS: Record<PodcastFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
};

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'rating-desc', label: 'Rating (High-Low)' },
  { value: 'rating-asc', label: 'Rating (Low-High)' },
  { value: 'episodes-desc', label: 'Episodes (Most)' },
  { value: 'episodes-asc', label: 'Episodes (Least)' },
];

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1.5 text-sm font-semibold text-amber-400">{rating.toFixed(1)}</span>
    

        <RelatedModules modules={PAGE_RELATIONS['podcasts']} />
      </div>
  );
}

// ---------------------------------------------------------------------------
// Podcast Card Component
// ---------------------------------------------------------------------------

function PodcastCard({ podcast, index }: { podcast: Podcast; index: number }) {
  const catConfig = CATEGORY_CONFIG[podcast.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="card p-5 h-full group relative overflow-hidden"
      >
        {/* Hover gradient border */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 animate-pulse" />
          <div className="absolute inset-[1px] rounded-xl bg-slate-900/95" />
        </div>

        <div className="relative z-10">
          {/* Header: Icon + Name + Status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 border ${catConfig.bg} ${catConfig.color}`}>
                {catConfig.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors text-sm leading-snug">
                  {podcast.name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {podcast.hosts.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {podcast.isActive ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="mb-3">
            <StarRating rating={podcast.rating} />
          </div>

          {/* Description */}
          <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
            {podcast.description}
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Episodes</div>
              <div className="text-sm font-semibold text-cyan-400">
                {podcast.episodeCount.toLocaleString()}+
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Frequency</div>
              <div className="text-sm font-semibold text-purple-400">
                {FREQUENCY_LABELS[podcast.frequency]}
              </div>
            </div>
          </div>

          {/* Category Badge */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${catConfig.bg} ${catConfig.color}`}>
              {catConfig.label}
            </span>
          </div>

          {/* Key Topics */}
          <div className="flex flex-wrap gap-1 mb-3">
            {podcast.keyTopics.slice(0, 4).map(topic => (
              <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                {topic}
              </span>
            ))}
            {podcast.keyTopics.length > 4 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-slate-600/30">
                +{podcast.keyTopics.length - 4}
              </span>
            )}
          </div>

          {/* Platform Availability */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">Available on:</span>
            <div className="flex items-center gap-2">
              {podcast.platforms.applePodcasts && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm0 14c-2.5 0-4-1.5-4-4 0-.5.5-1.5 1-2s1.5-1 1.5-1l.5 3h2l.5-3s1 .5 1.5 1 1 1.5 1 2c0 2.5-1.5 4-4 4z"/>
                  </svg>
                  Apple
                </span>
              )}
              {podcast.platforms.spotify && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.808-.87 7.076-.496 9.712 1.115a.622.622 0 01.207.857zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.453-1.494c3.632-1.102 8.147-.568 11.233 1.331a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.533-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.954 1.611z"/>
                  </svg>
                  Spotify
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function PodcastsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PodcastCategory | ''>('');
  const [sortBy, setSortBy] = useState('rating-desc');

  // Computed data
  const filteredPodcasts = useMemo(() => {
    let result = [...PODCASTS];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.hosts.some(h => h.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q) ||
        p.keyTopics.some(t => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Sort
    const [field, order] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      if (field === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (field === 'rating') {
        cmp = a.rating - b.rating;
      } else if (field === 'episodes') {
        cmp = a.episodeCount - b.episodeCount;
      }
      return order === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [search, categoryFilter, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalEpisodes = PODCASTS.reduce((sum, p) => sum + p.episodeCount, 0);
    const activePodcasts = PODCASTS.filter(p => p.isActive).length;
    const avgRating = PODCASTS.reduce((sum, p) => sum + p.rating, 0) / PODCASTS.length;
    const categories = new Set(PODCASTS.map(p => p.category)).size;
    return { totalEpisodes, activePodcasts, avgRating, categories };
  }, []);

  // Category counts for filter buttons
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PODCASTS.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="Space Industry Podcast Directory"
        subtitle="Discover the best podcasts covering launches, missions, space business, engineering, and exploration -- curated for space industry professionals and enthusiasts"
        breadcrumb="Resources"
        accentColor="purple"
      />

      {/* Stats Bar */}
      <ScrollReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total Podcasts"
            value={PODCASTS.length.toString()}
            icon="P"
            color="bg-purple-500/20"
          />
          <StatCard
            label="Active Shows"
            value={stats.activePodcasts.toString()}
            icon="A"
            color="bg-emerald-500/20"
          />
          <StatCard
            label="Total Episodes"
            value={stats.totalEpisodes.toLocaleString() + '+'}
            icon="E"
            color="bg-cyan-500/20"
          />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            icon="R"
            color="bg-amber-500/20"
          />
        </div>
      </ScrollReveal>

      {/* Filters & Search */}
      <ScrollReveal>
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                aria-label="Search podcasts by name, host, or topic"
                placeholder="Search podcasts by name, host, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 bg-slate-800 border border-slate-700 text-white rounded-lg py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filter */}
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as PodcastCategory | '')}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="">All Categories</option>
              {(Object.keys(CATEGORY_CONFIG) as PodcastCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              aria-label="Sort podcasts"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Category Quick-Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors border ${
                categoryFilter === ''
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
            >
              All ({PODCASTS.length})
            </button>
            {(Object.keys(CATEGORY_CONFIG) as PodcastCategory[]).map(cat => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors border ${
                    categoryFilter === cat
                      ? `${config.bg} ${config.color}`
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  {config.label} ({categoryCounts[cat] || 0})
                </button>
              );
            })}
          </div>

          {/* Results count */}
          <div className="mt-3 text-xs text-slate-500">
            {filteredPodcasts.length} podcast{filteredPodcasts.length !== 1 ? 's' : ''} found
            {search && ` for "${search}"`}
          </div>
        </div>
      </ScrollReveal>

      {/* Podcast Grid */}
      {filteredPodcasts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">P</div>
          <h3 className="text-xl font-semibold text-white mb-2">No podcasts found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); }}
            className="mt-4 px-6 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPodcasts.map((podcast, i) => (
              <PodcastCard key={podcast.id} podcast={podcast} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Info Section */}
      <ScrollReveal delay={0.2}>
        <div className="card p-6 mt-8">
          <h2 className="text-lg font-semibold text-white mb-3">About This Directory</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            This curated directory features the most notable podcasts covering the space industry,
            from daily news briefings to deep technical dives and business analysis. Episode counts
            are approximate and ratings are based on aggregated listener feedback across platforms.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-cyan-400 mb-1">For Professionals</h3>
              <p className="text-xs text-slate-400">
                Stay current with daily and weekly news shows like T-Minus Space Daily, Main Engine
                Cut Off, and This Week in Space.
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-1">For Investors</h3>
              <p className="text-xs text-slate-400">
                Track the space economy with business-focused shows like Payload Space, The Space
                Economy, and Space Business Podcast.
              </p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-1">For Enthusiasts</h3>
              <p className="text-xs text-slate-400">
                Explore the cosmos with educational shows like StarTalk Radio, Planetary Radio, and
                Houston We Have a Podcast.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
