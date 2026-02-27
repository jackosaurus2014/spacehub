'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import {
  DASHBOARD_TEMPLATES,
  saveSelectedTemplate,
  getSelectedTemplateId,
  getWidgetTypeIcon,
  getWidgetSizeLabel,
  type DashboardTemplate,
} from '@/lib/dashboard/templates';

/** Size-to-color mapping for widget preview badges */
const SIZE_COLORS: Record<string, string> = {
  small: 'bg-slate-700/60 text-slate-300',
  medium: 'bg-cyan-900/40 text-cyan-300',
  large: 'bg-purple-900/40 text-purple-300',
};

function WidgetPreview({ widget }: { widget: DashboardTemplate['widgets'][0] }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-slate-800/60 border border-slate-700/30">
      <span className="flex-shrink-0">{getWidgetTypeIcon(widget.type)}</span>
      <span className="text-slate-300 truncate flex-1">{widget.title}</span>
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SIZE_COLORS[widget.size] || SIZE_COLORS.medium}`}>
        {getWidgetSizeLabel(widget.size)}
      </span>
    </div>
  );
}

function TemplateCard({
  template,
  isActive,
  onSelect,
}: {
  template: DashboardTemplate;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`relative group bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 ${
        isActive
          ? 'border-cyan-400/60 ring-2 ring-cyan-400/20 shadow-lg shadow-cyan-500/10'
          : 'border-slate-700/50 hover:border-cyan-400/30'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-300">Active</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 flex items-center justify-center text-3xl flex-shrink-0">
          {template.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
            {template.name}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      {/* Persona tag */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/40">
          Best for: {template.persona.charAt(0).toUpperCase() + template.persona.slice(1)}s
        </span>
      </div>

      {/* Widget preview list */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {template.widgets.length} Widgets Included
        </p>
        <div className="space-y-1.5">
          {template.widgets.map((widget) => (
            <WidgetPreview key={widget.id} widget={widget} />
          ))}
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={() => onSelect(template.id)}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
          isActive
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 cursor-default'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-md hover:shadow-lg hover:shadow-cyan-500/20'
        }`}
        disabled={isActive}
      >
        {isActive ? 'Currently Active' : 'Use This Template'}
      </button>
    </div>
  );
}

export default function DashboardTemplatesPage() {
  const router = useRouter();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return getSelectedTemplateId();
    }
    return null;
  });
  const [justActivated, setJustActivated] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    saveSelectedTemplate(templateId);
    setActiveTemplateId(templateId);
    setJustActivated(templateId);

    // Brief delay to show the activation feedback, then redirect
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Page header */}
        <AnimatedPageHeader
          title="Dashboard Templates"
          subtitle="Choose a pre-configured dashboard view tailored to your role. Each template includes curated widgets to help you focus on what matters most."
          accentColor="cyan"
          breadcrumb="Dashboard"
        />

        {/* Description cards */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-lg flex-shrink-0">
                {'\u{1F3AF}'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Role-Optimized</p>
                <p className="text-xs text-slate-400 mt-0.5">Widgets curated for your specific use case and workflow</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg flex-shrink-0">
                {'\u{26A1}'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Instant Setup</p>
                <p className="text-xs text-slate-400 mt-0.5">One click to activate -- no configuration required</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0">
                {'\u{1F504}'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Switch Anytime</p>
                <p className="text-xs text-slate-400 mt-0.5">Change templates whenever your needs evolve</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Template grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {DASHBOARD_TEMPLATES.map((template, index) => (
            <ScrollReveal key={template.id} delay={0.15 + index * 0.1}>
              <TemplateCard
                template={template}
                isActive={activeTemplateId === template.id}
                onSelect={handleSelectTemplate}
              />
              {/* Activation success overlay */}
              {justActivated === template.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-none animate-fade-in">
                  <div className="bg-slate-800 border border-cyan-400/40 rounded-2xl p-8 text-center shadow-2xl shadow-cyan-500/20">
                    <div className="text-5xl mb-3">{template.icon}</div>
                    <p className="text-lg font-bold text-white mb-1">{template.name} Activated</p>
                    <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
                  </div>
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom note */}
        <ScrollReveal delay={0.6}>
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              Want more control? Use the{' '}
              <Link href="/dashboard/builder" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                Dashboard Builder
              </Link>{' '}
              to create a fully custom layout with any widgets you choose.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
