'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { processQueue, getQueueSize } from '@/lib/offline/sync-queue';
import { toast } from '@/lib/toast';

export default function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();
  const wasOfflineRef = useRef(false);

  // When coming back online, process the sync queue
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;

      // Process any queued actions
      (async () => {
        const queueSize = await getQueueSize();
        if (queueSize > 0) {
          toast.info(
            `Back online! Syncing ${queueSize} pending action${queueSize > 1 ? 's' : ''}...`
          );
          const result = await processQueue();
          if (result.success > 0) {
            toast.success(
              `Synced ${result.success} action${result.success > 1 ? 's' : ''} successfully.`
            );
          }
          if (result.failed > 0) {
            toast.warning(
              `${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync.`
            );
          }
        } else {
          toast.success('Back online!');
        }
      })();
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="bg-amber-900/80 border-b border-amber-700/50 px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm text-amber-200 font-medium">
                You&apos;re offline. Cached data shown.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
