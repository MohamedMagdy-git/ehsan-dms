'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { getSyncQueueCount } from '@/services/offline-storage';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const [mounted, setMounted] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);

  const refreshQueueCount = useCallback(() => {
    getSyncQueueCount()
      .then((count) => {
        setSyncQueueCount(count);
      })
      .catch(() => {
        setSyncQueueCount(0);
      });
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);

    const handleOnline = () => {
      refreshQueueCount();
    };

    const handleQueueUpdated = () => {
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('ehsan_sync_queue_updated', handleQueueUpdated);

    refreshQueueCount();

    // Periodic check every 10 seconds for sync queue
    const interval = setInterval(refreshQueueCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('ehsan_sync_queue_updated', handleQueueUpdated);
      clearInterval(interval);
    };
  }, [refreshQueueCount]);

  return {
    isOnline,
    syncQueueCount,
    refreshQueueCount,
    mounted,
  };
}
