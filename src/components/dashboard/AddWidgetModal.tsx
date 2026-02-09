'use client';

import { useState, useMemo } from 'react';
import {
  WIDGET_REGISTRY,
  WIDGET_TYPE_LABELS,
  WIDGET_TYPE_DESCRIPTIONS,
  getWidgetDefinition,
} from '@/lib/dashboard/widget-registry';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widget: {
    moduleId: string;
    widgetType: string;
    w: number;
    h: number;
  }) => void;
  existingModuleIds?: string[];
}

/**
 * Modal to add a new widget to the dashboard.
 * Shows available modules with icons, lets user select widget type,
 * shows a preview, and adds to dashboard.
 */
export default function AddWidgetModal({
  isOpen,
  onClose,
  onAdd,
  existingModuleIds = [],
}: AddWidgetModalProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const modules = useMemo(() => {
    return Object.values(WIDGET_REGISTRY)
      .filter((def) => {
        if (!searchQuery) return true;
        return (
          def.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          def.moduleId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [searchQuery]);

  const selectedDef = selectedModule ? getWidgetDefinition(selectedModule) : null;

  const handleAdd = () => {
    if (!selectedModule || !selectedType) return;

    const def = getWidgetDefinition(selectedModule);
    onAdd({
      moduleId: selectedModule,
      widgetType: selectedType,
      w: Math.min(def.maxWidth, 6),
      h: Math.min(def.maxHeight, 4),
    });

    // Reset state
    setSelectedModule(null);
    setSelectedType(null);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedModule(null);
    setSelectedType(null);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Widget</h2>
            <p className="text-sm text-slate-500">
              {selectedModule
                ? 'Choose a display type'
                : 'Select a module to add to your dashboard'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedModule ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 text-sm"
                  autoFocus
                />
              </div>

              {/* Module grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {modules.map((def) => {
                  const alreadyAdded = existingModuleIds.includes(def.moduleId);
                  return (
                    <button
                      key={def.moduleId}
                      onClick={() => {
                        setSelectedModule(def.moduleId);
                        setSelectedType(def.defaultType);
                      }}
                      className={`
                        p-4 rounded-xl border text-left transition-all
                        ${
                          alreadyAdded
                            ? 'border-slate-200 bg-slate-50 opacity-60'
                            : 'border-slate-200 hover:border-cyan-400/50 hover:bg-cyan-50/30 hover:shadow-sm'
                        }
                      `}
                    >
                      <span className="text-2xl block mb-2">{def.icon}</span>
                      <p className="text-sm font-semibold text-slate-900">{def.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {def.supportedTypes.length} view{def.supportedTypes.length !== 1 ? 's' : ''}
                        {alreadyAdded && ' (added)'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {modules.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  No modules found matching &quot;{searchQuery}&quot;
                </p>
              )}
            </>
          ) : (
            <>
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedModule(null);
                  setSelectedType(null);
                }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modules
              </button>

              {/* Selected module info */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{selectedDef?.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDef?.label}</h3>
                  <p className="text-sm text-slate-500">
                    Select how you want this module displayed
                  </p>
                </div>
              </div>

              {/* Widget type selection */}
              <div className="space-y-2">
                {selectedDef?.supportedTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`
                      w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4
                      ${
                        selectedType === type
                          ? 'border-cyan-400 bg-cyan-50/50 ring-1 ring-cyan-400/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {WIDGET_TYPE_LABELS[type as keyof typeof WIDGET_TYPE_LABELS] || type}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {WIDGET_TYPE_DESCRIPTIONS[type as keyof typeof WIDGET_TYPE_DESCRIPTIONS] || ''}
                      </p>
                    </div>
                    {selectedType === type && (
                      <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selectedModule && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedType}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Add to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
