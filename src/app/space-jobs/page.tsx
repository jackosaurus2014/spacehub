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
import SpaceWorkforceModule from '@/components/modules/SpaceWorkforceModule';

type MainTab = 'workforce' | 'professional';

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

export default function SpaceJobsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('workforce');
  const [talentSubTab, setTalentSubTab] = useState<'board' | 'webinars'>('board');

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

  // Fetch talent data
  useEffect(() => {
    if (mainTab === 'professional' && talentSubTab === 'board') {
      fetchTalent();
    }
  }, [mainTab, talentSubTab, expertiseFilter, availabilityFilter, talentSearch]);

  // Fetch webinar data
  useEffect(() => {
    if (mainTab === 'professional' && talentSubTab === 'webinars') {
      fetchWebinars();
    }
  }, [mainTab, talentSubTab, webinarFilter, topicFilter]);

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
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">💼</span>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">Space Jobs</h1>
              <p className="text-slate-400">Workforce analytics, talent network & professional development</p>
            </div>
          </div>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex border-b border-slate-700/50 mb-6">
          <button
            onClick={() => setMainTab('workforce')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              mainTab === 'workforce'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              📊 Workforce Analytics
            </span>
          </button>
          <button
            onClick={() => setMainTab('professional')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              mainTab === 'professional'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              🎓 Professional Development & Networking
            </span>
          </button>
        </div>

        {/* Workforce Analytics Tab */}
        {mainTab === 'workforce' && (
          <div className="card p-6">
            <SpaceWorkforceModule />
          </div>
        )}

        {/* Professional Development Tab */}
        {mainTab === 'professional' && (
          <div>
            {/* Sub-tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTalentSubTab('board')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  talentSubTab === 'board'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'
                }`}
              >
                👥 Space Talent Board
              </button>
              <button
                onClick={() => setTalentSubTab('webinars')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  talentSubTab === 'webinars'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'
                }`}
              >
                🎥 Virtual Technical Panels
                {webinarStats?.liveCount ? (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded animate-pulse">
                    {webinarStats.liveCount} LIVE
                  </span>
                ) : null}
              </button>
            </div>

            {/* Talent Board */}
            {talentSubTab === 'board' && (
              <div>
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
                        placeholder="Search experts by name, title, or organization..."
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
                  </div>
                )}
              </div>
            )}

            {/* Webinars */}
            {talentSubTab === 'webinars' && (
              <div>
                {/* Stats Cards */}
                {webinarStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{webinarStats.totalWebinars}</div>
                      <div className="text-slate-400 text-xs">Total Webinars</div>
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
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
