'use client';

import { useState, useCallback } from 'react';
import { toast } from '@/lib/toast';

// ============================================================
// Types & Constants
// ============================================================

type TriggerType =
  | 'keyword'
  | 'price_threshold'
  | 'regulatory_filing'
  | 'launch_status'
  | 'contract_award'
  | 'funding_round'
  | 'weather_severity';

type Step = 1 | 2 | 3 | 4;

const TRIGGER_TYPE_META: Record<
  TriggerType,
  { label: string; description: string; icon: string }
> = {
  keyword: {
    label: 'Keyword Watch',
    description: 'Monitor news and events for specific keywords',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  price_threshold: {
    label: 'Price Threshold',
    description: 'Get alerted when stock prices cross your thresholds',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  regulatory_filing: {
    label: 'Regulatory Filing',
    description: 'Track new FCC, FAA, NOAA, and other agency filings',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  launch_status: {
    label: 'Launch Status',
    description: 'Follow launch countdown changes and status updates',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  contract_award: {
    label: 'Contract Award',
    description: 'Monitor new government contract awards and opportunities',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  funding_round: {
    label: 'Funding Round',
    description: 'Track new funding events across the space industry',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  weather_severity: {
    label: 'Space Weather',
    description: 'Get alerted on geomagnetic storms and solar events',
    icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  },
};

const CHANNEL_OPTIONS: readonly { value: string; label: string; description: string; enterprise?: boolean }[] = [
  { value: 'in_app', label: 'In-App', description: 'Notifications in SpaceNexus' },
  { value: 'email', label: 'Email', description: 'Delivered to your inbox' },
  { value: 'push', label: 'Push', description: 'Browser push notifications' },
  { value: 'webhook', label: 'Webhook', description: 'Enterprise only', enterprise: true },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-600 text-slate-200' },
  { value: 'normal', label: 'Normal', color: 'bg-cyan-900/60 text-cyan-300' },
  { value: 'high', label: 'High', color: 'bg-orange-900/60 text-orange-300' },
  { value: 'critical', label: 'Critical', color: 'bg-red-900/60 text-red-300' },
] as const;

const EMAIL_FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', description: 'Send right when triggered' },
  { value: 'daily_digest', label: 'Daily Digest', description: 'Batched once per day' },
  { value: 'weekly_digest', label: 'Weekly Digest', description: 'Batched once per week' },
] as const;

const REGULATORY_AGENCIES = ['FAA', 'FCC', 'NOAA', 'NASA', 'USSF', 'DoD', 'ITAR', 'BIS'];
const REGULATORY_CATEGORIES = ['licensing', 'export_control', 'spectrum', 'launch_safety', 'environmental', 'procurement'];
const LAUNCH_PROVIDERS = ['SpaceX', 'Rocket Lab', 'ULA', 'Blue Origin', 'Arianespace', 'ISRO', 'JAXA', 'Relativity Space', 'Firefly'];
const LAUNCH_STATUSES = ['go', 'hold', 'scrub', 'success', 'failure', 'tbd', 'in_flight'];
const CONTRACT_AGENCIES = ['NASA', 'USSF', 'DARPA', 'DoD', 'NRO', 'NOAA', 'SDA', 'MDA'];
const FUNDING_SECTORS = ['launch', 'satellite', 'space_station', 'earth_observation', 'communications', 'in_space_manufacturing', 'propulsion', 'defense'];
const ROUND_TYPES = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'SPAC', 'IPO', 'Debt', 'Grant'];
const WEATHER_ALERT_TYPES = ['geomagnetic_storm', 'solar_flare', 'cme', 'radiation_storm', 'radio_blackout'];

const COOLDOWN_PRESETS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
];

// ============================================================
// Props
// ============================================================

interface AlertRuleBuilderProps {
  onClose: () => void;
  onCreated: () => void;
}

// ============================================================
// Component
// ============================================================

export default function AlertRuleBuilder({ onClose, onCreated }: AlertRuleBuilderProps) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Trigger type
  const [triggerType, setTriggerType] = useState<TriggerType>('keyword');

  // Step 2: Trigger config (varies by type)
  // Keyword
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchType, setMatchType] = useState<'any' | 'all'>('any');
  // Price
  const [ticker, setTicker] = useState('');
  const [priceCondition, setPriceCondition] = useState<'above' | 'below' | 'percent_change'>('above');
  const [priceValue, setPriceValue] = useState('');
  // Regulatory
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedRegCategories, setSelectedRegCategories] = useState<string[]>([]);
  // Launch
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  // Contract
  const [contractAgencies, setContractAgencies] = useState<string[]>([]);
  const [contractNaics, setContractNaics] = useState('');
  const [contractMinValue, setContractMinValue] = useState('');
  const [contractKeywords, setContractKeywords] = useState<string[]>([]);
  const [contractKeywordInput, setContractKeywordInput] = useState('');
  // Funding
  const [fundingSectors, setFundingSectors] = useState<string[]>([]);
  const [fundingMinAmount, setFundingMinAmount] = useState('');
  const [fundingRoundTypes, setFundingRoundTypes] = useState<string[]>([]);
  // Weather
  const [minKpIndex, setMinKpIndex] = useState(5);
  const [weatherAlertTypes, setWeatherAlertTypes] = useState<string[]>([]);

  // Step 3: Delivery
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [emailFrequency, setEmailFrequency] = useState('immediate');
  const [priority, setPriority] = useState('normal');
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');

  // ============================================================
  // Helper: multi-select toggle
  // ============================================================

  const toggleArrayItem = useCallback(
    (arr: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter(arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item]);
    },
    []
  );

  // ============================================================
  // Helper: add keyword chip
  // ============================================================

  const addKeyword = useCallback(
    (input: string, current: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, inputSetter: React.Dispatch<React.SetStateAction<string>>) => {
      const trimmed = input.trim();
      if (trimmed && !current.includes(trimmed)) {
        setter([...current, trimmed]);
      }
      inputSetter('');
    },
    []
  );

  // ============================================================
  // Build trigger config
  // ============================================================

  const buildTriggerConfig = (): Record<string, unknown> => {
    switch (triggerType) {
      case 'keyword':
        return { keywords, matchType };
      case 'price_threshold':
        return {
          ticker: ticker.trim().toUpperCase(),
          condition: priceCondition,
          value: parseFloat(priceValue) || 0,
        };
      case 'regulatory_filing':
        return {
          agencies: selectedAgencies.length > 0 ? selectedAgencies : undefined,
          categories: selectedRegCategories.length > 0 ? selectedRegCategories : undefined,
        };
      case 'launch_status':
        return {
          providers: selectedProviders.length > 0 ? selectedProviders : undefined,
          statusChanges: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        };
      case 'contract_award':
        return {
          agencies: contractAgencies.length > 0 ? contractAgencies : undefined,
          naicsCodes: contractNaics
            ? contractNaics.split(',').map((n) => n.trim()).filter(Boolean)
            : undefined,
          minValue: contractMinValue ? parseFloat(contractMinValue) : undefined,
          keywords: contractKeywords.length > 0 ? contractKeywords : undefined,
        };
      case 'funding_round':
        return {
          sectors: fundingSectors.length > 0 ? fundingSectors : undefined,
          minAmount: fundingMinAmount ? parseFloat(fundingMinAmount) : undefined,
          roundTypes: fundingRoundTypes.length > 0 ? fundingRoundTypes : undefined,
        };
      case 'weather_severity':
        return {
          minKpIndex,
          alertTypes: weatherAlertTypes.length > 0 ? weatherAlertTypes : undefined,
        };
      default:
        return {};
    }
  };

  // ============================================================
  // Validate current step
  // ============================================================

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true; // always can pick a type
      case 2:
        return validateTriggerConfig();
      case 3:
        return channels.length > 0 && ruleName.trim().length > 0;
      default:
        return true;
    }
  };

  const validateTriggerConfig = (): boolean => {
    switch (triggerType) {
      case 'keyword':
        return keywords.length > 0;
      case 'price_threshold':
        return ticker.trim().length > 0 && parseFloat(priceValue) > 0;
      case 'regulatory_filing':
      case 'launch_status':
      case 'contract_award':
      case 'funding_round':
        return true; // all optional filters
      case 'weather_severity':
        return minKpIndex >= 0 && minKpIndex <= 9;
      default:
        return true;
    }
  };

  // ============================================================
  // Trigger config summary for review
  // ============================================================

  const getTriggerConfigSummary = (): string => {
    switch (triggerType) {
      case 'keyword':
        return `Keywords: ${keywords.join(', ')} (match ${matchType})`;
      case 'price_threshold':
        return `${ticker.toUpperCase()} ${priceCondition === 'above' ? 'above' : priceCondition === 'below' ? 'below' : '% change >'} ${priceCondition === 'percent_change' ? priceValue + '%' : '$' + priceValue}`;
      case 'regulatory_filing': {
        const parts: string[] = [];
        if (selectedAgencies.length > 0) parts.push(`Agencies: ${selectedAgencies.join(', ')}`);
        if (selectedRegCategories.length > 0) parts.push(`Categories: ${selectedRegCategories.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'All regulatory filings';
      }
      case 'launch_status': {
        const parts: string[] = [];
        if (selectedProviders.length > 0) parts.push(`Providers: ${selectedProviders.join(', ')}`);
        if (selectedStatuses.length > 0) parts.push(`Statuses: ${selectedStatuses.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'All launch status changes';
      }
      case 'contract_award': {
        const parts: string[] = [];
        if (contractAgencies.length > 0) parts.push(`Agencies: ${contractAgencies.join(', ')}`);
        if (contractMinValue) parts.push(`Min: $${contractMinValue}M`);
        if (contractKeywords.length > 0) parts.push(`Keywords: ${contractKeywords.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'All contract awards';
      }
      case 'funding_round': {
        const parts: string[] = [];
        if (fundingSectors.length > 0) parts.push(`Sectors: ${fundingSectors.join(', ')}`);
        if (fundingMinAmount) parts.push(`Min: $${fundingMinAmount}M`);
        if (fundingRoundTypes.length > 0) parts.push(`Rounds: ${fundingRoundTypes.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'All funding rounds';
      }
      case 'weather_severity': {
        const parts = [`Kp >= ${minKpIndex}`];
        if (weatherAlertTypes.length > 0) parts.push(`Types: ${weatherAlertTypes.join(', ')}`);
        return parts.join(' | ');
      }
      default:
        return '';
    }
  };

  // ============================================================
  // Submit
  // ============================================================

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName.trim(),
          description: ruleDescription.trim() || undefined,
          triggerType,
          triggerConfig: buildTriggerConfig(),
          channels,
          emailFrequency,
          priority,
          cooldownMinutes,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success('Alert rule created successfully');
        onCreated();
      } else {
        toast.error(json.error?.message || 'Failed to create alert rule');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Chip component
  // ============================================================

  const Chip = ({
    label,
    selected,
    onClick,
    small,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    small?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`${small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-lg font-medium transition-all border ${
        selected
          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  );

  // ============================================================
  // Render Steps
  // ============================================================

  const renderStep1 = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-400 mb-4">
        What kind of events do you want to monitor?
      </p>
      <div className="grid grid-cols-1 gap-2">
        {(Object.entries(TRIGGER_TYPE_META) as [TriggerType, typeof TRIGGER_TYPE_META[TriggerType]][]).map(
          ([type, meta]) => (
            <button
              key={type}
              type="button"
              onClick={() => setTriggerType(type)}
              className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                triggerType === type
                  ? 'bg-cyan-950/40 border-cyan-600 ring-1 ring-cyan-600/50'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <svg
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  triggerType === type ? 'text-cyan-400' : 'text-slate-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={meta.icon}
                />
              </svg>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    triggerType === type ? 'text-cyan-300' : 'text-white'
                  }`}
                >
                  {meta.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );

  const renderStep2 = () => {
    switch (triggerType) {
      case 'keyword':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Keywords
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword(keywordInput, keywords, setKeywords, setKeywordInput);
                    }
                  }}
                  placeholder="Type a keyword and press Enter"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => addKeyword(keywordInput, keywords, setKeywords, setKeywordInput)}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-900/40 text-cyan-300 text-xs rounded-full"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
                        className="hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {keywords.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">At least one keyword is required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Match Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMatchType('any')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    matchType === 'any'
                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Match ANY (OR)
                </button>
                <button
                  type="button"
                  onClick={() => setMatchType('all')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    matchType === 'all'
                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Match ALL (AND)
                </button>
              </div>
            </div>
          </div>
        );

      case 'price_threshold':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Ticker Symbol</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g., RKLB, ASTS, SPCE"
                maxLength={10}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Condition</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'above', label: 'Goes Above' },
                  { value: 'below', label: 'Drops Below' },
                  { value: 'percent_change', label: '% Change' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriceCondition(opt.value)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      priceCondition === opt.value
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {priceCondition === 'percent_change' ? 'Percentage (%)' : 'Price ($)'}
              </label>
              <input
                type="number"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={priceCondition === 'percent_change' ? '5' : '100.00'}
                step="0.01"
                min="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'regulatory_filing':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Agencies <span className="text-slate-500 font-normal">(optional -- leave empty for all)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REGULATORY_AGENCIES.map((agency) => (
                  <Chip
                    key={agency}
                    label={agency}
                    selected={selectedAgencies.includes(agency)}
                    onClick={() => toggleArrayItem(selectedAgencies, agency, setSelectedAgencies)}
                    small
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Categories <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REGULATORY_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat.replace(/_/g, ' ')}
                    selected={selectedRegCategories.includes(cat)}
                    onClick={() => toggleArrayItem(selectedRegCategories, cat, setSelectedRegCategories)}
                    small
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'launch_status':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Launch Providers <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LAUNCH_PROVIDERS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    selected={selectedProviders.includes(p)}
                    onClick={() => toggleArrayItem(selectedProviders, p, setSelectedProviders)}
                    small
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Status Changes <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LAUNCH_STATUSES.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={selectedStatuses.includes(s)}
                    onClick={() => toggleArrayItem(selectedStatuses, s, setSelectedStatuses)}
                    small
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'contract_award':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Agencies <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_AGENCIES.map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    selected={contractAgencies.includes(a)}
                    onClick={() => toggleArrayItem(contractAgencies, a, setContractAgencies)}
                    small
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                NAICS Codes <span className="text-slate-500 font-normal">(comma-separated, optional)</span>
              </label>
              <input
                type="text"
                value={contractNaics}
                onChange={(e) => setContractNaics(e.target.value)}
                placeholder="e.g., 336414, 517410"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Minimum Value ($M)
              </label>
              <input
                type="number"
                value={contractMinValue}
                onChange={(e) => setContractMinValue(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Keywords</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contractKeywordInput}
                  onChange={(e) => setContractKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword(contractKeywordInput, contractKeywords, setContractKeywords, setContractKeywordInput);
                    }
                  }}
                  placeholder="Add keyword"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => addKeyword(contractKeywordInput, contractKeywords, setContractKeywords, setContractKeywordInput)}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              {contractKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {contractKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-900/40 text-cyan-300 text-xs rounded-full"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => setContractKeywords(contractKeywords.filter((k) => k !== kw))}
                        className="hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'funding_round':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Sectors <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FUNDING_SECTORS.map((s) => (
                  <Chip
                    key={s}
                    label={s.replace(/_/g, ' ')}
                    selected={fundingSectors.includes(s)}
                    onClick={() => toggleArrayItem(fundingSectors, s, setFundingSectors)}
                    small
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Minimum Amount ($M)
              </label>
              <input
                type="number"
                value={fundingMinAmount}
                onChange={(e) => setFundingMinAmount(e.target.value)}
                placeholder="e.g., 50"
                min="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Round Types <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROUND_TYPES.map((rt) => (
                  <Chip
                    key={rt}
                    label={rt}
                    selected={fundingRoundTypes.includes(rt)}
                    onClick={() => toggleArrayItem(fundingRoundTypes, rt, setFundingRoundTypes)}
                    small
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'weather_severity':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Minimum Kp Index: <span className="text-cyan-400 font-bold">{minKpIndex}</span>
              </label>
              <input
                type="range"
                value={minKpIndex}
                onChange={(e) => setMinKpIndex(parseInt(e.target.value))}
                min={0}
                max={9}
                step={1}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0 (Quiet)</span>
                <span>5 (Storm)</span>
                <span>9 (Extreme)</span>
              </div>
              <div className="mt-2 p-2.5 bg-slate-800/60 rounded-lg">
                <p className="text-xs text-slate-400">
                  {minKpIndex <= 3 && 'Low threshold -- you will receive many alerts'}
                  {minKpIndex === 4 && 'Moderate activity -- minor storming'}
                  {minKpIndex === 5 && 'Minor storm -- G1 level geomagnetic activity'}
                  {minKpIndex === 6 && 'Moderate storm -- G2 level, some radio disruption'}
                  {minKpIndex === 7 && 'Strong storm -- G3 level, significant impact'}
                  {minKpIndex === 8 && 'Severe storm -- G4 level, widespread disruption'}
                  {minKpIndex === 9 && 'Extreme storm -- G5 level, rare and dangerous'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Alert Types <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEATHER_ALERT_TYPES.map((at) => (
                  <Chip
                    key={at}
                    label={at.replace(/_/g, ' ')}
                    selected={weatherAlertTypes.includes(at)}
                    onClick={() => toggleArrayItem(weatherAlertTypes, at, setWeatherAlertTypes)}
                    small
                  />
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Rule name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Rule Name *</label>
        <input
          type="text"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="e.g., SpaceX Launch Updates"
          maxLength={100}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
        <textarea
          value={ruleDescription}
          onChange={(e) => setRuleDescription(e.target.value)}
          placeholder="Optional -- describe what this alert monitors"
          maxLength={500}
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Channels */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Notification Channels *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CHANNEL_OPTIONS.map((ch) => (
            <button
              key={ch.value}
              type="button"
              onClick={() =>
                toggleArrayItem(channels, ch.value, setChannels)
              }
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                channels.includes(ch.value)
                  ? 'bg-cyan-600/20 border-cyan-500 ring-1 ring-cyan-600/30'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              } ${'enterprise' in ch && ch.enterprise ? 'opacity-70' : ''}`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  channels.includes(ch.value)
                    ? 'border-cyan-500 bg-cyan-500'
                    : 'border-slate-600'
                }`}
              >
                {channels.includes(ch.value) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{ch.label}</p>
                <p className="text-xs text-slate-500">{ch.description}</p>
              </div>
            </button>
          ))}
        </div>
        {channels.length === 0 && (
          <p className="text-xs text-amber-400 mt-1">Select at least one channel</p>
        )}
      </div>

      {/* Email frequency */}
      {channels.includes('email') && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Frequency</label>
          <div className="space-y-1.5">
            {EMAIL_FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEmailFrequency(opt.value)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                  emailFrequency === opt.value
                    ? 'bg-cyan-600/20 border-cyan-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    emailFrequency === opt.value ? 'border-cyan-500' : 'border-slate-600'
                  }`}
                >
                  {emailFrequency === opt.value && (
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                priority === opt.value
                  ? `${opt.color} border-current`
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cooldown */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Cooldown Between Triggers
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COOLDOWN_PRESETS.map((preset) => (
            <Chip
              key={preset.value}
              label={preset.label}
              selected={cooldownMinutes === preset.value}
              onClick={() => setCooldownMinutes(preset.value)}
              small
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Prevents the same alert from firing too frequently
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 mb-2">Review your alert rule before creating it.</p>

      <div className="space-y-3">
        {/* Rule Name */}
        <div className="bg-slate-800/60 rounded-lg p-3.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rule Name</p>
          <p className="text-white font-semibold">{ruleName}</p>
          {ruleDescription && (
            <p className="text-sm text-slate-400 mt-1">{ruleDescription}</p>
          )}
        </div>

        {/* Trigger */}
        <div className="bg-slate-800/60 rounded-lg p-3.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trigger</p>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRIGGER_TYPE_META[triggerType].icon} />
            </svg>
            <p className="text-white font-medium">{TRIGGER_TYPE_META[triggerType].label}</p>
          </div>
          <p className="text-sm text-slate-400">{getTriggerConfigSummary()}</p>
        </div>

        {/* Delivery */}
        <div className="bg-slate-800/60 rounded-lg p-3.5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Delivery</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {channels.map((ch) => (
              <span key={ch} className="px-2 py-0.5 bg-cyan-900/40 text-cyan-300 text-xs rounded">
                {CHANNEL_OPTIONS.find((c) => c.value === ch)?.label || ch}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>Priority: <span className="text-white">{priority}</span></span>
            <span>Cooldown: <span className="text-white">{COOLDOWN_PRESETS.find((p) => p.value === cooldownMinutes)?.label || `${cooldownMinutes}m`}</span></span>
            {channels.includes('email') && (
              <span>Email: <span className="text-white">{emailFrequency.replace(/_/g, ' ')}</span></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // Step Labels
  // ============================================================

  const STEP_LABELS: Record<Step, string> = {
    1: 'Trigger Type',
    2: 'Configure',
    3: 'Delivery',
    4: 'Confirm',
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Create Alert Rule</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {step} of 4: {STEP_LABELS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep((step - 1) as Step);
              }
            }}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Alert'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
