'use client';

import { useState } from 'react';
import { DEFAULT_LAYOUTS, type LayoutPreset } from '@/lib/dashboard/default-layouts';

interface LayoutData {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  widgetCount: number;
  updatedAt: string;
}

interface LayoutSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  layouts: LayoutData[];
  activeLayoutId: string | null;
  onSelectLayout: (layoutId: string) => void;
  onCreateFromPreset: (preset: LayoutPreset) => void;
  onCreateBlank: () => void;
  onDeleteLayout: (layoutId: string) => void;
  onSetDefault: (layoutId: string) => void;
  canCreate: boolean;
  tier: string;
  layoutLimit: number;
}

/**
 * LayoutSelector - Modal/dropdown to manage dashboard layouts.
 * Switch between layouts, create from presets or blank, delete, and set default.
 */
export default function LayoutSelector({
  isOpen,
  onClose,
  layouts,
  activeLayoutId,
  onSelectLayout,
  onCreateFromPreset,
  onCreateBlank,
  onDeleteLayout,
  onSetDefault,
  canCreate,
  tier,
  layoutLimit,
}: LayoutSelectorProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {showPresets ? 'Choose a Template' : 'Dashboard Layouts'}
            </h2>
            <p className="text-sm text-slate-500">
              {showPresets
                ? 'Start with a pre-built layout'
                : `${layouts.length}/${layoutLimit || 'unlimited'} layouts (${tier} tier)`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showPresets ? (
            <>
              <button
                onClick={() => setShowPresets(false)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to layouts
              </button>

              <div className="space-y-3">
                {DEFAULT_LAYOUTS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onCreateFromPreset(preset);
                      setShowPresets(false);
                    }}
                    className="w-full p-4 rounded-xl border border-slate-200 hover:border-cyan-400/50 hover:bg-cyan-50/20 text-left transition-all"
                  >
                    <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{preset.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {preset.widgets.length} widget{preset.widgets.length !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}

                {/* Blank layout option */}
                <button
                  onClick={() => {
                    onCreateBlank();
                    setShowPresets(false);
                  }}
                  className="w-full p-4 rounded-xl border border-dashed border-slate-300 hover:border-cyan-400/50 hover:bg-cyan-50/20 text-left transition-all"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Blank Dashboard</p>
                      <p className="text-xs text-slate-500">Start from scratch</p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Existing layouts */}
              {layouts.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`
                        p-4 rounded-xl border transition-all
                        ${
                          layout.id === activeLayoutId
                            ? 'border-cyan-400/50 bg-cyan-500/10'
                            : 'border-slate-600/50 hover:border-slate-500/50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onSelectLayout(layout.id)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-100">{layout.name}</p>
                            {layout.isDefault && (
                              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                            {layout.id === activeLayoutId && (
                              <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          {layout.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{layout.description}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {layout.widgetCount} widget{layout.widgetCount !== 1 ? 's' : ''}
                          </p>
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          {!layout.isDefault && (
                            <button
                              onClick={() => onSetDefault(layout.id)}
                              className="text-xs text-slate-400 hover:text-cyan-500 p-1 rounded"
                              title="Set as default"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          )}
                          {deleteConfirm === layout.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteLayout(layout.id);
                                  setDeleteConfirm(null);
                                }}
                                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-slate-500 px-2 py-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(layout.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded"
                              title="Delete layout"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-4">
                  <p className="text-slate-400 text-sm">No layouts yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Create one from a template or start blank
                  </p>
                </div>
              )}

              {/* Create new layout button */}
              {canCreate && (
                <button
                  onClick={() => setShowPresets(true)}
                  className="w-full p-4 rounded-xl border border-dashed border-slate-300 hover:border-cyan-400/50 hover:bg-cyan-50/20 text-center transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium text-cyan-600">New Layout</span>
                  </div>
                </button>
              )}

              {!canCreate && layouts.length > 0 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Upgrade to {tier === 'pro' ? 'Enterprise' : 'Pro'} for more layouts
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
