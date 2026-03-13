'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'All' | 'Launch' | 'Business' | 'Policy' | 'Science' | 'Defense';
type Source = 'SpaceNews' | 'Ars Technica' | 'The Verge' | 'NASA' | 'ESA' | 'SpaceX';
type SortOption = 'newest' | 'oldest' | 'trending';

interface Article {
  id: string;
  title: string;
  summary: string;
  source: Source;
  category: Exclude<Category, 'All'>;
  publishedAt: string;
  url: string;
  imageAlt: string;
  trending?: boolean;
}

// ---------------------------------------------------------------------------
// Source colour mapping
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<Source, { bg: string; text: string; border: string }> = {
  SpaceNews: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  'Ars Technica': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  'The Verge': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  NASA: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  ESA: { bg: 'bg-white/10', text: 'text-slate-300', border: 'border-white/15/40' },
  SpaceX: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/40' },
};

const CATEGORY_COLORS: Record<Exclude<Category, 'All'>, string> = {
  Launch: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Business: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Policy: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  Science: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  Defense: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

const CATEGORIES: Category[] = ['All', 'Launch', 'Business', 'Policy', 'Science', 'Defense'];
const SOURCES: Source[] = ['SpaceNews', 'Ars Technica', 'The Verge', 'NASA', 'ESA', 'SpaceX'];

// ---------------------------------------------------------------------------
// Sample articles (30+)
// ---------------------------------------------------------------------------

const SAMPLE_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'SpaceX Starship Flight 10 Static Fire Completed at Boca Chica',
    summary: 'SpaceX has completed a full-duration static fire of the Super Heavy booster and Ship 35 ahead of the highly anticipated Flight 10 test, which aims to demonstrate full reusability with a booster catch and ship landing.',
    source: 'SpaceNews',
    category: 'Launch',
    publishedAt: '2026-02-27T08:30:00Z',
    url: '#',
    imageAlt: 'SpaceX Starship on launch pad at Boca Chica',
    trending: true,
  },
  {
    id: '2',
    title: 'NASA Announces Final Artemis III Crew Selection Shortlist',
    summary: 'NASA has narrowed the Artemis III crew candidates to six astronauts who will undergo final evaluations before the historic lunar surface mission, expected to launch in late 2027.',
    source: 'NASA',
    category: 'Science',
    publishedAt: '2026-02-27T06:15:00Z',
    url: '#',
    imageAlt: 'NASA Artemis III astronaut candidates in training',
    trending: true,
  },
  {
    id: '3',
    title: 'Blue Origin New Glenn Completes Third Orbital Mission Successfully',
    summary: 'Blue Origin\'s New Glenn rocket has delivered a batch of Project Kuiper satellites to orbit in its third flight, demonstrating consistent reliability and advancing the reusable first stage program.',
    source: 'Ars Technica',
    category: 'Launch',
    publishedAt: '2026-02-26T22:00:00Z',
    url: '#',
    imageAlt: 'Blue Origin New Glenn lifting off from LC-36',
    trending: true,
  },
  {
    id: '4',
    title: 'OneWeb and Starlink Announce Spectrum Sharing Agreement',
    summary: 'In a landmark deal, OneWeb (Eutelsat) and SpaceX Starlink have agreed to coordinate Ku-band spectrum usage, reducing interference for millions of broadband users across underserved regions.',
    source: 'SpaceNews',
    category: 'Business',
    publishedAt: '2026-02-26T18:45:00Z',
    url: '#',
    imageAlt: 'Satellite constellation diagram showing orbit coordination',
  },
  {
    id: '5',
    title: 'Space Force FY2027 Budget Request Tops $35 Billion',
    summary: 'The U.S. Space Force has submitted its largest-ever budget request at $35.2 billion, prioritizing space domain awareness, resilient satellite architectures, and proliferated LEO constellations for missile warning.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-26T16:30:00Z',
    url: '#',
    imageAlt: 'United States Space Force headquarters building',
    trending: true,
  },
  {
    id: '6',
    title: 'ESA Greenlights Mars Sample Return Mission Redesign',
    summary: 'The European Space Agency has formally approved a redesigned architecture for the Mars Sample Return mission, incorporating a lighter ascent vehicle and partnerships with Japanese and Canadian agencies.',
    source: 'ESA',
    category: 'Science',
    publishedAt: '2026-02-26T14:00:00Z',
    url: '#',
    imageAlt: 'ESA Mars Sample Return mission concept artwork',
  },
  {
    id: '7',
    title: 'India\'s Space Economy Projected to Reach $44 Billion by 2033',
    summary: 'A new report from the Indian Space Research Organisation forecasts rapid growth in India\'s commercial space sector, driven by launch service exports, satellite manufacturing, and downstream analytics.',
    source: 'SpaceNews',
    category: 'Business',
    publishedAt: '2026-02-26T11:20:00Z',
    url: '#',
    imageAlt: 'ISRO rocket on launch pad at Sriharikota',
  },
  {
    id: '8',
    title: 'Rocket Lab Neutron First Stage Assembly Begins in Virginia',
    summary: 'Rocket Lab has started assembling the first flight-ready Neutron medium-lift rocket at its Wallops Island facility, with a maiden launch targeted for Q4 2026.',
    source: 'Ars Technica',
    category: 'Launch',
    publishedAt: '2026-02-26T09:00:00Z',
    url: '#',
    imageAlt: 'Rocket Lab Neutron rocket assembly at Wallops Island',
  },
  {
    id: '9',
    title: 'Sierra Space Dream Chaser Completes Second ISS Resupply Mission',
    summary: 'Sierra Space\'s Dream Chaser spaceplane has returned from its second successful cargo delivery to the International Space Station, landing autonomously at Kennedy Space Center\'s shuttle runway.',
    source: 'The Verge',
    category: 'Launch',
    publishedAt: '2026-02-25T21:30:00Z',
    url: '#',
    imageAlt: 'Dream Chaser spaceplane approaching the ISS',
  },
  {
    id: '10',
    title: 'Axiom Space Unveils Module 2 Design for Commercial Station',
    summary: 'Axiom Space has revealed the detailed design of its second station module, featuring an expanded airlock and enhanced research capabilities for pharmaceutical and semiconductor experiments in microgravity.',
    source: 'SpaceNews',
    category: 'Business',
    publishedAt: '2026-02-25T17:15:00Z',
    url: '#',
    imageAlt: 'Axiom Station Module 2 design rendering',
  },
  {
    id: '11',
    title: 'Pentagon Awards $2.1B Contract for Next-Gen Missile Tracking Satellites',
    summary: 'The Space Development Agency has awarded a $2.1 billion contract to L3Harris and Northrop Grumman for the Tracking Layer Tranche 3, expanding the constellation to 100+ satellites in LEO.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-25T14:45:00Z',
    url: '#',
    imageAlt: 'Missile tracking satellite constellation in low Earth orbit',
  },
  {
    id: '12',
    title: 'James Webb Space Telescope Discovers New Exoplanet with Potential Atmosphere',
    summary: 'JWST observations have identified a super-Earth in the habitable zone of a nearby M-dwarf star with spectral signatures consistent with a water-rich atmosphere, marking a milestone in exoplanet characterization.',
    source: 'NASA',
    category: 'Science',
    publishedAt: '2026-02-25T12:00:00Z',
    url: '#',
    imageAlt: 'JWST spectrum analysis of newly discovered exoplanet',
    trending: true,
  },
  {
    id: '13',
    title: 'FCC Proposes New Rules for Satellite Deorbit Timelines',
    summary: 'The Federal Communications Commission is proposing to shorten the post-mission orbital lifetime rule from 25 years to 5 years for all new satellite constellations, with comments due by April 2026.',
    source: 'The Verge',
    category: 'Policy',
    publishedAt: '2026-02-25T09:30:00Z',
    url: '#',
    imageAlt: 'Satellite deorbiting over Earth illustration',
  },
  {
    id: '14',
    title: 'SpaceX Launches Record 62 Starlink V2 Mini Satellites on Single Falcon 9',
    summary: 'A Falcon 9 rocket lifted off from Cape Canaveral carrying 62 Starlink V2 Mini satellites, setting a new single-mission mass-to-orbit record for the workhorse vehicle.',
    source: 'SpaceX',
    category: 'Launch',
    publishedAt: '2026-02-24T23:00:00Z',
    url: '#',
    imageAlt: 'Falcon 9 liftoff with Starlink V2 Mini payload',
  },
  {
    id: '15',
    title: 'European Parliament Approves EU Space Law Framework',
    summary: 'The European Parliament has passed a comprehensive space law framework governing debris mitigation, launch licensing, and liability provisions for all EU member state space activities.',
    source: 'ESA',
    category: 'Policy',
    publishedAt: '2026-02-24T20:15:00Z',
    url: '#',
    imageAlt: 'European Parliament vote on space legislation',
  },
  {
    id: '16',
    title: 'Relativity Space Terran R Maiden Flight Set for May 2026',
    summary: 'Relativity Space has confirmed a May 2026 target for the first launch of its medium-lift Terran R rocket from Cape Canaveral, featuring an entirely 3D-printed upper stage.',
    source: 'Ars Technica',
    category: 'Launch',
    publishedAt: '2026-02-24T17:00:00Z',
    url: '#',
    imageAlt: 'Relativity Space Terran R rocket on launch pad',
  },
  {
    id: '17',
    title: 'Japan\'s ispace Achieves Historic Lunar Landing on Second Attempt',
    summary: 'Japanese lunar startup ispace has successfully soft-landed its HAKUTO-R Mission 2 lander on the Moon, deploying a micro-rover to explore a region near the Lacus Mortis crater.',
    source: 'SpaceNews',
    category: 'Science',
    publishedAt: '2026-02-24T14:30:00Z',
    url: '#',
    imageAlt: 'ispace HAKUTO-R lander on the lunar surface',
  },
  {
    id: '18',
    title: 'Amazon Kuiper Begins Beta Broadband Service in Rural US Markets',
    summary: 'Amazon\'s Project Kuiper has launched a beta broadband service in select rural US counties, offering speeds up to 400 Mbps with a compact user terminal priced at $199.',
    source: 'The Verge',
    category: 'Business',
    publishedAt: '2026-02-24T11:00:00Z',
    url: '#',
    imageAlt: 'Amazon Project Kuiper user terminal on a rooftop',
  },
  {
    id: '19',
    title: 'US Space Command Establishes New Space Operations Center in Colorado',
    summary: 'US Space Command has opened a modernized Combined Space Operations Center at Peterson Space Force Base, integrating allied nation feeds for enhanced space domain awareness.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-24T08:45:00Z',
    url: '#',
    imageAlt: 'Combined Space Operations Center interior at Peterson SFB',
  },
  {
    id: '20',
    title: 'NASA Selects Three Companies for Lunar Surface Power Systems',
    summary: 'NASA has awarded contracts to Intuitive Machines, Astrobotic, and Lockheed Martin to develop fission-powered systems capable of providing 40 kW of continuous energy for Artemis base camp operations.',
    source: 'NASA',
    category: 'Science',
    publishedAt: '2026-02-23T19:00:00Z',
    url: '#',
    imageAlt: 'Lunar fission power system concept on the Moon',
  },
  {
    id: '21',
    title: 'Firefly Aerospace Awarded $1.8B for Alpha Block 2 National Security Launches',
    summary: 'Firefly Aerospace has secured a $1.8 billion NSSL Phase 3 Lane 1 contract to fly responsive small-class missions through 2030, marking a major win for the growing launch provider.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-23T16:30:00Z',
    url: '#',
    imageAlt: 'Firefly Alpha rocket launching from Vandenberg SFB',
  },
  {
    id: '22',
    title: 'Starlink Direct-to-Cell Service Expands to 12 Countries',
    summary: 'SpaceX\'s Starlink Direct-to-Cell service, which provides basic messaging and emergency SOS via unmodified smartphones, has expanded to 12 countries following regulatory approvals in Europe and Asia.',
    source: 'SpaceX',
    category: 'Business',
    publishedAt: '2026-02-23T13:00:00Z',
    url: '#',
    imageAlt: 'Starlink Direct-to-Cell satellite beaming signal to smartphone',
  },
  {
    id: '23',
    title: 'UN COPUOS Reaches Agreement on Space Resource Extraction Principles',
    summary: 'After years of negotiation, the UN Committee on the Peaceful Uses of Outer Space has adopted a set of non-binding principles for lunar and asteroid resource extraction, backed by 87 nations.',
    source: 'SpaceNews',
    category: 'Policy',
    publishedAt: '2026-02-23T10:00:00Z',
    url: '#',
    imageAlt: 'UN COPUOS meeting on space resource governance',
  },
  {
    id: '24',
    title: 'Virgin Orbit Successor Launcher One Announces Return-to-Flight Date',
    summary: 'Launcher One, the reconstituted air-launch venture from the former Virgin Orbit assets, has set a March 2026 return-to-flight from Mojave with a UK Ministry of Defence payload.',
    source: 'Ars Technica',
    category: 'Launch',
    publishedAt: '2026-02-23T07:30:00Z',
    url: '#',
    imageAlt: 'Launcher One attached to carrier aircraft in Mojave',
  },
  {
    id: '25',
    title: 'ESA Hera Mission Returns First Close-Up Images of Dimorphos Impact Crater',
    summary: 'ESA\'s Hera spacecraft has transmitted its first high-resolution images of the DART impact site on Dimorphos, revealing a 50-meter crater and significant resurfacing of the asteroid moonlet.',
    source: 'ESA',
    category: 'Science',
    publishedAt: '2026-02-22T20:00:00Z',
    url: '#',
    imageAlt: 'Hera spacecraft images of Dimorphos DART impact crater',
  },
  {
    id: '26',
    title: 'Space Force Reveals Plans for Tactically Responsive Launch Capability',
    summary: 'The U.S. Space Force has outlined a new Tactically Responsive Space initiative that would enable a satellite-to-orbit capability within 24 hours of a national security directive.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-22T17:30:00Z',
    url: '#',
    imageAlt: 'Rapid-response satellite launch vehicle on mobile pad',
  },
  {
    id: '27',
    title: 'Varda Space Industries Ships First Space-Manufactured Drug Capsules',
    summary: 'Varda Space Industries has delivered its first batch of ritonavir crystals grown in microgravity, with the FDA-reviewed pharmaceuticals now entering clinical trial pipelines.',
    source: 'The Verge',
    category: 'Business',
    publishedAt: '2026-02-22T14:00:00Z',
    url: '#',
    imageAlt: 'Varda Space capsule re-entry with manufactured pharmaceuticals',
  },
  {
    id: '28',
    title: 'China Completes Tiangong Station Expansion with Fourth Module',
    summary: 'China\'s Tiangong space station has docked its fourth module, Xuntian, expanding the station\'s research capacity and adding a co-orbiting space telescope comparable in aperture to Hubble.',
    source: 'SpaceNews',
    category: 'Science',
    publishedAt: '2026-02-22T10:15:00Z',
    url: '#',
    imageAlt: 'Tiangong space station with new Xuntian module',
  },
  {
    id: '29',
    title: 'Australia Passes National Space Activities Act Overhaul',
    summary: 'Australia has passed sweeping reforms to its space legislation, streamlining launch licensing, introducing a sovereign space insurance mandate, and creating a $500M space industry development fund.',
    source: 'SpaceNews',
    category: 'Policy',
    publishedAt: '2026-02-21T18:00:00Z',
    url: '#',
    imageAlt: 'Australian Parliament House with southern sky backdrop',
  },
  {
    id: '30',
    title: 'SpaceX Dragon Completes 50th ISS Resupply Mission',
    summary: 'SpaceX\'s Cargo Dragon capsule has completed its milestone 50th resupply mission to the ISS, delivering 6,000 pounds of science experiments, crew supplies, and station hardware.',
    source: 'SpaceX',
    category: 'Launch',
    publishedAt: '2026-02-21T14:30:00Z',
    url: '#',
    imageAlt: 'Cargo Dragon approaching ISS for 50th resupply mission',
  },
  {
    id: '31',
    title: 'Northrop Grumman Wins $3.2B for Next-Gen OPIR Missile Warning Satellites',
    summary: 'Northrop Grumman has been selected to build the next batch of Next-Gen OPIR geosynchronous missile warning satellites, extending the constellation to provide persistent global surveillance.',
    source: 'SpaceNews',
    category: 'Defense',
    publishedAt: '2026-02-21T11:00:00Z',
    url: '#',
    imageAlt: 'Next-Gen OPIR satellite in geosynchronous orbit rendering',
  },
  {
    id: '32',
    title: 'NASA Ingenuity Successor Dragonfly Passes Final Design Review',
    summary: 'NASA\'s Dragonfly rotorcraft lander, destined for Saturn\'s moon Titan, has passed its critical design review with a 2028 launch window, carrying instruments to search for prebiotic chemistry.',
    source: 'NASA',
    category: 'Science',
    publishedAt: '2026-02-21T08:30:00Z',
    url: '#',
    imageAlt: 'NASA Dragonfly rotorcraft concept flying over Titan surface',
  },
  {
    id: '33',
    title: 'Arianespace Returns Ariane 6 to Flight After Anomaly Investigation',
    summary: 'Arianespace has cleared Ariane 6 for its next mission following a thorough investigation into a second-stage anomaly, with a Galileo navigation satellite payload scheduled for March.',
    source: 'ESA',
    category: 'Launch',
    publishedAt: '2026-02-20T19:00:00Z',
    url: '#',
    imageAlt: 'Ariane 6 rocket on launch pad at Kourou',
  },
  {
    id: '34',
    title: 'Bipartisan Bill Proposes $2B Tax Credit for Commercial Space Stations',
    summary: 'A bipartisan group of US senators has introduced legislation offering $2 billion in tax credits over 10 years to companies developing commercial low-Earth orbit destinations to replace the ISS.',
    source: 'The Verge',
    category: 'Policy',
    publishedAt: '2026-02-20T15:30:00Z',
    url: '#',
    imageAlt: 'US Capitol building with orbital station concept overlay',
  },
  {
    id: '35',
    title: 'Impulse Space Successfully Tests Mars Transfer Vehicle Engine',
    summary: 'Impulse Space has completed a full-duration test of its high-thrust propulsion system designed for the Mira Mars transfer vehicle, targeting a technology demonstration mission in 2028.',
    source: 'Ars Technica',
    category: 'Science',
    publishedAt: '2026-02-20T12:00:00Z',
    url: '#',
    imageAlt: 'Impulse Space Mira engine test firing at test stand',
  },
  {
    id: '36',
    title: 'SpaceX Falcon Heavy Launches Classified NROL-174 Mission',
    summary: 'A SpaceX Falcon Heavy has launched the classified NROL-174 mission for the National Reconnaissance Office from Kennedy Space Center, with all three boosters recovered successfully.',
    source: 'SpaceX',
    category: 'Defense',
    publishedAt: '2026-02-20T04:00:00Z',
    url: '#',
    imageAlt: 'Falcon Heavy triple booster liftoff at night from KSC',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsAggregatorPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [selectedSources, setSelectedSources] = useState<Set<Source>>(new Set(SOURCES));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [visibleCount, setVisibleCount] = useState(12);
  const [showSourceFilters, setShowSourceFilters] = useState(false);

  // Toggle a source in the filter set
  const toggleSource = useCallback((source: Source) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        // Prevent deselecting all
        if (next.size > 1) next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }, []);

  // Filtered + sorted articles
  const filteredArticles = useMemo(() => {
    const result = SAMPLE_ARTICLES.filter((a) => {
      if (activeCategory !== 'All' && a.category !== activeCategory) return false;
      if (!selectedSources.has(a.source)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.summary.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });

    // Sort
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    } else {
      // Trending: trending articles first, then by date
      result.sort((a, b) => {
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    }

    return result;
  }, [activeCategory, selectedSources, searchQuery, sortOption]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  // Stats
  const uniqueSources = new Set(SAMPLE_ARTICLES.map((a) => a.source)).size;
  const last24h = SAMPLE_ARTICLES.filter((a) => {
    const diff = Date.now() - new Date(a.publishedAt).getTime();
    return diff < 86400000;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <AnimatedPageHeader
            title="Space Industry News Aggregator"
            subtitle="Real-time news from 50+ sources across the global space industry. Filter, search, and stay ahead."
            icon={
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                />
              </svg>
            }
            accentColor="cyan"
          />
          <ShareButton
            title="Space Industry News Aggregator - SpaceNexus"
            url="https://spacenexus.us/news-aggregator"
            description="Real-time space industry news from 50+ sources. Filter, search, and stay ahead."
            className="mt-2 flex-shrink-0"
          />
        </div>

        {/* Stats bar */}
        <ScrollReveal>
          <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">
                  <span className="text-white font-semibold">{last24h}</span> articles from{' '}
                  <span className="text-white font-semibold">{uniqueSources}</span> sources in the last 24 hours
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>{SAMPLE_ARTICLES.length} total articles</span>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </ScrollReveal>

        {/* Category tabs */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const count =
                cat === 'All'
                  ? filteredArticles.length
                  : SAMPLE_ARTICLES.filter(
                      (a) => a.category === cat && selectedSources.has(a.source)
                    ).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setVisibleCount(12);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-white shadow-lg shadow-black/20/25'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {cat}
                  <span
                    className={`ml-2 text-xs ${
                      isActive ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Search + Sort + Source filter row */}
        <ScrollReveal delay={0.15}>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(12);
                }}
                placeholder="Search articles by title or summary..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/30/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setVisibleCount(12);
                  }}
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/30/30 transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19.5 8.25l-7.5 7.5-7.5-7.5\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
                paddingRight: '2.5rem',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="trending">Trending</option>
            </select>

            {/* Source filter toggle */}
            <button
              onClick={() => setShowSourceFilters(!showSourceFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                showSourceFilters
                  ? 'bg-white/20 text-slate-300 border border-white/15/40'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                />
              </svg>
              Sources
              {selectedSources.size < SOURCES.length && (
                <span className="bg-white text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedSources.size}
                </span>
              )}
            </button>
          </div>
        </ScrollReveal>

        {/* Source filter checkboxes */}
        <AnimatePresence>
          {showSourceFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-2">
                    Filter by source:
                  </span>
                  {SOURCES.map((source) => {
                    const isSelected = selectedSources.has(source);
                    const colors = SOURCE_COLORS[source];
                    return (
                      <label
                        key={source}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 border text-sm focus-within:ring-2 focus-within:ring-white/10/50 ${
                          isSelected
                            ? `${colors.bg} ${colors.text} ${colors.border}`
                            : 'bg-slate-800/40 text-slate-500 border-slate-700/30 hover:border-slate-600/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSource(source)}
                          className="sr-only"
                        />
                        <div
                          className={`w-3 h-3 rounded-sm border transition-colors ${
                            isSelected
                              ? `${colors.border} ${colors.bg}`
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </div>
                        {source}
                      </label>
                    );
                  })}
                  <button
                    onClick={() => setSelectedSources(new Set(SOURCES))}
                    className="text-xs text-slate-500 hover:text-white transition-colors ml-auto"
                  >
                    Select All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        {(searchQuery || activeCategory !== 'All' || selectedSources.size < SOURCES.length) && (
          <div className="text-sm text-slate-400 mb-4">
            Showing{' '}
            <span className="text-white font-medium">
              {Math.min(visibleCount, filteredArticles.length)}
            </span>{' '}
            of <span className="text-white font-medium">{filteredArticles.length}</span> results
            {searchQuery && (
              <span>
                {' '}
                for &quot;<span className="text-slate-300">{searchQuery}</span>&quot;
              </span>
            )}
          </div>
        )}

        {/* Article grid */}
        {filteredArticles.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">
              <svg className="w-12 h-12 mx-auto text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No articles found</h3>
            <p className="text-sm text-slate-400 mb-4">
              Try adjusting your filters or search query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
                setSelectedSources(new Set(SOURCES));
                setVisibleCount(12);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleArticles.map((article) => (
              <StaggerItem key={article.id}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card block p-5 h-full group hover:scale-[1.01] transition-transform duration-200"
                >
                  {/* Source badge + time */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        SOURCE_COLORS[article.source].bg
                      } ${SOURCE_COLORS[article.source].text} ${
                        SOURCE_COLORS[article.source].border
                      }`}
                    >
                      {article.source}
                    </span>
                    <span className="text-xs text-slate-500">
                      {timeAgo(article.publishedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-white transition-colors">
                    {article.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Bottom row: category tag + trending */}
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        CATEGORY_COLORS[article.category]
                      }`}
                    >
                      {article.category}
                    </span>
                    {article.trending && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 5.86 13.95 4c-1.73.46-2.96 1.56-3.78 3.04-.86 1.57-1.07 3.21-.49 4.94.04.12.08.24.08.38 0 .27-.2.5-.47.55-.27.05-.52-.1-.61-.35-.08-.2-.11-.43-.11-.65 0-.06.02-.11.02-.17-1.07 1.2-1.58 2.7-1.48 4.35.12 1.88 1.1 3.4 2.6 4.46 1.69 1.2 3.56 1.45 5.5.87 2.11-.64 3.48-2.05 4.14-4.14.79-2.49.19-4.69-1.59-6.63l-.24-.27zM14.5 17.5c-.51.46-1.2.69-1.92.63-1.42-.12-2.38-1.08-2.58-2.39-.06-.37.07-.78.2-1.14.19-.49.47-.95.77-1.4l.12-.17c.65 1.08 1.6 1.74 2.8 2 .34.08.69.12 1.03.12-.35.77-.88 1.51-1.52 1.97.04.02.08.05.1.08.34.32.38.86.06 1.22l-.06.08z" />
                        </svg>
                        Trending
                      </span>
                    )}
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Load More */}
        {hasMore && (
          <ScrollReveal>
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-8 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
                Load More Articles
                <span className="text-slate-500 text-xs">
                  ({filteredArticles.length - visibleCount} remaining)
                </span>
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* End of list indicator */}
        {!hasMore && filteredArticles.length > 0 && visibleCount >= filteredArticles.length && (
          <div className="text-center text-sm text-slate-500 mt-10 pb-4">
            You&apos;ve reached the end of the feed.
          </div>
        )}

        <RelatedModules modules={PAGE_RELATIONS['news-aggregator']} />
      </div>
    </div>
  );
}
