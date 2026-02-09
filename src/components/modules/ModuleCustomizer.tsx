'use client';

import { useState } from 'react';
import { UserModuleWithConfig } from '@/lib/module-preferences';
import { MODULE_SECTIONS, ModuleSection } from '@/types';

interface ModuleCustomizerProps {
  modules: UserModuleWithConfig[];
  onToggle: (moduleId: string, enabled: boolean) => void;
  onReorder: (newOrder: string[]) => void;
  onClose: () => void;
  isAuthenticated: boolean;
}

export default function ModuleCustomizer({
  modules,
  onToggle,
  onReorder,
  onClose,
  isAuthenticated,
}: ModuleCustomizerProps) {
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);

  const handleDragStart = (moduleId: string) => {
    setDraggedModule(moduleId);
  };

  const handleDragOver = (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    if (!draggedModule || draggedModule === targetModuleId) return;

    const currentOrder = sortedModules.map(m => m.moduleId);
    const draggedIndex = currentOrder.indexOf(draggedModule);
    const targetIndex = currentOrder.indexOf(targetModuleId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedModule);

    onReorder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const currentOrder = sortedModules.map(m => m.moduleId);
    const currentIndex = currentOrder.indexOf(moduleId);

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === currentOrder.length - 1)
    ) {
      return;
    }

    const newOrder = [...currentOrder];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    onReorder(newOrder);
  };

  // Group modules by section
  const modulesBySection = MODULE_SECTIONS.map(section => ({
    ...section,
    modules: sortedModules.filter(m => m.section === section.value),
  }));

  return (
    <div className="card p-6 border-nebula-500/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
          <span>⚙️</span> Customize Dashboard
        </h3>
        <button
          onClick={onClose}
          className="text-star-300 hover:text-white transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!isAuthenticated && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            <span className="font-semibold">Note:</span> Sign in to save your preferences. Changes will only persist for this session.
          </p>
        </div>
      )}

      <p className="text-star-300 text-sm mb-4">
        Toggle modules on/off and drag to reorder them on your dashboard.
      </p>

      <div className="space-y-6">
        {modulesBySection.map(section => (
          section.modules.length > 0 && (
            <div key={section.value}>
              <h4 className="text-star-300 text-xs uppercase tracking-widest font-medium mb-2">
                {section.label}
              </h4>
              <div className="space-y-2">
                {section.modules.map((module) => {
                  const globalIndex = sortedModules.findIndex(m => m.moduleId === module.moduleId);
                  return (
                    <div
                      key={module.moduleId}
                      draggable
                      onDragStart={() => handleDragStart(module.moduleId)}
                      onDragOver={(e) => handleDragOver(e, module.moduleId)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                        draggedModule === module.moduleId
                          ? 'bg-nebula-500/20 border-nebula-500'
                          : 'bg-space-700/30 border-space-600 hover:border-space-500'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="text-star-300 cursor-grab active:cursor-grabbing">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>

                      {/* Module Icon */}
                      <span className="text-2xl">{module.icon}</span>

                      {/* Module Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white">{module.name}</h4>
                        <p className="text-star-300 text-xs line-clamp-1">{module.description}</p>
                      </div>

                      {/* Move Buttons (for accessibility) */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveModule(module.moduleId, 'up')}
                          disabled={globalIndex === 0}
                          className="text-star-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveModule(module.moduleId, 'down')}
                          disabled={globalIndex === sortedModules.length - 1}
                          className="text-star-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => onToggle(module.moduleId, !module.enabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors overflow-hidden ${
                          module.enabled ? 'bg-nebula-500' : 'bg-space-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            module.enabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-space-600/50">
        <p className="text-star-300/70 text-xs text-center">
          Tip: Drag modules to reorder them, or use the arrow buttons
        </p>
      </div>
    </div>
  );
}
