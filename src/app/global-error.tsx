'use client';
import { useEffect } from 'react';
import { clientLogger } from '@/lib/client-logger';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error('Global unhandled error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack?.slice(0, 500),
    });
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', background: '#0a0a1a', color: '#e0e0e0' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
        <p style={{ color: '#999', marginBottom: '1.5rem' }}>An unexpected error occurred. Our team has been notified.</p>
        <button onClick={() => reset()} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
          Try again
        </button>
        <br /><br />
        <a href="/" style={{ color: '#3b82f6' }}>Go to homepage</a>
      </body>
    </html>
  );
}
