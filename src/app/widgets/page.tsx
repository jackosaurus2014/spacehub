'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MarketPreviewData {
  type: 'market';
  label: string;
  items: { symbol: string; change: string; positive: boolean }[];
}

interface LaunchPreviewData {
  type: 'launch';
  label: string;
  mission: string;
  countdown: string;
  rocket: string;
  agency: string;
  location: string;
}

interface WeatherPreviewData {
  type: 'weather';
  label: string;
  kp: number;
  windSpeed: number;
  alertLevel: string;
}

type PreviewData = MarketPreviewData | LaunchPreviewData | WeatherPreviewData;

interface WidgetConfig {
  name: string;
  slug: string;
  description: string;
  embedCode: string;
  preview: PreviewData;
}

const widgets: WidgetConfig[] = [
  {
    name: 'Market Snapshot Widget',
    slug: 'market-snapshot',
    description: 'Shows space stock market overview with top movers, trend indicators, and percentage changes. Perfect for finance and space industry blogs.',
    embedCode: '<iframe src="https://spacenexus.us/widgets/market-snapshot" width="400" height="300" frameborder="0" style="border-radius:12px;overflow:hidden;"></iframe>',
    preview: {
      type: 'market',
      label: 'Market Snapshot',
      items: [
        { symbol: 'RKLB', change: '+4.2%', positive: true },
        { symbol: 'ASTS', change: '+2.8%', positive: true },
        { symbol: 'PL', change: '-1.3%', positive: false },
        { symbol: 'LUNR', change: '+6.1%', positive: true },
      ],
    },
  },
  {
    name: 'Next Launch Countdown',
    slug: 'next-launch',
    description: 'Live countdown timer to the next rocket launch with mission name, rocket type, launch provider, and pad location. Auto-updates in real time.',
    embedCode: '<iframe src="https://spacenexus.us/widgets/next-launch" width="400" height="300" frameborder="0" style="border-radius:12px;overflow:hidden;"></iframe>',
    preview: {
      type: 'launch',
      label: 'Next Launch',
      mission: 'Starlink Group 12-7',
      countdown: 'T-2d 14h 32m',
      rocket: 'Falcon 9',
      agency: 'SpaceX',
      location: 'Cape Canaveral SLC-40',
    },
  },
  {
    name: 'Space Weather Widget',
    slug: 'space-weather',
    description: 'Current solar activity, geomagnetic Kp index, solar wind speed, and alert level. Essential for satellite operators, HAM radio enthusiasts, and aurora chasers.',
    embedCode: '<iframe src="https://spacenexus.us/widgets/space-weather" width="400" height="300" frameborder="0" style="border-radius:12px;overflow:hidden;"></iframe>',
    preview: {
      type: 'weather',
      label: 'Space Weather',
      kp: 3,
      windSpeed: 412,
      alertLevel: 'nominal',
    },
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/10 text-white hover:bg-white/15 border border-white/10 hover:border-white/20'
      }`}
    >
      {copied ? (
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Code
        </span>
      )}
    </button>
  );
}

function MarketPreview({ data }: { data: MarketPreviewData }) {
  return (
    <div className="p-5">
      <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mb-3">
        {data.label}
      </div>
      <div className="space-y-2">
        {data.items.map((item) => (
          <div key={item.symbol} className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-200">{item.symbol}</span>
            <span className={`text-xs font-bold tabular-nums ${item.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchPreview({ data }: { data: LaunchPreviewData }) {
  return (
    <div className="p-5">
      <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mb-3">
        {data.label}
      </div>
      <div className="text-sm font-bold text-slate-200 mb-1">{data.mission}</div>
      <div className="text-2xl font-extrabold text-cyan-400 tabular-nums mb-3">{data.countdown}</div>
      <div className="space-y-1 text-[11px] text-slate-400 leading-relaxed">
        <div>Rocket: {data.rocket}</div>
        <div>Provider: {data.agency}</div>
        <div>Pad: {data.location}</div>
      </div>
    </div>
  );
}

function WeatherPreview({ data }: { data: WeatherPreviewData }) {
  return (
    <div className="p-5">
      <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mb-3">
        {data.label}
      </div>
      <div className="flex gap-6 mb-3">
        <div>
          <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">Kp {data.kp}</div>
          <div className="text-[10px] text-slate-500">Geomagnetic</div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-200 tabular-nums">{data.windSpeed}</div>
          <div className="text-[10px] text-slate-500">km/s wind</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        <span className="text-[11px] text-slate-400 capitalize">{data.alertLevel}</span>
      </div>
    </div>
  );
}

function WidgetPreview({ widget }: { widget: WidgetConfig }) {
  const data = widget.preview;
  switch (data.type) {
    case 'market': return <MarketPreview data={data} />;
    case 'launch': return <LaunchPreview data={data} />;
    case 'weather': return <WeatherPreview data={data} />;
    default: return null;
  }
}

export default function WidgetsLandingPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Embeddable Space Widgets
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Add real-time space data to your website with our free embeddable widgets.
            Just copy the iframe code and paste it into your site.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6 text-xs text-slate-400">
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">Free to use</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">Auto-updating</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">Responsive</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">No API key needed</span>
          </div>
        </header>

        {/* Widget Cards */}
        <div className="space-y-12">
          {widgets.map((widget, index) => (
            <div
              key={widget.slug}
              className="card overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Preview Side */}
                <div className="bg-black/40 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col">
                  <div className="px-5 pt-4 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      <span className="ml-3 text-[10px] text-slate-500 font-mono">
                        spacenexus.us/widgets/{widget.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-[300px] bg-black/60 border border-white/[0.08] rounded-xl">
                      <WidgetPreview widget={widget} />
                    </div>
                  </div>
                  <div className="px-5 pb-4 text-center">
                    <Link
                      href={`/widgets/${widget.slug}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View live widget &rarr;
                    </Link>
                  </div>
                </div>

                {/* Info Side */}
                <div className="p-6 lg:p-8 flex flex-col justify-center">
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                    Widget {index + 1} of {widgets.length}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3">
                    {widget.name}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {widget.description}
                  </p>

                  {/* Embed Code */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Embed Code
                    </div>
                    <div className="bg-black/40 border border-white/[0.08] rounded-lg p-3 font-mono text-xs text-slate-300 break-all leading-relaxed select-all">
                      {widget.embedCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CopyButton text={widget.embedCode} />
                    <Link
                      href={`/widgets/${widget.slug}`}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <section className="mt-16 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Choose a Widget',
                description: 'Pick from our collection of real-time space data widgets. Each displays live data from SpaceNexus.',
              },
              {
                step: '2',
                title: 'Copy the Code',
                description: 'Click "Copy Code" to copy the iframe embed snippet to your clipboard. Customize width and height as needed.',
              },
              {
                step: '3',
                title: 'Paste & Publish',
                description: 'Add the code to your website, blog, or dashboard. The widget auto-updates with live data from SpaceNexus.',
              },
            ].map((item) => (
              <div key={item.step} className="card p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-sm font-bold text-cyan-400">{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Who Uses SpaceNexus Widgets?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Space Blogs', desc: 'Enrich space news sites with live launch countdowns and market data.' },
              { title: 'Company Dashboards', desc: 'Add space weather and launch awareness to internal operations screens.' },
              { title: 'Educational Sites', desc: 'Give students and enthusiasts real-time space activity at a glance.' },
              { title: 'Trading Platforms', desc: 'Show space stock market movements alongside your portfolio tools.' },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-10">
          <div className="card p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Want more space data on your site?
            </h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm">
              SpaceNexus offers a full API for developers who need deeper integration.
              Track launches, satellites, companies, and more programmatically.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="btn-primary text-sm py-3 px-6">
                Create Free Account
              </Link>
              <Link href="/features" className="btn-secondary text-sm py-3 px-6">
                Explore All Features
              </Link>
            </div>
          </div>
        </section>

        {/* Attribution note */}
        <div className="text-center text-xs text-slate-500">
          Widgets are free for non-commercial and commercial use. A SpaceNexus watermark is included.
          <br />
          For white-label or custom widget solutions, <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 transition-colors">contact us</Link>.
        </div>
      </div>
    </div>
  );
}
