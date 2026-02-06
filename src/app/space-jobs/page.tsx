'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SpaceTalent,
  Webinar,
  TALENT_EXPERTISE_AREAS,
  TALENT_AVAILABILITY_INFO,
  WEBINAR_TOPICS,
  TalentExpertiseArea,
  TalentAvailability,
} from '@/types';
import TalentCard from '@/components/talent/TalentCard';
import WebinarCard from '@/components/webinars/WebinarCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';

type ActiveTab = 'experts' | 'webinars';

interface TalentStats {
  totalExperts: number;
  featuredCount: number;
  availableCount: number;
  avgConsultingRate: number;
}

interface WebinarStats {
  totalWebinars: number;
  liveCount: number;
  upcomingCount: number;
  pastCount: number;
  recordingsAvailable: number;
}

export default function SpaceTalentPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('experts');

  // Talent state
  const [talent, setTalent] = useState<SpaceTalent[]>([]);
  const [talentStats, setTalentStats] = useState<TalentStats | null>(null);
  const [talentLoading, setTalentLoading] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState<TalentExpertiseArea | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<TalentAvailability | ''>('');
  const [talentSearch, setTalentSearch] = useState('');

  // Webinar state
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [webinarStats, setWebinarStats] = useState<WebinarStats | null>(null);
  const [webinarLoading, setWebinarLoading] = useState(false);
  const [webinarFilter, setWebinarFilter] = useState<'all' | 'live' | 'upcoming' | 'past'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('');

  // Fetch talent data on mount and when filters change
  useEffect(() => {
    if (activeTab === 'experts') {
      fetchTalent();
    }
  }, [activeTab, expertiseFilter, availabilityFilter, talentSearch]);

  // Fetch webinar data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'webinars') {
      fetchWebinars();
    }
  }, [activeTab, webinarFilter, topicFilter]);

  const fetchTalent = async () => {
    setTalentLoading(true);
    try {
      const params = new URLSearchParams();
      if (expertiseFilter) params.set('expertise', expertiseFilter);
      if (availabilityFilter) params.set('availability', availabilityFilter);
      if (talentSearch) params.set('search', talentSearch);

      const res = await fetch(`/api/space-jobs/talent?${params.toString()}`);
      const data = await res.json();

      if (data.talent) setTalent(data.talent);
      if (data.stats) setTalentStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch talent:', error);
    } finally {
      setTalentLoading(false);
    }
  };

  const fetchWebinars = async () => {
    setWebinarLoading(true);
    try {
      const params = new URLSearchParams();
      if (topicFilter) params.set('topic', topicFilter);
      if (webinarFilter === 'live') params.set('isLive', 'true');
      if (webinarFilter === 'upcoming') {
        params.set('isPast', 'false');
        params.set('isLive', 'false');
      }
      if (webinarFilter === 'past') params.set('isPast', 'true');

      const res = await fetch(`/api/space-jobs/webinars?${params.toString()}`);
      const data = await res.json();

      if (data.webinars) setWebinars(data.webinars);
      if (data.stats) setWebinarStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch webinars:', error);
    } finally {
      setWebinarLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-space-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <PageHeader
          title="Space Talent & Experts"
          subtitle="Connect with industry-leading consultants, lawyers, engineers & policy experts"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Talent & Experts' }]}
        >
          <Link href="/workforce" className="btn-secondary text-sm py-2 px-4">
            View Job Listings →
          </Link>
        </PageHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/50 mb-6">
          <button
            onClick={() => setActiveTab('experts')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'experts'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              🎯 Expert Consultants
            </span>
          </button>
          <button
            onClick={() => setActiveTab('webinars')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'webinars'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              🎥 Technical Panels & Webinars
              {webinarStats?.liveCount ? (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded animate-pulse">
                  {webinarStats.liveCount} LIVE
                </span>
              ) : null}
            </span>
          </button>
        </div>

        {/* Expert Consultants Tab */}
        {activeTab === 'experts' && (
          <div>
            {/* Description */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg p-4 mb-6">
              <p className="text-slate-300 text-sm">
                <strong className="text-cyan-400">Find the right expert for your project.</strong>{' '}
                Our network includes space lawyers, regulatory specialists, aerospace engineers,
                policy advisors, and business consultants with deep industry experience.
              </p>
            </div>

            {/* Stats Cards */}
            {talentStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{talentStats.totalExperts}</div>
                  <div className="text-slate-400 text-xs">Total Experts</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{talentStats.featuredCount}</div>
                  <div className="text-slate-400 text-xs">Featured</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{talentStats.availableCount}</div>
                  <div className="text-slate-400 text-xs">Available Now</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">${talentStats.avgConsultingRate}</div>
                  <div className="text-slate-400 text-xs">Avg. Rate/hr</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, title, organization, or expertise..."
                    value={talentSearch}
                    onChange={(e) => setTalentSearch(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={expertiseFilter}
                  onChange={(e) => setExpertiseFilter(e.target.value as TalentExpertiseArea | '')}
                  className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Expertise Areas</option>
                  {TALENT_EXPERTISE_AREAS.map(exp => (
                    <option key={exp.value} value={exp.value}>
                      {exp.icon} {exp.label}
                    </option>
                  ))}
                </select>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as TalentAvailability | '')}
                  className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Availability</option>
                  {Object.entries(TALENT_AVAILABILITY_INFO).map(([key, info]) => (
                    <option key={key} value={key}>{info.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Talent Grid */}
            {talentLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : talent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {talent.map(t => (
                  <TalentCard key={t.id} talent={t} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No experts found matching your criteria.</p>
                <button
                  onClick={() => {
                    setExpertiseFilter('');
                    setAvailabilityFilter('');
                    setTalentSearch('');
                  }}
                  className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* CTA for experts to join */}
            <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
              <h3 className="text-white font-semibold mb-2">Are you a space industry expert?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Join our network to connect with companies and projects seeking your expertise.
              </p>
              <a
                href="mailto:talent@spacenexus.com?subject=Expert Network Application"
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Apply to Join Network
              </a>
            </div>
          </div>
        )}

        {/* Webinars Tab */}
        {activeTab === 'webinars' && (
          <div>
            {/* Description */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
              <p className="text-slate-300 text-sm">
                <strong className="text-purple-400">Learn from industry leaders.</strong>{' '}
                Join live technical panels, webinars, and discussions on topics like space nuclear payloads,
                in-orbit manufacturing, regulatory compliance, and emerging space technologies.
              </p>
            </div>

            {/* Stats Cards */}
            {webinarStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{webinarStats.totalWebinars}</div>
                  <div className="text-slate-400 text-xs">Total Events</div>
                </div>
                <div className={`bg-slate-800/50 border rounded-lg p-4 text-center ${webinarStats.liveCount > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50'}`}>
                  <div className="text-2xl font-bold text-red-400">{webinarStats.liveCount}</div>
                  <div className="text-slate-400 text-xs">Live Now</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{webinarStats.upcomingCount}</div>
                  <div className="text-slate-400 text-xs">Upcoming</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-400">{webinarStats.pastCount}</div>
                  <div className="text-slate-400 text-xs">Past Events</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{webinarStats.recordingsAvailable}</div>
                  <div className="text-slate-400 text-xs">Recordings</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'live', label: 'Live', color: 'text-red-400' },
                    { value: 'upcoming', label: 'Upcoming', color: 'text-cyan-400' },
                    { value: 'past', label: 'Past', color: 'text-slate-400' },
                  ].map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setWebinarFilter(filter.value as typeof webinarFilter)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        webinarFilter === filter.value
                          ? 'bg-cyan-500 text-white'
                          : `bg-slate-700/50 hover:bg-slate-600/50 ${filter.color || 'text-slate-300'}`
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">All Topics</option>
                  {WEBINAR_TOPICS.map(topic => (
                    <option key={topic.value} value={topic.value}>
                      {topic.icon} {topic.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Webinar Grid */}
            {webinarLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : webinars.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {webinars.map(w => (
                  <WebinarCard key={w.id} webinar={w} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No webinars found matching your criteria.</p>
                <button
                  onClick={() => {
                    setWebinarFilter('all');
                    setTopicFilter('');
                  }}
                  className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* CTA for hosting webinars */}
            <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
              <h3 className="text-white font-semibold mb-2">Want to host a technical panel?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Share your expertise with the space industry community. We support webinars,
                panel discussions, and technical presentations.
              </p>
              <a
                href="mailto:webinars@spacenexus.com?subject=Webinar Hosting Inquiry"
                className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Propose a Webinar
              </a>
            </div>
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/workforce"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
            >
              📊 Space Workforce - Job Listings & Salary Data
            </Link>
            <Link
              href="/business-opportunities"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
            >
              💼 Business Opportunities
            </Link>
            <Link
              href="/compliance"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
            >
              📋 Compliance & Regulations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
