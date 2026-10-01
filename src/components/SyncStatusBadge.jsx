import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertCircle, CloudUpload, Check } from 'lucide-react';
import { useSync } from '../hooks/useSync';

export const SyncStatusBadge = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncNow,
  } = useSync();

  // If online and nothing in queue, don't clutter the header
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {!isOnline ? (
        <motion.div
          key="offline"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(234, 88, 12, 0.15)',
            border: '1px solid rgba(234, 88, 12, 0.35)',
            color: '#ea580c',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
          title="Nutriq is working in offline mode. New meals are saved locally and will auto-sync when online."
        >
          <WifiOff size={14} />
          <span>Offline{pendingCount > 0 ? ` (${pendingCount} queued)` : ''}</span>
        </motion.div>
      ) : isSyncing ? (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#0284c7',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={13} className="animate-spin" />
          <span>Syncing {pendingCount} meal{pendingCount === 1 ? '' : 's'}...</span>
        </motion.div>
      ) : failedCount > 0 ? (
        <motion.button
          key="failed"
          type="button"
          onClick={syncNow}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Click to retry syncing failed meals"
        >
          <AlertCircle size={14} />
          <span>{failedCount} failed to sync (Retry)</span>
        </motion.button>
      ) : pendingCount > 0 ? (
        <motion.button
          key="pending"
          type="button"
          onClick={syncNow}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(42, 140, 110, 0.15)',
            border: '1px solid rgba(42, 140, 110, 0.35)',
            color: 'var(--accent-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Click to sync pending meals now"
        >
          <CloudUpload size={14} />
          <span>{pendingCount} queued for sync</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};
