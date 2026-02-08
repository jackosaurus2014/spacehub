'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { onToast, onDismiss, dismissToast } from '@/lib/toast';
import type { Toast, ToastType } from '@/lib/toast';

const MAX_VISIBLE = 5;

const typeStyles: Record<ToastType, {
  border: string;
  bg: string;
  text: string;
  progress: string;
  icon: string;
}> = {
  success: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    progress: 'bg-emerald-400',
    icon: 'M5 13l4 4L19 7',
  },
  error: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    progress: 'bg-red-400',
    icon: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    progress: 'bg-amber-400',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  info: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    progress: 'bg-cyan-400',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { type, message, title, duration = 5000 } = toast;
  const style = typeStyles[type];
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const isPausedRef = useRef(false);
  const remainingRef = useRef(duration);
  const lastTickRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  }, [onRemove, toast.id]);

  useEffect(() => {
    lastTickRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) {
        lastTickRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      remainingRef.current -= elapsed;

      if (remainingRef.current <= 0) {
        handleDismiss();
      } else {
        setProgress((remainingRef.current / duration) * 100);
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [duration, handleDismiss]);

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    lastTickRef.current = Date.now();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative overflow-hidden rounded-xl border ${style.border}
        backdrop-blur-xl shadow-lg
        w-[360px] max-w-[calc(100vw-2rem)]
        ${isExiting ? 'animate-fade-out' : 'animate-fade-in-up'}
      `}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 rounded-lg p-1.5 ${style.bg}`}>
          <svg
            className={`w-5 h-5 ${style.text}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={style.icon} />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-sm font-semibold ${style.text} mb-0.5`}>
              {title}
            </p>
          )}
          <p className="text-sm text-slate-300 leading-snug">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="flex-shrink-0 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <div
          className={`h-full ${style.progress} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubToast = onToast((newToast) => {
      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep only the latest MAX_VISIBLE toasts
        if (updated.length > MAX_VISIBLE) {
          return updated.slice(updated.length - MAX_VISIBLE);
        }
        return updated;
      });
    });

    const unsubDismiss = onDismiss((id) => {
      removeToast(id);
    });

    return () => {
      unsubToast();
      unsubDismiss();
    };
  }, [removeToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-[120] flex flex-col-reverse gap-2 items-end max-sm:right-1/2 max-sm:translate-x-1/2 max-sm:items-center">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}
