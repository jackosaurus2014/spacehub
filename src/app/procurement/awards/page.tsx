'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ExportButton from '@/components/ui/ExportButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SpaceContractAward {
  awardId: string;
  title: string;
  recipientName: string;
  recipientUei?: string;
  awardingAgency: string;
  fundingAgency?: string;
  totalObligation: number;
  startDate: string;
  endDate?: string;
  description: string;
  naicsCode?: string;
  naicsDescription?: string;
  placeOfPerformance?: string;
  awardType: string;
  companySlug?: string;
}

const AGENCY_OPTIONS = [
  { value: '', label: 'All Agencies' },
  { value: 'National Aeronautics and Space Administration', label: 'NASA' },
  { value: 'Department of Defense', label: 'Department of Defense' },
  { value: 'Department of the Air Force', label: 'Air Force / Space Force' },
  { value: 'National Oceanic and Atmospheric Administration', label: 'NOAA' },
  { value: 'Department of the Army', label: 'Army' },
  { value: 'Department of the Navy', label: 'Navy' },
  { value: 'Missile Defense Agency', label: 'Missile Defense Agency' },
];

const DATE_RANGE_OPTIONS = [
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 180 days' },
  { value: 365, label: 'Last year' },
];

const formatCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCompactCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return formatCurrency.format(value);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getAwardTypeBadge(awardType: string) {
  const typeMap: Record<string, { bg: string; text: string; label: string }> = {
    'BPA Call': {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      label: 'BPA Call',
    },
    'Purchase Order': {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      label: 'Purchase Order',
    },
    'Delivery Order': {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      label: 'Delivery Order',
    },
    'Definitive Contract': {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      label: 'Definitive Contract',
    },
    Contract: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      label: 'Contract',
    },
  };

  const style = typeMap[awardType] || {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    label: awardType,
  };

  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} whitespace-nowrap`}
    >
      {style.label}
    </span>
  );
}

export default function ContractAwardsPage() {
  const [awards, setAwards] = useState<SpaceContractAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [agency, setAgency] = useState('');
  const [dateRange, setDateRange] = useState(90);
  const [minAmount, setMinAmount] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expandedAward, setExpandedAward] = useState<string | null>(null);
  const limit = 20;

  const fetchAwards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (agency) params.set('agency', agency);
      params.set('dateRange', dateRange.toString());
      if (minAmount) params.set('minAmount', minAmount);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/procurement/awards?${params}`);
      if (!res.ok) throw new Error('Failed to fetch awards');
      const data = await res.json();

      if (data.success) {
        setAwards(data.data.awards || []);
        setTotalCount(data.data.totalCount || 0);
        setHasMore(data.data.hasMore || false);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch');
      }
    } catch {
      setError('Failed to load contract awards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, agency, dateRange, minAmount, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchAwards, 400);
    return () => clearTimeout(debounce);
  }, [fetchAwards]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, agency, dateRange, minAmount]);

  const totalObligation = awards.reduce(
    (sum, a) => sum + a.totalObligation,
    0
  );

  const exportColumns = [
    { key: 'awardId', label: 'Award ID' },
    { key: 'title', label: 'Title' },
    { key: 'recipientName', label: 'Recipient' },
    { key: 'awardingAgency', label: 'Awarding Agency' },
    { key: 'fundingAgency', label: 'Funding Agency' },
    { key: 'totalObligation', label: 'Total Obligation ($)' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'awardType', label: 'Award Type' },
    { key: 'naicsCode', label: 'NAICS Code' },
    { key: 'naicsDescription', label: 'NAICS Description' },
    { key: 'placeOfPerformance', label: 'Place of Performance' },
    { key: 'description', label: 'Description' },
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="Contract Awards"
        subtitle="Track federal contract awards in the space industry -- NASA, DoD, Space Force, and more"
        icon="📋"
      />

      {/* Summary Stats */}
      {!loading && awards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="text-xs text-slate-400 mb-1">Total Results</div>
            <div className="text-xl font-bold text-white">
              {totalCount.toLocaleString()}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="text-xs text-slate-400 mb-1">
              Showing on Page
            </div>
            <div className="text-xl font-bold text-white">{awards.length}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="text-xs text-slate-400 mb-1">
              Page Total Value
            </div>
            <div className="text-xl font-bold text-emerald-400">
              {formatCompactCurrency(totalObligation)}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="text-xs text-slate-400 mb-1">Date Range</div>
            <div className="text-xl font-bold text-cyan-400">
              {dateRange} days
            </div>
          </motion.div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              aria-label="Search awards by recipient, description, or agency"
              placeholder="Search by recipient, description, or agency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
            <svg
              className="absolute left-3 top-3 w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Agency filter */}
          <select
            aria-label="Filter by agency"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {AGENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date range filter */}
          <select
            aria-label="Filter by date range"
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Min amount filter */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500 text-sm">
              $
            </span>
            <input
              type="number"
              aria-label="Minimum award amount"
              placeholder="Min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              min="0"
              className="w-full lg:w-40 pl-7 pr-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Results count + export */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>
            {totalCount.toLocaleString()} awards found
            {search && ` for "${search}"`}
          </span>
          <ExportButton
            data={awards}
            filename="spacenexus-contract-awards"
            columns={exportColumns}
            label="Export Awards"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
          <button
            onClick={fetchAwards}
            className="mt-2 text-xs text-red-300 hover:text-white underline transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Awards Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : awards.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No contract awards found
          </h3>
          <p className="text-slate-400">
            Try adjusting your search or filters to find results
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4">Award / Description</div>
              <div className="col-span-2">Recipient</div>
              <div className="col-span-2">Agency</div>
              <div className="col-span-1 text-right">Value</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">NAICS</div>
              <div className="col-span-1">Type</div>
            </div>

            {/* Table Body */}
            <AnimatePresence mode="popLayout">
              {awards.map((award, i) => (
                <motion.div
                  key={award.awardId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors"
                >
                  <button
                    onClick={() =>
                      setExpandedAward(
                        expandedAward === award.awardId
                          ? null
                          : award.awardId
                      )
                    }
                    className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-left"
                  >
                    {/* Award / Description */}
                    <div className="col-span-4 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {award.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {award.awardId}
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="col-span-2 min-w-0">
                      {award.companySlug ? (
                        <Link
                          href={`/company-profiles/${award.companySlug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-cyan-400 hover:text-cyan-300 truncate block transition-colors"
                        >
                          {award.recipientName}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-300 truncate block">
                          {award.recipientName}
                        </span>
                      )}
                    </div>

                    {/* Agency */}
                    <div className="col-span-2 min-w-0">
                      <span className="text-sm text-slate-300 truncate block">
                        {award.awardingAgency}
                      </span>
                    </div>

                    {/* Value */}
                    <div className="col-span-1 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          award.totalObligation >= 1e6
                            ? 'text-emerald-400'
                            : award.totalObligation >= 1e5
                              ? 'text-amber-400'
                              : 'text-slate-300'
                        }`}
                      >
                        {formatCompactCurrency(award.totalObligation)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                      <span className="text-xs text-slate-400">
                        {formatDate(award.startDate)}
                      </span>
                    </div>

                    {/* NAICS */}
                    <div className="col-span-1">
                      {award.naicsCode ? (
                        <span className="text-xs text-slate-400 font-mono">
                          {award.naicsCode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">--</span>
                      )}
                    </div>

                    {/* Type */}
                    <div className="col-span-1">
                      {getAwardTypeBadge(award.awardType)}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedAward === award.awardId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-4 bg-slate-800/40 border-t border-slate-700/30">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                Full Value
                              </div>
                              <div className="text-sm text-white font-semibold">
                                {formatCurrency.format(award.totalObligation)}
                              </div>
                            </div>
                            {award.fundingAgency && (
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                  Funding Agency
                                </div>
                                <div className="text-sm text-slate-300">
                                  {award.fundingAgency}
                                </div>
                              </div>
                            )}
                            {award.placeOfPerformance && (
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                  Place of Performance
                                </div>
                                <div className="text-sm text-slate-300">
                                  {award.placeOfPerformance}
                                </div>
                              </div>
                            )}
                            {award.endDate && (
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                  End Date
                                </div>
                                <div className="text-sm text-slate-300">
                                  {formatDate(award.endDate)}
                                </div>
                              </div>
                            )}
                            {award.naicsDescription && (
                              <div className="col-span-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                  NAICS Description
                                </div>
                                <div className="text-sm text-slate-300">
                                  {award.naicsCode} -{' '}
                                  {award.naicsDescription}
                                </div>
                              </div>
                            )}
                            {award.recipientUei && (
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                  Recipient UEI
                                </div>
                                <div className="text-sm text-slate-400 font-mono">
                                  {award.recipientUei}
                                </div>
                              </div>
                            )}
                          </div>
                          {award.description && (
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                Description
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {award.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            <AnimatePresence mode="popLayout">
              {awards.map((award, i) => (
                <motion.div
                  key={award.awardId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-sm font-medium text-white line-clamp-2">
                        {award.title}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {award.awardId}
                      </div>
                    </div>
                    {getAwardTypeBadge(award.awardType)}
                  </div>

                  <div className="space-y-2">
                    {/* Recipient */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Recipient</span>
                      {award.companySlug ? (
                        <Link
                          href={`/company-profiles/${award.companySlug}`}
                          className="text-sm text-cyan-400 hover:text-cyan-300 truncate max-w-[200px] transition-colors"
                        >
                          {award.recipientName}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-300 truncate max-w-[200px]">
                          {award.recipientName}
                        </span>
                      )}
                    </div>

                    {/* Agency */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Agency</span>
                      <span className="text-sm text-slate-300 truncate max-w-[200px]">
                        {award.awardingAgency}
                      </span>
                    </div>

                    {/* Value */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Value</span>
                      <span
                        className={`text-sm font-semibold ${
                          award.totalObligation >= 1e6
                            ? 'text-emerald-400'
                            : award.totalObligation >= 1e5
                              ? 'text-amber-400'
                              : 'text-slate-300'
                        }`}
                      >
                        {formatCurrency.format(award.totalObligation)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Start Date</span>
                      <span className="text-sm text-slate-400">
                        {formatDate(award.startDate)}
                      </span>
                    </div>

                    {/* NAICS */}
                    {award.naicsCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">NAICS</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {award.naicsCode}
                          {award.naicsDescription &&
                            ` - ${award.naicsDescription}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expand button for description */}
                  {award.description && (
                    <button
                      onClick={() =>
                        setExpandedAward(
                          expandedAward === award.awardId
                            ? null
                            : award.awardId
                        )
                      }
                      className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {expandedAward === award.awardId
                        ? 'Hide details'
                        : 'Show details'}
                    </button>
                  )}

                  <AnimatePresence>
                    {expandedAward === award.awardId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-slate-700/30">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {award.description}
                          </p>
                          {award.placeOfPerformance && (
                            <div className="mt-2 text-xs text-slate-500">
                              Place of Performance:{' '}
                              {award.placeOfPerformance}
                            </div>
                          )}
                          {award.fundingAgency && (
                            <div className="mt-1 text-xs text-slate-500">
                              Funding Agency: {award.fundingAgency}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
