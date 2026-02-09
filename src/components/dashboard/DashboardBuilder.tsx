'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import WidgetContainer from './WidgetContainer';
import AddWidgetModal from './AddWidgetModal';

export interface WidgetData {
  id: string;
  moduleId: string;
  widgetType: string;
  title?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  config?: Record<string, unknown> | null;
  order: number;
}

interface DashboardBuilderProps {
  widgets: WidgetData[];
  isEditing: boolean;
  onSave: (widgets: WidgetData[]) => void;
  onToggleEdit: () => void;
  hasChanges: boolean;
}

const GRID_COLUMNS = 12;
const ROW_HEIGHT_PX = 80;

/**
 * DashboardBuilder - Main builder component.
 * Two modes: "View" and "Edit".
 * View mode: Renders widgets in CSS Grid layout.
 * Edit mode: Drag-and-drop rearrangement using HTML5 Drag and Drop API.
 * Mobile: 1-column stacked layout ordered by `order` field.
 */
export default function DashboardBuilder({
  widgets,
  isEditing,
  onSave,
  onToggleEdit,
  hasChanges,
}: DashboardBuilderProps) {
  const [localWidgets, setLocalWidgets] = useState<WidgetData[]>(widgets);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [resizingWidgetId, setResizingWidgetId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync with parent widgets when not in edit mode
  useEffect(() => {
    if (!isEditing) {
      setLocalWidgets(widgets);
    }
  }, [widgets, isEditing]);

  // Calculate the total grid rows needed
  const maxRow = localWidgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

  // Handle widget removal
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setLocalWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }, []);

  // Handle adding new widget
  const handleAddWidget = useCallback(
    (widget: { moduleId: string; widgetType: string; w: number; h: number }) => {
      const newWidget: WidgetData = {
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        moduleId: widget.moduleId,
        widgetType: widget.widgetType,
        x: 0,
        y: maxRow, // Place at the bottom
        w: widget.w,
        h: widget.h,
        minW: 3,
        minH: 2,
        order: localWidgets.length,
      };
      setLocalWidgets((prev) => [...prev, newWidget]);
    },
    [maxRow, localWidgets.length]
  );

  // Handle save
  const handleSave = useCallback(() => {
    onSave(localWidgets);
  }, [localWidgets, onSave]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, widgetId: string) => {
      setDraggedWidgetId(widgetId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widgetId);
      // Set a custom drag image (optional)
      const target = e.currentTarget.closest('[data-widget-id]') as HTMLElement;
      if (target) {
        e.dataTransfer.setDragImage(target, 20, 20);
      }
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedWidgetId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const widgetId = e.dataTransfer.getData('text/plain');
      if (!widgetId || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / GRID_COLUMNS;

      // Calculate new grid position from drop coordinates
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      const newX = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(relativeX / colWidth)));
      const newY = Math.max(0, Math.floor(relativeY / ROW_HEIGHT_PX));

      setLocalWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== widgetId) return w;
          // Ensure widget stays within grid bounds
          const clampedX = Math.min(newX, GRID_COLUMNS - w.w);
          return { ...w, x: clampedX, y: newY };
        })
      );

      setDraggedWidgetId(null);
    },
    []
  );

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, widgetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const widget = localWidgets.find((w) => w.id === widgetId);
      if (!widget) return;

      setResizingWidgetId(widgetId);
      setResizeStart({ x: e.clientX, y: e.clientY, w: widget.w, h: widget.h });
    },
    [localWidgets]
  );

  useEffect(() => {
    if (!resizingWidgetId || !resizeStart || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const colWidth = rect.width / GRID_COLUMNS;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const deltaCols = Math.round(deltaX / colWidth);
      const deltaRows = Math.round(deltaY / ROW_HEIGHT_PX);

      const widget = localWidgets.find((w) => w.id === resizingWidgetId);
      if (!widget) return;

      const newW = Math.max(widget.minW, Math.min(GRID_COLUMNS - widget.x, resizeStart.w + deltaCols));
      const newH = Math.max(widget.minH, Math.min(12, resizeStart.h + deltaRows));

      setLocalWidgets((prev) =>
        prev.map((w) => (w.id === resizingWidgetId ? { ...w, w: newW, h: newH } : w))
      );
    };

    const handleMouseUp = () => {
      setResizingWidgetId(null);
      setResizeStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingWidgetId, resizeStart, localWidgets]);

  // Get existing module IDs for the AddWidgetModal
  const existingModuleIds = localWidgets.map((w) => w.moduleId);

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Widget
              </button>
              <span className="text-xs text-slate-400">
                {localWidgets.length} widget{localWidgets.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {hasChanges && isEditing && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="6" />
              </svg>
              Unsaved changes
            </span>
          )}

          {isEditing && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save
            </button>
          )}

          <button
            onClick={onToggleEdit}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all ${
              isEditing
                ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                : 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200'
            }`}
          >
            {isEditing ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Edit
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Dashboard
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Layout (Desktop) */}
      <div
        ref={gridRef}
        className="hidden md:block relative"
        style={{ minHeight: `${Math.max(maxRow + 2, 4) * ROW_HEIGHT_PX}px` }}
        onDragOver={isEditing ? handleDragOver : undefined}
        onDrop={isEditing ? handleDrop : undefined}
      >
        {/* Grid background (edit mode) */}
        {isEditing && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: `${100 / GRID_COLUMNS}% ${ROW_HEIGHT_PX}px`,
            }}
          />
        )}

        {/* Widgets */}
        {localWidgets.map((widget) => (
          <div
            key={widget.id}
            data-widget-id={widget.id}
            className={`absolute transition-all duration-200 ${
              draggedWidgetId === widget.id ? 'opacity-50' : ''
            } ${resizingWidgetId === widget.id ? 'z-10' : ''}`}
            style={{
              left: `${(widget.x / GRID_COLUMNS) * 100}%`,
              top: `${widget.y * ROW_HEIGHT_PX}px`,
              width: `${(widget.w / GRID_COLUMNS) * 100}%`,
              height: `${widget.h * ROW_HEIGHT_PX}px`,
              padding: '4px',
            }}
          >
            <div className="relative h-full">
              <WidgetContainer
                widgetId={widget.id}
                moduleId={widget.moduleId}
                widgetType={widget.widgetType}
                title={widget.title}
                config={widget.config}
                isEditing={isEditing}
                onRemove={handleRemoveWidget}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />

              {/* Resize handle (edit mode) */}
              {isEditing && (
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize z-10 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, widget.id)}
                >
                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="6" cy="10" r="1.5" />
                    <circle cx="10" cy="6" r="1.5" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {localWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-slate-400 text-sm mb-2">No widgets yet</p>
            {isEditing ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-sm text-cyan-500 hover:text-cyan-400 font-medium"
              >
                Add your first widget
              </button>
            ) : (
              <p className="text-xs text-slate-400">Click &quot;Edit Dashboard&quot; to add widgets</p>
            )}
          </div>
        )}
      </div>

      {/* Stacked Layout (Mobile) */}
      <div className="md:hidden space-y-4">
        {[...localWidgets]
          .sort((a, b) => a.order - b.order)
          .map((widget) => (
            <div key={widget.id} data-widget-id={widget.id}>
              <WidgetContainer
                widgetId={widget.id}
                moduleId={widget.moduleId}
                widgetType={widget.widgetType}
                title={widget.title}
                config={widget.config}
                isEditing={isEditing}
                onRemove={handleRemoveWidget}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            </div>
          ))}

        {localWidgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No widgets in this layout</p>
            {isEditing && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-sm text-cyan-500 hover:text-cyan-400 font-medium mt-2"
              >
                Add your first widget
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddWidget}
        existingModuleIds={existingModuleIds}
      />
    </div>
  );
}
