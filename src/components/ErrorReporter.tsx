'use client';
import { useEffect } from 'react';
import { initErrorReporter } from '@/lib/error-boundary-reporter';

export default function ErrorReporter() {
  useEffect(() => { initErrorReporter(); }, []);
  return null;
}
