'use client';

import { useState, useCallback } from 'react';

interface ProgressState {
  /** Percentage 0-100 */
  progress: number;
  /** Current step (1-based) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  /** Human-readable status message */
  message: string;
}

interface UseProgressReturn extends ProgressState {
  /** Begin tracking a multi-step operation */
  start: (totalSteps: number, initialMessage?: string) => void;
  /** Move to the next step, optionally updating the message */
  advance: (message?: string) => void;
  /** Mark the operation as 100% complete */
  complete: (message?: string) => void;
  /** Reset all state back to initial values */
  reset: () => void;
}

const INITIAL_STATE: ProgressState = {
  progress: 0,
  step: 0,
  totalSteps: 0,
  message: '',
};

/**
 * Hook for tracking multi-step operation progress.
 *
 * Usage:
 *   const p = useProgress();
 *   p.start(3, 'Preparing...');
 *   // after step 1
 *   p.advance('Processing data...');
 *   // after step 2
 *   p.advance('Finalizing...');
 *   // done
 *   p.complete('Export finished!');
 */
export function useProgress(): UseProgressReturn {
  const [state, setState] = useState<ProgressState>(INITIAL_STATE);

  const start = useCallback((totalSteps: number, initialMessage?: string) => {
    setState({
      progress: 0,
      step: 0,
      totalSteps,
      message: initialMessage || '',
    });
  }, []);

  const advance = useCallback((message?: string) => {
    setState((prev) => {
      const nextStep = Math.min(prev.step + 1, prev.totalSteps);
      const nextProgress =
        prev.totalSteps > 0
          ? Math.round((nextStep / prev.totalSteps) * 100)
          : 0;
      return {
        ...prev,
        step: nextStep,
        progress: nextProgress,
        message: message ?? prev.message,
      };
    });
  }, []);

  const complete = useCallback((message?: string) => {
    setState((prev) => ({
      ...prev,
      progress: 100,
      step: prev.totalSteps,
      message: message || 'Complete',
    }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    start,
    advance,
    complete,
    reset,
  };
}
