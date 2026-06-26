'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error monitoring in production (e.g. Sentry)
    console.error('[Dashboard Error]', error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: '#FFF0F0' }}>
        <AlertTriangle size={24} style={{ color: '#D84040' }} />
      </div>
      <div className="text-center">
        <div className="font-bold mb-1" style={{ fontSize: 15, color: '#1A1730' }}>Something went wrong</div>
        <div style={{ fontSize: 12, color: '#8A88A8', maxWidth: 320 }}>
          The dashboard failed to load. This may be a temporary issue.
        </div>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg px-4 py-2 font-semibold"
        style={{ fontSize: 12, background: '#5B4FE9', color: '#fff' }}
      >
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  );
}
