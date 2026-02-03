'use client';

import { useEffect, useState } from 'react';

export default function DataInitializer() {
  const [status, setStatus] = useState<'checking' | 'initializing' | 'done' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if data needs initialization
        const checkRes = await fetch('/api/init');
        const checkData = await checkRes.json();

        if (checkData.initialized) {
          setStatus('done');
          return;
        }

        // Data needs initialization
        setStatus('initializing');
        setMessage('Setting up your space dashboard...');

        const initRes = await fetch('/api/init', { method: 'POST' });
        const initData = await initRes.json();

        if (initData.success) {
          setStatus('done');
        } else {
          setStatus('error');
          setMessage(initData.error || 'Initialization failed');
        }
      } catch (error) {
        console.error('Data initialization error:', error);
        setStatus('error');
        setMessage(String(error));
      }
    };

    initializeData();
  }, []);

  // Don't render anything once done
  if (status === 'done' || status === 'checking') {
    return null;
  }

  if (status === 'error') {
    return null; // Silently fail - data can be loaded manually
  }

  // Show loading overlay while initializing
  return (
    <div className="fixed inset-0 bg-space-900/95 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-nebula-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-nebula-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white text-lg font-medium mb-2">Initializing SpaceHub</p>
        <p className="text-star-300 text-sm">{message || 'Loading space industry data...'}</p>
        <p className="text-star-400 text-xs mt-4">This only happens once</p>
      </div>
    </div>
  );
}
