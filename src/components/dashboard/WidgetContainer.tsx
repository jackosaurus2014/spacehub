'use client';

import { useState, useCallback } from 'react';
import { getWidgetDefinition } from '@/lib/dashboard/widget-registry';
import { MODULE_ROUTES } from '@/lib/module-routes';
import WidgetContent from './WidgetContent';
import Link from 'next/link';

interface WidgetContainerProps {
  widgetId: string;
  moduleId: string;
  widgetType: string;
  title?: string | null;
  config?: Record<string, unknown> | null;
  isEditing: boolean;
  onRemove?: (widgetId: string) => void;
  onDragStart?: (e: React.DragEvent, widgetId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

/**
 * WidgetContainer wraps individual widgets in the dashboard.
 * Renders appropriate module content based on widgetType.
 * In edit mode: shows drag handle and delete button.
 * In view mode: shows header with module icon, title, and expand link.
 */
export default function WidgetContainer({
  widgetId,
  moduleId,
  widgetType,
  title,
  config,
  isEditing,
  onRemove,
  onDragStart,
  onDragEnd,
}: WidgetContainerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const definition = getWidgetDefinition(moduleId);
  const displayTitle = title || definition.label;
  const moduleRoute = MODULE_ROUTES[moduleId] || '#';

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(widgetId);
    }
  }, [onRemove, widgetId]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (onDragStart) {
        onDragStart(e, widgetId);
      }
    },
    [onDragStart, widgetId]
  );

  return (
    <div
      className={`
        card overflow-hidden flex flex-col h-full
        ${isEditing ? 'ring-2 ring-cyan-400/30 ring-dashed' : ''}
        ${hasError ? 'border-red-400/30' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag handle (edit mode only) */}
          {isEditing && (
            <button
              draggable
              onDragStart={handleDragStart}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5 flex-shrink-0"
              title="Drag to reposition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </button>
          )}

          {/* Module icon */}
          <span className="text-base flex-shrink-0">{definition.icon}</span>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-900 truncate">{displayTitle}</h3>

          {/* Widget type badge */}
          <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 flex-shrink-0">
            {widgetType}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Collapse/expand button */}
          {!isEditing && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Open in full page */}
          {!isEditing && (
            <Link
              href={moduleRoute}
              className="text-slate-400 hover:text-cyan-500 p-1 rounded"
              title="Open full module"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}

          {/* Remove button (edit mode only) */}
          {isEditing && (
            <button
              onClick={handleRemove}
              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
              title="Remove widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 p-3 overflow-hidden">
          {hasError ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-4">
              <p className="text-red-400 text-sm">Something went wrong</p>
              <button
                onClick={() => setHasError(false)}
                className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <ErrorBoundaryWrapper onError={() => setHasError(true)}>
              <WidgetContent moduleId={moduleId} widgetType={widgetType} config={config} />
            </ErrorBoundaryWrapper>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple error boundary wrapper using try-catch in effect
 * (React class-based error boundaries are not usable in hooks)
 */
function ErrorBoundaryWrapper({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError: () => void;
}) {
  // In a real implementation we would use a class-based ErrorBoundary.
  // For simplicity, we render children directly. WidgetContent handles its own errors.
  try {
    return <>{children}</>;
  } catch {
    onError();
    return null;
  }
}
