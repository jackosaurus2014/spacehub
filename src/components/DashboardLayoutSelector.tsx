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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 animate-scale-in">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-xl font-display font-bold text-white">Dashboard Layout</h2>
            <p className="text-star-300 text-sm mt-1">Customize how your dashboard looks</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close layout selector"
            className="text-star-300 hover:text-white transition-colors p-2 hover:bg-white/[0.06] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-all ${
              activeTab === 'presets'
                ? 'text-white border-b-2 border-white bg-white/[0.04]'
                : 'text-star-300 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            Preset Layouts
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 px-6 text-sm font-medium transition-all ${
              activeTab === 'custom'
                ? 'text-white border-b-2 border-white bg-white/[0.04]'
                : 'text-star-300 hover:text-white hover:bg-white/[0.02]'
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
                          ? 'border-white/30 bg-white/[0.08] text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-star-300 hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="flex justify-center gap-1 mb-2">
                        {Array.from({ length: cols }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-8 rounded ${
                              customGridColumns === cols
                                ? 'bg-white/30'
                                : 'bg-white/[0.08]'
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
                          ? 'border-white/30 bg-white/[0.08] text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-star-300 hover:border-white/[0.1]'
                      }`}
                    >
                      <div
                        className={`mx-auto mb-2 rounded ${
                          size === 'compact'
                            ? 'w-8 h-6'
                            : size === 'standard'
                            ? 'w-10 h-8'
                            : 'w-12 h-10'
                        } ${customModuleSize === size ? 'bg-white/30' : 'bg-white/[0.08]'}`}
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
                      className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-white/[0.1] transition-all"
                    >
                      <span className="text-star-200">{section.name}</span>
                      <div className="relative overflow-hidden rounded-full">
                        <input
                          type="checkbox"
                          checked={section.visible}
                          onChange={() => toggleSection(section.id)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-white/20 rounded-full peer-checked:bg-white transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform bg-white peer-checked:bg-black peer-checked:translate-x-5" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/[0.06] bg-white/[0.02]">
          <button
            onClick={handleReset}
            className="text-star-300 hover:text-white text-sm transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-star-300 hover:text-white border border-white/[0.06] rounded-lg hover:border-white/[0.1] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'presets' ? handleApplyPreset : handleApplyCustom}
              disabled={saving || (activeTab === 'presets' && !selectedPreset)}
              className="px-6 py-2 text-sm font-medium text-black bg-gradient-to-r from-white to-white/80 rounded-lg hover:from-white hover:to-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
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
          ? 'border-white/30 bg-white/[0.08] shadow-lg shadow-white/5'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`w-24 h-16 rounded-lg bg-white/[0.06] flex items-center justify-center p-2 ${
            isSelected ? 'border border-white/[0.1]' : ''
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
              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-white/[0.08] text-white/60 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-star-300 text-sm mt-1">{preset.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs bg-white/[0.06] text-star-200 rounded">
              {preset.gridColumns} Column{preset.gridColumns > 1 ? 's' : ''}
            </span>
            <span className="px-2 py-0.5 text-xs bg-white/[0.06] text-star-200 rounded capitalize">
              {preset.moduleSize}
            </span>
            <span className="px-2 py-0.5 text-xs bg-white/[0.06] text-star-200 rounded">
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
          isSelected ? 'bg-white/40' : 'bg-white/20'
        }`}
      />
      {/* Content grid */}
      <div className={`flex-1 grid gap-0.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-sm ${isSelected ? 'bg-white/20' : 'bg-white/10'}`}
            style={{ height: `${size * 3}px` }}
          />
        ))}
      </div>
    </div>
  );
}
