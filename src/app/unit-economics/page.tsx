'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { LineChart } from '@/components/charts';

// ── Types ───────────────────────────────────────────────────────────

type BusinessModel =
  | 'satellite-imagery'
  | 'satellite-comms'
  | 'launch-services'
  | 'in-space-manufacturing'
  | 'space-tourism'
  | 'ground-station-network'
  | 'satellite-as-a-service'
  | 'custom';

interface Preset {
  label: string;
  description: string;
  pricePerUnit: number;
  unitsPerMonth: number;
  revenueGrowthRate: number;
  satDev: number;
  launchCosts: number;
  groundInfra: number;
  regulatory: number;
  opsStaff: number;
  avgSalary: number;
  groundStationCosts: number;
  insurance: number;
  bandwidth: number;
  softwareIT: number;
  marketingSales: number;
  gaOther: number;
  cashOnHand: number;
  avgCustomerLifetimeMonths: number;
  priceMin: number;
  priceMax: number;
  priceStep: number;
  unitMin: number;
  unitMax: number;
  unitLabel: string;
}

// ── Preset Defaults ─────────────────────────────────────────────────

const PRESETS: Record<BusinessModel, Preset> = {
  'satellite-imagery': {
    label: 'Satellite Imagery',
    description: 'Sell earth observation images to commercial and government customers',
    pricePerUnit: 5000,
    unitsPerMonth: 50,
    revenueGrowthRate: 25,
    satDev: 15000000,
    launchCosts: 5000000,
    groundInfra: 2000000,
    regulatory: 500000,
    opsStaff: 12,
    avgSalary: 12000,
    groundStationCosts: 25000,
    insurance: 15000,
    bandwidth: 8000,
    softwareIT: 12000,
    marketingSales: 30000,
    gaOther: 15000,
    cashOnHand: 30000000,
    avgCustomerLifetimeMonths: 36,
    priceMin: 500,
    priceMax: 100000,
    priceStep: 500,
    unitMin: 1,
    unitMax: 500,
    unitLabel: 'Images / Month',
  },
  'satellite-comms': {
    label: 'Satellite Communications',
    description: 'Sell bandwidth and connectivity services to enterprises and ISPs',
    pricePerUnit: 25000,
    unitsPerMonth: 20,
    revenueGrowthRate: 20,
    satDev: 50000000,
    launchCosts: 15000000,
    groundInfra: 10000000,
    regulatory: 2000000,
    opsStaff: 25,
    avgSalary: 13000,
    groundStationCosts: 80000,
    insurance: 40000,
    bandwidth: 5000,
    softwareIT: 20000,
    marketingSales: 50000,
    gaOther: 25000,
    cashOnHand: 100000000,
    avgCustomerLifetimeMonths: 48,
    priceMin: 5000,
    priceMax: 500000,
    priceStep: 5000,
    unitMin: 1,
    unitMax: 200,
    unitLabel: 'Subscribers / Month',
  },
  'launch-services': {
    label: 'Launch Services',
    description: 'Sell launch capacity to satellite operators and government agencies',
    pricePerUnit: 5000000,
    unitsPerMonth: 2,
    revenueGrowthRate: 15,
    satDev: 200000000,
    launchCosts: 0,
    groundInfra: 50000000,
    regulatory: 10000000,
    opsStaff: 40,
    avgSalary: 14000,
    groundStationCosts: 0,
    insurance: 200000,
    bandwidth: 5000,
    softwareIT: 30000,
    marketingSales: 80000,
    gaOther: 50000,
    cashOnHand: 500000000,
    avgCustomerLifetimeMonths: 24,
    priceMin: 500000,
    priceMax: 10000000,
    priceStep: 100000,
    unitMin: 1,
    unitMax: 20,
    unitLabel: 'Launches / Month',
  },
  'in-space-manufacturing': {
    label: 'In-Space Manufacturing',
    description: 'Manufacture high-value products in microgravity environments',
    pricePerUnit: 500000,
    unitsPerMonth: 5,
    revenueGrowthRate: 30,
    satDev: 80000000,
    launchCosts: 20000000,
    groundInfra: 5000000,
    regulatory: 3000000,
    opsStaff: 15,
    avgSalary: 15000,
    groundStationCosts: 10000,
    insurance: 50000,
    bandwidth: 5000,
    softwareIT: 15000,
    marketingSales: 40000,
    gaOther: 20000,
    cashOnHand: 150000000,
    avgCustomerLifetimeMonths: 60,
    priceMin: 50000,
    priceMax: 5000000,
    priceStep: 50000,
    unitMin: 1,
    unitMax: 50,
    unitLabel: 'Products / Month',
  },
  'space-tourism': {
    label: 'Space Tourism',
    description: 'Sell suborbital or orbital flight experiences to private customers',
    pricePerUnit: 250000,
    unitsPerMonth: 10,
    revenueGrowthRate: 35,
    satDev: 300000000,
    launchCosts: 0,
    groundInfra: 30000000,
    regulatory: 5000000,
    opsStaff: 30,
    avgSalary: 12000,
    groundStationCosts: 0,
    insurance: 150000,
    bandwidth: 5000,
    softwareIT: 20000,
    marketingSales: 100000,
    gaOther: 40000,
    cashOnHand: 500000000,
    avgCustomerLifetimeMonths: 12,
    priceMin: 50000,
    priceMax: 10000000,
    priceStep: 50000,
    unitMin: 1,
    unitMax: 100,
    unitLabel: 'Tickets / Month',
  },
  'ground-station-network': {
    label: 'Ground Station Network',
    description: 'Sell ground station access and data relay services to satellite operators',
    pricePerUnit: 10000,
    unitsPerMonth: 40,
    revenueGrowthRate: 20,
    satDev: 0,
    launchCosts: 0,
    groundInfra: 15000000,
    regulatory: 1000000,
    opsStaff: 10,
    avgSalary: 11000,
    groundStationCosts: 50000,
    insurance: 10000,
    bandwidth: 15000,
    softwareIT: 10000,
    marketingSales: 20000,
    gaOther: 10000,
    cashOnHand: 25000000,
    avgCustomerLifetimeMonths: 36,
    priceMin: 1000,
    priceMax: 200000,
    priceStep: 1000,
    unitMin: 1,
    unitMax: 500,
    unitLabel: 'Passes / Month',
  },
  'satellite-as-a-service': {
    label: 'Satellite-as-a-Service',
    description: 'Lease satellite capacity on a subscription basis',
    pricePerUnit: 50000,
    unitsPerMonth: 15,
    revenueGrowthRate: 25,
    satDev: 30000000,
    launchCosts: 8000000,
    groundInfra: 3000000,
    regulatory: 1000000,
    opsStaff: 10,
    avgSalary: 13000,
    groundStationCosts: 20000,
    insurance: 20000,
    bandwidth: 10000,
    softwareIT: 15000,
    marketingSales: 25000,
    gaOther: 12000,
    cashOnHand: 50000000,
    avgCustomerLifetimeMonths: 24,
    priceMin: 5000,
    priceMax: 500000,
    priceStep: 5000,
    unitMin: 1,
    unitMax: 100,
    unitLabel: 'Subscriptions / Month',
  },
  custom: {
    label: 'Custom',
    description: 'Define your own space business model from scratch',
    pricePerUnit: 10000,
    unitsPerMonth: 20,
    revenueGrowthRate: 20,
    satDev: 10000000,
    launchCosts: 5000000,
    groundInfra: 2000000,
    regulatory: 500000,
    opsStaff: 10,
    avgSalary: 12000,
    groundStationCosts: 10000,
    insurance: 10000,
    bandwidth: 5000,
    softwareIT: 10000,
    marketingSales: 20000,
    gaOther: 10000,
    cashOnHand: 20000000,
    avgCustomerLifetimeMonths: 24,
    priceMin: 1000,
    priceMax: 10000000,
    priceStep: 1000,
    unitMin: 1,
    unitMax: 1000,
    unitLabel: 'Units / Month',
  },
};

const MODEL_OPTIONS: { value: BusinessModel; label: string }[] = [
  { value: 'satellite-imagery', label: 'Satellite Imagery' },
  { value: 'satellite-comms', label: 'Satellite Communications' },
  { value: 'launch-services', label: 'Launch Services' },
  { value: 'in-space-manufacturing', label: 'In-Space Manufacturing' },
  { value: 'space-tourism', label: 'Space Tourism' },
  { value: 'ground-station-network', label: 'Ground Station Network' },
  { value: 'satellite-as-a-service', label: 'Satellite-as-a-Service' },
  { value: 'custom', label: 'Custom' },
];

// ── Formatting helpers ──────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ── Color helpers ───────────────────────────────────────────────────

function getMarginColor(margin: number): string {
  if (margin > 30) return 'text-emerald-400';
  if (margin > 10) return 'text-amber-400';
  return 'text-red-400';
}

function getMarginBg(margin: number): string {
  if (margin > 30) return 'bg-emerald-500/20 border-emerald-500/30';
  if (margin > 10) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

function getLTVCACColor(ratio: number): string {
  if (ratio >= 3) return 'text-emerald-400';
  if (ratio >= 1) return 'text-amber-400';
  return 'text-red-400';
}

// ── Animation variants ──────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Slider component ────────────────────────────────────────────────

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
  suffix?: string;
}) {
  const displayValue = formatValue ? formatValue(value) : `${value.toLocaleString()}${suffix || ''}`;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-slate-300 font-medium">{label}</label>
        <span className="text-sm font-mono text-emerald-400">{displayValue}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(52,211,153,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #34d399 0%, #34d399 ${percentage}%, #1e293b ${percentage}%, #1e293b 100%)`,
          }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

// ── Dollar Input component ──────────────────────────────────────────

function DollarInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-slate-300 font-medium">{label}</label>
        <span className="text-xs text-slate-500">{formatCurrency(value)}</span>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm
            text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={label}
        />
      </div>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Metric Card component ───────────────────────────────────────────

function MetricCard({
  label,
  value,
  subtitle,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string;
  subtitle?: string;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bgClass || 'bg-slate-800/40 border-slate-700/50'}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${colorClass || 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function UnitEconomicsPage() {
  // Business model selection
  const [model, setModel] = useState<BusinessModel>('satellite-imagery');
  const preset = PRESETS[model];

  // Revenue inputs
  const [pricePerUnit, setPricePerUnit] = useState(preset.pricePerUnit);
  const [unitsPerMonth, setUnitsPerMonth] = useState(preset.unitsPerMonth);
  const [revenueGrowthRate, setRevenueGrowthRate] = useState(preset.revenueGrowthRate);

  // CAPEX inputs
  const [satDev, setSatDev] = useState(preset.satDev);
  const [launchCosts, setLaunchCosts] = useState(preset.launchCosts);
  const [groundInfra, setGroundInfra] = useState(preset.groundInfra);
  const [regulatory, setRegulatory] = useState(preset.regulatory);

  // OPEX inputs
  const [opsStaff, setOpsStaff] = useState(preset.opsStaff);
  const [avgSalary, setAvgSalary] = useState(preset.avgSalary);
  const [groundStationCosts, setGroundStationCosts] = useState(preset.groundStationCosts);
  const [insurance, setInsurance] = useState(preset.insurance);
  const [bandwidth, setBandwidth] = useState(preset.bandwidth);
  const [softwareIT, setSoftwareIT] = useState(preset.softwareIT);
  const [marketingSales, setMarketingSales] = useState(preset.marketingSales);
  const [gaOther, setGaOther] = useState(preset.gaOther);

  // Other inputs
  const [cashOnHand, setCashOnHand] = useState(preset.cashOnHand);
  const [avgCustomerLifetimeMonths, setAvgCustomerLifetimeMonths] = useState(preset.avgCustomerLifetimeMonths);

  // Handle model change
  const handleModelChange = useCallback((newModel: BusinessModel) => {
    setModel(newModel);
    const p = PRESETS[newModel];
    setPricePerUnit(p.pricePerUnit);
    setUnitsPerMonth(p.unitsPerMonth);
    setRevenueGrowthRate(p.revenueGrowthRate);
    setSatDev(p.satDev);
    setLaunchCosts(p.launchCosts);
    setGroundInfra(p.groundInfra);
    setRegulatory(p.regulatory);
    setOpsStaff(p.opsStaff);
    setAvgSalary(p.avgSalary);
    setGroundStationCosts(p.groundStationCosts);
    setInsurance(p.insurance);
    setBandwidth(p.bandwidth);
    setSoftwareIT(p.softwareIT);
    setMarketingSales(p.marketingSales);
    setGaOther(p.gaOther);
    setCashOnHand(p.cashOnHand);
    setAvgCustomerLifetimeMonths(p.avgCustomerLifetimeMonths);
  }, []);

  // ── Calculations ────────────────────────────────────────────────

  const calculations = useMemo(() => {
    // Revenue
    const monthlyRevenue = pricePerUnit * unitsPerMonth;
    const annualRevenue = monthlyRevenue * 12;

    // 5-year projection with growth
    const yearlyRevenue: number[] = [];
    for (let y = 0; y < 5; y++) {
      yearlyRevenue.push(annualRevenue * Math.pow(1 + revenueGrowthRate / 100, y));
    }

    // CAPEX
    const totalCapex = satDev + launchCosts + groundInfra + regulatory;

    // OPEX
    const staffCost = opsStaff * avgSalary;
    const totalMonthlyOpex =
      staffCost + groundStationCosts + insurance + bandwidth + softwareIT + marketingSales + gaOther;
    const annualOpex = totalMonthlyOpex * 12;

    // Unit economics
    const costPerUnit = unitsPerMonth > 0 ? totalMonthlyOpex / unitsPerMonth : 0;
    const grossMargin = monthlyRevenue > 0
      ? ((monthlyRevenue - totalMonthlyOpex) / monthlyRevenue) * 100
      : 0;
    const contributionMargin = monthlyRevenue > 0
      ? ((pricePerUnit - costPerUnit) / pricePerUnit) * 100
      : 0;

    // Burn rate and runway
    const monthlyBurn = totalMonthlyOpex - monthlyRevenue;
    const runway = monthlyBurn > 0 ? Math.floor(cashOnHand / monthlyBurn) : Infinity;

    // CAC and LTV
    const newCustomersPerMonth = Math.max(1, Math.floor(unitsPerMonth * 0.3)); // assume 30% are new
    const cac = marketingSales > 0 ? marketingSales / newCustomersPerMonth : 0;
    const ltv = pricePerUnit * avgCustomerLifetimeMonths;
    const ltvCacRatio = cac > 0 ? ltv / cac : Infinity;

    // Break-even timeline (month by month for 60 months)
    const months = 60;
    const cumulativeRevenue: number[] = [];
    const cumulativeCosts: number[] = [];
    let breakEvenMonth = -1;
    let totalInvestmentBeforeBreakEven = 0;

    for (let m = 0; m < months; m++) {
      // Revenue grows monthly (compound monthly growth from annual rate)
      const monthlyGrowthRate = Math.pow(1 + revenueGrowthRate / 100, 1 / 12) - 1;
      const revThisMonth = monthlyRevenue * Math.pow(1 + monthlyGrowthRate, m);
      const prevCumRev = m > 0 ? cumulativeRevenue[m - 1] : 0;
      cumulativeRevenue.push(prevCumRev + revThisMonth);

      // Costs: CAPEX in month 0, then monthly OPEX
      const costThisMonth = (m === 0 ? totalCapex : 0) + totalMonthlyOpex;
      const prevCumCost = m > 0 ? cumulativeCosts[m - 1] : 0;
      cumulativeCosts.push(prevCumCost + costThisMonth);

      if (breakEvenMonth === -1 && cumulativeRevenue[m] >= cumulativeCosts[m]) {
        breakEvenMonth = m + 1; // 1-indexed month
        totalInvestmentBeforeBreakEven = cumulativeCosts[m];
      }
    }

    return {
      monthlyRevenue,
      annualRevenue,
      yearlyRevenue,
      totalCapex,
      staffCost,
      totalMonthlyOpex,
      annualOpex,
      costPerUnit,
      grossMargin,
      contributionMargin,
      monthlyBurn,
      runway,
      cac,
      ltv,
      ltvCacRatio,
      newCustomersPerMonth,
      cumulativeRevenue,
      cumulativeCosts,
      breakEvenMonth,
      totalInvestmentBeforeBreakEven,
    };
  }, [
    pricePerUnit, unitsPerMonth, revenueGrowthRate,
    satDev, launchCosts, groundInfra, regulatory,
    opsStaff, avgSalary, groundStationCosts, insurance, bandwidth, softwareIT, marketingSales, gaOther,
    cashOnHand, avgCustomerLifetimeMonths,
  ]);

  // Chart data: sample every 3 months for readability
  const chartData = useMemo(() => {
    const labels: string[] = [];
    const revenueData: number[] = [];
    const costData: number[] = [];
    for (let m = 0; m < 60; m += 3) {
      labels.push(`M${m + 1}`);
      revenueData.push(Math.round(calculations.cumulativeRevenue[m] / 1e6));
      costData.push(Math.round(calculations.cumulativeCosts[m] / 1e6));
    }
    return { labels, revenueData, costData };
  }, [calculations]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Unit Economics Calculator"
          subtitle="Model your space business economics — costs, revenue, margins, and break-even analysis"
          icon="&#128200;"
          accentColor="emerald"
          breadcrumb="Tools"
        />

        <div className="max-w-6xl mx-auto">
          {/* ── Section 1: Business Model Selector ──────────────── */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mb-8"
          >
            <motion.div variants={fadeIn} className="card p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">&#127968;</span>
                Business Model
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Select a preset or go custom</label>
                  <select
                    value={model}
                    onChange={(e) => handleModelChange(e.target.value as BusinessModel)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-200
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 cursor-pointer"
                    aria-label="Business model preset"
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 w-full">
                    <p className="text-sm text-slate-300">{preset.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      All values are editable defaults. Adjust to match your business.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* ── Section 2: Revenue Model ────────────────────── */}
            <motion.section
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="card p-6 h-full">
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <span className="text-2xl">&#128176;</span>
                  Revenue Model
                </h2>

                <Slider
                  label="Price per Unit"
                  value={pricePerUnit}
                  onChange={setPricePerUnit}
                  min={preset.priceMin}
                  max={preset.priceMax}
                  step={preset.priceStep}
                  formatValue={formatCurrency}
                />

                <Slider
                  label={preset.unitLabel}
                  value={unitsPerMonth}
                  onChange={setUnitsPerMonth}
                  min={preset.unitMin}
                  max={preset.unitMax}
                  step={1}
                />

                <Slider
                  label="Revenue Growth Rate (YoY)"
                  value={revenueGrowthRate}
                  onChange={setRevenueGrowthRate}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                />

                {/* Auto-calculated revenue */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700/50">
                    <span className="text-sm text-slate-400">Monthly Recurring Revenue</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {formatCurrency(calculations.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700/50">
                    <span className="text-sm text-slate-400">Annual Revenue</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {formatCurrency(calculations.annualRevenue)}
                    </span>
                  </div>
                </div>

                {/* 5-Year Revenue Projection */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">5-Year Revenue Projection</h3>
                  <div className="space-y-2">
                    {calculations.yearlyRevenue.map((rev, i) => {
                      const maxRev = calculations.yearlyRevenue[4] || 1;
                      const widthPercent = (rev / maxRev) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-12 shrink-0">Year {i + 1}</span>
                          <div className="flex-1 bg-slate-800/60 rounded-full h-6 relative overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${widthPercent}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white z-10">
                              {formatCurrency(rev)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.section>

            {/* ── Section 3: Cost Structure ───────────────────── */}
            <motion.section
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="card p-6 h-full">
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <span className="text-2xl">&#128184;</span>
                  Cost Structure
                </h2>

                {/* CAPEX */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    CAPEX (One-Time)
                  </h3>
                  <DollarInput
                    label="Satellite / Vehicle Development"
                    value={satDev}
                    onChange={setSatDev}
                  />
                  <DollarInput
                    label="Launch Costs"
                    value={launchCosts}
                    onChange={setLaunchCosts}
                    hint="See launch cost calculator for estimates"
                  />
                  <DollarInput
                    label="Ground Infrastructure"
                    value={groundInfra}
                    onChange={setGroundInfra}
                  />
                  <DollarInput
                    label="Regulatory / Licensing"
                    value={regulatory}
                    onChange={setRegulatory}
                  />
                  <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-2.5 mt-2">
                    <span className="text-sm text-cyan-300 font-medium">Total CAPEX</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">
                      {formatCurrency(calculations.totalCapex)}
                    </span>
                  </div>
                </div>

                {/* OPEX */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    OPEX (Monthly)
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4">
                    <div>
                      <Slider
                        label="Operations Staff"
                        value={opsStaff}
                        onChange={setOpsStaff}
                        min={1}
                        max={50}
                        step={1}
                        suffix=" people"
                      />
                    </div>
                    <div>
                      <Slider
                        label="Avg Monthly Salary"
                        value={avgSalary}
                        onChange={setAvgSalary}
                        min={5000}
                        max={25000}
                        step={500}
                        formatValue={formatCurrency}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-1.5 mb-3 border border-slate-700/30">
                    <span className="text-xs text-slate-500">Staff cost</span>
                    <span className="text-sm font-mono text-slate-300">{formatCurrency(calculations.staffCost)}/mo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <DollarInput label="Ground Station" value={groundStationCosts} onChange={setGroundStationCosts} />
                    <DollarInput label="Insurance" value={insurance} onChange={setInsurance} />
                    <DollarInput label="Bandwidth / Comms" value={bandwidth} onChange={setBandwidth} />
                    <DollarInput label="Software / IT" value={softwareIT} onChange={setSoftwareIT} />
                    <DollarInput label="Marketing / Sales" value={marketingSales} onChange={setMarketingSales} />
                    <DollarInput label="G&A / Other" value={gaOther} onChange={setGaOther} />
                  </div>

                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 mt-2">
                    <span className="text-sm text-amber-300 font-medium">Total Monthly OPEX</span>
                    <span className="text-lg font-bold font-mono text-amber-400">
                      {formatCurrency(calculations.totalMonthlyOpex)}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.section>
          </div>

          {/* ── Other Inputs ─────────────────────────────────────── */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mb-8"
          >
            <motion.div variants={fadeIn} className="card p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-xl">&#9881;</span>
                Additional Parameters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DollarInput
                  label="Cash on Hand"
                  value={cashOnHand}
                  onChange={setCashOnHand}
                  hint="Total available capital for operations"
                />
                <Slider
                  label="Avg Customer Lifetime"
                  value={avgCustomerLifetimeMonths}
                  onChange={setAvgCustomerLifetimeMonths}
                  min={1}
                  max={120}
                  step={1}
                  suffix=" months"
                />
              </div>
            </motion.div>
          </motion.section>

          {/* ── Section 4: Unit Economics Results ─────────────── */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mb-8"
          >
            <motion.div variants={fadeIn}>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">&#128202;</span>
                Unit Economics Results
              </h2>

              {/* Top metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  label="Gross Margin"
                  value={formatPercent(calculations.grossMargin)}
                  subtitle={calculations.grossMargin > 30 ? 'Healthy' : calculations.grossMargin > 10 ? 'Moderate' : 'Needs improvement'}
                  colorClass={getMarginColor(calculations.grossMargin)}
                  bgClass={`border ${getMarginBg(calculations.grossMargin)}`}
                />
                <MetricCard
                  label="Contribution Margin"
                  value={formatPercent(calculations.contributionMargin)}
                  subtitle="Per-unit profitability"
                  colorClass={getMarginColor(calculations.contributionMargin)}
                  bgClass={`border ${getMarginBg(calculations.contributionMargin)}`}
                />
                <MetricCard
                  label="Monthly Burn Rate"
                  value={calculations.monthlyBurn > 0 ? formatCurrency(calculations.monthlyBurn) : 'Profitable'}
                  subtitle={calculations.monthlyBurn > 0 ? 'OPEX exceeds revenue' : 'Revenue exceeds OPEX'}
                  colorClass={calculations.monthlyBurn > 0 ? 'text-red-400' : 'text-emerald-400'}
                  bgClass={calculations.monthlyBurn > 0
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-emerald-500/10 border border-emerald-500/30'}
                />
                <MetricCard
                  label="Runway"
                  value={
                    calculations.runway === Infinity
                      ? 'Infinite'
                      : `${calculations.runway} months`
                  }
                  subtitle={
                    calculations.runway === Infinity
                      ? 'Self-sustaining'
                      : calculations.runway > 24
                        ? 'Comfortable'
                        : calculations.runway > 12
                          ? 'Watch closely'
                          : 'Critical'
                  }
                  colorClass={
                    calculations.runway === Infinity || calculations.runway > 24
                      ? 'text-emerald-400'
                      : calculations.runway > 12
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                />
              </div>

              {/* Bottom metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  label="Break-Even Point"
                  value={
                    calculations.breakEvenMonth > 0
                      ? `Month ${calculations.breakEvenMonth}`
                      : 'Not within 5 years'
                  }
                  subtitle={
                    calculations.breakEvenMonth > 0
                      ? `~${Math.ceil(calculations.breakEvenMonth / 12)} year${Math.ceil(calculations.breakEvenMonth / 12) > 1 ? 's' : ''}`
                      : 'Adjust revenue or costs'
                  }
                  colorClass={
                    calculations.breakEvenMonth > 0 && calculations.breakEvenMonth <= 24
                      ? 'text-emerald-400'
                      : calculations.breakEvenMonth > 0
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                />
                <MetricCard
                  label="CAC"
                  value={formatCurrency(calculations.cac)}
                  subtitle={`~${calculations.newCustomersPerMonth} new customers/mo`}
                  colorClass="text-cyan-400"
                />
                <MetricCard
                  label="Customer LTV"
                  value={formatCurrency(calculations.ltv)}
                  subtitle={`${avgCustomerLifetimeMonths} month lifetime`}
                  colorClass="text-purple-400"
                />
                <MetricCard
                  label="LTV / CAC Ratio"
                  value={
                    calculations.ltvCacRatio === Infinity
                      ? 'N/A'
                      : `${calculations.ltvCacRatio.toFixed(1)}x`
                  }
                  subtitle={
                    calculations.ltvCacRatio >= 3
                      ? 'Healthy (target: > 3x)'
                      : calculations.ltvCacRatio >= 1
                        ? 'Needs improvement (target: > 3x)'
                        : 'Unsustainable'
                  }
                  colorClass={getLTVCACColor(calculations.ltvCacRatio === Infinity ? 0 : calculations.ltvCacRatio)}
                />
              </div>

              {/* Summary table */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Financial Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <tbody>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Revenue / Unit</td>
                        <td className="py-2 text-right font-mono text-slate-200">{formatCurrencyFull(pricePerUnit)}</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Cost / Unit (OPEX)</td>
                        <td className="py-2 text-right font-mono text-slate-200">{formatCurrencyFull(calculations.costPerUnit)}</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Monthly Revenue</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{formatCurrencyFull(calculations.monthlyRevenue)}</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Monthly OPEX</td>
                        <td className="py-2 text-right font-mono text-amber-400">{formatCurrencyFull(calculations.totalMonthlyOpex)}</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Annual Revenue (Year 1)</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{formatCurrencyFull(calculations.annualRevenue)}</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 text-slate-400">Annual OPEX</td>
                        <td className="py-2 text-right font-mono text-amber-400">{formatCurrencyFull(calculations.annualOpex)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-400">Total CAPEX</td>
                        <td className="py-2 text-right font-mono text-cyan-400">{formatCurrencyFull(calculations.totalCapex)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.section>

          {/* ── Section 5: Break-Even Timeline ───────────────── */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mb-8"
          >
            <motion.div variants={fadeIn} className="card p-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-2xl">&#128200;</span>
                Break-Even Timeline
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Cumulative revenue vs. cumulative costs over 60 months (values in $M)
              </p>

              {/* Break-even highlight */}
              {calculations.breakEvenMonth > 0 ? (
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Break-even reached</p>
                    <p className="text-2xl font-bold font-mono text-emerald-400">Month {calculations.breakEvenMonth}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ~{(calculations.breakEvenMonth / 12).toFixed(1)} years from launch
                    </p>
                  </div>
                  <div className="flex-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                    <p className="text-xs text-cyan-300 uppercase tracking-wider mb-1">Total investment needed</p>
                    <p className="text-2xl font-bold font-mono text-cyan-400">
                      {formatCurrency(calculations.totalInvestmentBeforeBreakEven)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Cumulative costs at break-even</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-300">
                    Break-even is not reached within the 60-month projection window. Consider adjusting pricing,
                    volume, or cost structure.
                  </p>
                </div>
              )}

              {/* Chart */}
              <LineChart
                series={[
                  { name: 'Cumulative Revenue', data: chartData.revenueData, color: 'emerald' },
                  { name: 'Cumulative Costs', data: chartData.costData, color: 'amber' },
                ]}
                labels={chartData.labels}
                title=""
                height={320}
                showGrid
                showLegend
                yAxisLabel="$ Millions"
                xAxisLabel="Month"
              />

              {/* Month-by-month table (first 24 months, sampled) */}
              <details className="mt-6 group">
                <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                  View month-by-month details (first 24 months)
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs" role="table">
                    <thead>
                      <tr className="text-left border-b border-slate-700">
                        <th className="py-2 text-slate-400 font-medium">Month</th>
                        <th className="py-2 text-right text-slate-400 font-medium">Cum. Revenue</th>
                        <th className="py-2 text-right text-slate-400 font-medium">Cum. Costs</th>
                        <th className="py-2 text-right text-slate-400 font-medium">Net Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 24 }, (_, m) => {
                        const net = calculations.cumulativeRevenue[m] - calculations.cumulativeCosts[m];
                        return (
                          <tr
                            key={m}
                            className={`border-b border-slate-800/50 ${
                              calculations.breakEvenMonth === m + 1
                                ? 'bg-emerald-500/10'
                                : ''
                            }`}
                          >
                            <td className="py-1.5 text-slate-300">
                              {m + 1}
                              {calculations.breakEvenMonth === m + 1 && (
                                <span className="ml-2 text-emerald-400 text-[10px] uppercase font-bold">Break-even</span>
                              )}
                            </td>
                            <td className="py-1.5 text-right font-mono text-emerald-400">
                              {formatCurrency(calculations.cumulativeRevenue[m])}
                            </td>
                            <td className="py-1.5 text-right font-mono text-amber-400">
                              {formatCurrency(calculations.cumulativeCosts[m])}
                            </td>
                            <td className={`py-1.5 text-right font-mono ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {net >= 0 ? '+' : ''}{formatCurrency(net)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </motion.div>
          </motion.section>

          {/* ── Related Tools ─────────────────────────────────── */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeIn}>
              <h2 className="text-xl font-bold text-white mb-4">Related Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/launch-cost-calculator" className="card p-5 hover:ring-2 hover:ring-emerald-500/50 transition-all group">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">
                    Launch Cost Calculator
                  </h3>
                  <p className="text-slate-400 text-xs">Estimate launch costs to feed into your CAPEX model.</p>
                </Link>
                <Link href="/market-sizing" className="card p-5 hover:ring-2 hover:ring-emerald-500/50 transition-all group">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">
                    Market Sizing (TAM/SAM/SOM)
                  </h3>
                  <p className="text-slate-400 text-xs">Validate your revenue assumptions with market data.</p>
                </Link>
                <Link href="/space-insurance" className="card p-5 hover:ring-2 hover:ring-emerald-500/50 transition-all group">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">
                    Space Insurance Estimator
                  </h3>
                  <p className="text-slate-400 text-xs">Estimate insurance premiums for your OPEX budget.</p>
                </Link>
              </div>
            </motion.div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
