'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PRESET_LAYOUTS,
  DEFAULT_SECTIONS,
  getLayoutPreference,
  applyPreset,
  applyCustomLayout,
  resetLayout,
  type LayoutGridColumns,
  type ModuleSize,
  type DashboardSection,
  type LayoutPreset,
} from '@/lib/dashboard-layouts';

interface DashboardLayoutSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onLayoutChange: () => void;
}

export default function DashboardLayoutSelector({
  isOpen,
  onClose,
  onLayoutChange,
}: DashboardLayoutSelectorProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customGridColumns, setCustomGridColumns] = useState<LayoutGridColumns>(2);
  const [customModuleSize, setCustomModuleSize] = useState<ModuleSize>('standard');
  const [customSections, setCustomSections] = useState<DashboardSection[]>(DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);

  // Load current preferences on mount
  useEffect(() => {
    const preference = getLayoutPreference();
    if (preference) {
      if (preference.presetId) {
        setSelectedPreset(preference.presetId);
        setActiveTab('presets');
      } else if (preference.customConfig) {
        setCustomGridColumns(preference.customConfig.gridColumns);
        setCustomModuleSize(preference.customConfig.moduleSize);
        setCustomSections(preference.customConfig.sections);
        setActiveTab('custom');
      }
    } else {
      setSelectedPreset('detailed');
    }
  }, [isOpen]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const handleApplyPreset = async () => {
    if (!selectedPreset) return;
    setSaving(true);
    try {
      applyPreset(selectedPreset);
      onLayoutChange();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustom = async () => {
    setSaving(true);
    try {
      applyCustomLayout({
        gridColumns: customGridColumns,
        moduleSize: customModuleSize,
        sections: customSections,
      });
      onLayoutChange();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetLayout();
    setSelectedPreset('detailed');
    setActiveTab('presets');
    onLayoutChange();
  };

  const toggleSection = (sectionId: string) => {
    setCustomSections(sections =>
      sections.map(s =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-space-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-space-900/95 backdrop-blur-xl border border-space-600/50 rounded-2xl shadow-2xl shadow-space-950/50 animate-scale-in">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-plasma-400/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-space-600/50">
          <div>
            <h2 className="text-xl font-display font-bold text-white">Dashboard Layout</h2>
            <p className="text-star-300 text-sm mt-1">Customize how your dashboard looks</p>
          </div>
          <button
            onClick={onClose}
            className="text-star-300 hover:text-white transition-colors p-2 hover:bg-space-700/50 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-space-600/50">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-all ${
              activeTab === 'presets'
                ? 'text-plasma-400 border-b-2 border-plasma-400 bg-space-800/50'
                : 'text-star-300 hover:text-white hover:bg-space-800/30'
            }`}
          >
            Preset Layouts
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-all ${
              activeTab === 'custom'
                ? 'text-plasma-400 border-b-2 border-plasma-400 bg-space-800/50'
                : 'text-star-300 hover:text-white hover:bg-space-800/30'
            }`}
          >
            Custom Layout
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          {activeTab === 'presets' ? (
            <div className="space-y-4">
              {PRESET_LAYOUTS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onSelect={() => setSelectedPreset(preset.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid Columns */}
              <div>
                <label className="block text-sm font-medium text-star-200 mb-3">
                  Grid Columns
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([1, 2, 3] as LayoutGridColumns[]).map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setCustomGridColumns(cols)}
                      className={`p-4 rounded-lg border transition-all ${
                        customGridColumns === cols
                          ? 'border-plasma-400 bg-plasma-500/10 text-white'
                          : 'border-space-600/50 bg-space-800/30 text-star-300 hover:border-space-500'
                      }`}
                    >
                      <div className="flex justify-center gap-1 mb-2">
                        {Array.from({ length: cols }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-8 rounded ${
                              customGridColumns === cols
                                ? 'bg-plasma-400/40'
                                : 'bg-space-600/50'
                            }`}
                            style={{ width: `${100 / cols - 4}%` }}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{cols} Column{cols > 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Size */}
              <div>
                <label className="block text-sm font-medium text-star-200 mb-3">
                  Module Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['compact', 'standard', 'expanded'] as ModuleSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setCustomModuleSize(size)}
                      className={`p-4 rounded-lg border transition-all ${
                        customModuleSize === size
                          ? 'border-plasma-400 bg-plasma-500/10 text-white'
                          : 'border-space-600/50 bg-space-800/30 text-star-300 hover:border-space-500'
                      }`}
                    >
                      <div
                        className={`mx-auto mb-2 rounded bg-space-600/50 ${
                          size === 'compact'
                            ? 'w-8 h-6'
                            : size === 'standard'
                            ? 'w-10 h-8'
                            : 'w-12 h-10'
                        } ${customModuleSize === size ? 'bg-plasma-400/40' : ''}`}
                      />
                      <span className="text-sm capitalize">{size}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections Visibility */}
              <div>
                <label className="block text-sm font-medium text-star-200 mb-3">
                  Visible Sections
                </label>
                <div className="space-y-2">
                  {customSections.map((section) => (
                    <label
                      key={section.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-space-600/50 bg-space-800/30 cursor-pointer hover:border-space-500 transition-all"
                    >
                      <span className="text-star-200">{section.name}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={section.visible}
                          onChange={() => toggleSection(section.id)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-space-600 rounded-full peer-checked:bg-plasma-500 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-space-600/50 bg-space-800/30">
          <button
            onClick={handleReset}
            className="text-star-300 hover:text-white text-sm transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-star-300 hover:text-white border border-space-600/50 rounded-lg hover:border-space-500 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'presets' ? handleApplyPreset : handleApplyCustom}
              disabled={saving || (activeTab === 'presets' && !selectedPreset)}
              className="px-6 py-2 text-sm font-medium text-space-900 bg-gradient-to-r from-plasma-400 to-plasma-500 rounded-lg hover:from-plasma-300 hover:to-plasma-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-plasma-500/20"
            >
              {saving ? 'Applying...' : 'Apply Layout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PresetCardProps {
  preset: LayoutPreset;
  isSelected: boolean;
  onSelect: () => void;
}

function PresetCard({ preset, isSelected, onSelect }: PresetCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-plasma-400 bg-plasma-500/10 shadow-lg shadow-plasma-500/10'
          : 'border-space-600/50 bg-space-800/30 hover:border-space-500'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`w-24 h-16 rounded-lg bg-space-700/50 flex items-center justify-center p-2 ${
            isSelected ? 'border border-plasma-400/30' : ''
          }`}
        >
          <LayoutPreview preset={preset} isSelected={isSelected} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{preset.icon}</span>
            <h3 className="text-white font-semibold">{preset.name}</h3>
            {isSelected && (
              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-plasma-500/20 text-plasma-300 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-star-300 text-sm mt-1">{preset.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs bg-space-700/50 text-star-200 rounded">
              {preset.gridColumns} Column{preset.gridColumns > 1 ? 's' : ''}
            </span>
            <span className="px-2 py-0.5 text-xs bg-space-700/50 text-star-200 rounded capitalize">
              {preset.moduleSize}
            </span>
            <span className="px-2 py-0.5 text-xs bg-space-700/50 text-star-200 rounded">
              {preset.sections.filter((s) => s.visible).length} Sections
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function LayoutPreview({ preset, isSelected }: { preset: LayoutPreset; isSelected: boolean }) {
  const cols = preset.gridColumns;
  const size = preset.moduleSize === 'compact' ? 1 : preset.moduleSize === 'standard' ? 2 : 3;

  return (
    <div className="w-full h-full flex flex-col gap-0.5">
      {/* Header row */}
      <div
        className={`w-full h-1.5 rounded-sm ${
          isSelected ? 'bg-plasma-400/50' : 'bg-space-500/50'
        }`}
      />
      {/* Content grid */}
      <div className={`flex-1 grid gap-0.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-sm ${isSelected ? 'bg-plasma-400/30' : 'bg-space-500/30'}`}
            style={{ height: `${size * 3}px` }}
          />
        ))}
      </div>
    </div>
  );
}
