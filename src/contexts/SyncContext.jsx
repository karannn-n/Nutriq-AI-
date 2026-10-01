import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getPendingItems,
  getFailedItems,
  enqueueMeal,
  processSyncQueue,
  clearFailedItems,
} from '../utils/offlineSync';

export const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const { session, user } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Refresh counts from storage
  const updateCounts = useCallback(() => {
    const userId = user?.id;
    const pending = getPendingItems(userId);
    const failed = getFailedItems(userId);
    setPendingCount(pending.length);
    setFailedCount(failed.length);
  }, [user]);

  // Synchronize queued items
  const syncNow = useCallback(async () => {
    if (!navigator.onLine || !session?.access_token || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await processSyncQueue(session);
      setLastSyncResult(result);
      updateCounts();
      return result;
    } catch (err) {
      console.warn('Sync failed:', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [session, isSyncing, updateCounts]);

  // Enqueue meal for offline sync
  const logMealOffline = useCallback((description) => {
    const userId = user?.id || 'anonymous';
    const result = enqueueMeal({ description, userId });
    updateCounts();
    return result;
  }, [user, updateCounts]);

  // Clear failed items
  const dismissFailed = useCallback(() => {
    if (user?.id) {
      clearFailedItems(user.id);
      updateCounts();
    }
  }, [user, updateCounts]);

  // Listen for online/offline and queue changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when reconnecting
      if (session?.access_token) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncChange = () => {
      updateCounts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nutriq_sync_change', handleSyncChange);

    updateCounts();

    // Check if there are pending items to sync on mount
    if (navigator.onLine && session?.access_token) {
      syncNow();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nutriq_sync_change', handleSyncChange);
    };
  }, [session, syncNow, updateCounts]);

  const value = {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncResult,
    syncNow,
    logMealOffline,
    dismissFailed,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export { useSync } from '../hooks/useSync';
