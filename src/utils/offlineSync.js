/**
 * Nutriq Offline Synchronization Manager
 * Handles local queuing, duplicate prevention via client_id, automatic retry,
 * and background synchronization with Supabase RLS through the Express API.
 */

import { addOfflineMeal } from './offlineDb';

const QUEUE_STORAGE_KEY = 'nutriq_sync_queue';

/**
 * Generate a unique client_id for duplicate prevention (Idempotency)
 */
export const generateClientId = () => {
  return 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
};

/**
 * Get all sync queue items from localStorage
 */
export const getSyncQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read sync queue from localStorage:', err.message);
    return [];
  }
};

/**
 * Save sync queue to localStorage and dispatch event
 */
const saveSyncQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('nutriq_sync_change', { detail: { queue } }));
  } catch (err) {
    console.error('Could not save sync queue:', err.message);
  }
};

/**
 * Get pending sync items for a specific user
 */
export const getPendingItems = (userId) => {
  const queue = getSyncQueue();
  if (!userId) return queue.filter(item => item.status === 'pending');
  return queue.filter(item => item.userId === userId && item.status === 'pending');
};

/**
 * Get failed sync items for a specific user
 */
export const getFailedItems = (userId) => {
  const queue = getSyncQueue();
  if (!userId) return queue.filter(item => item.status === 'failed');
  return queue.filter(item => item.userId === userId && item.status === 'failed');
};

/**
 * Enqueue a new meal for offline synchronization.
 * Also stores the simulated meal in offlineDb so the local UI immediately reflects it.
 */
export const enqueueMeal = ({ description, userId, loggedAt = new Date().toISOString() }) => {
  const clientId = generateClientId();
  const queue = getSyncQueue();

  // 1. Simulate meal locally for instant user feedback
  const localMeal = addOfflineMeal(description);

  // 2. Add to sync queue
  const queueItem = {
    id: clientId,
    client_id: clientId,
    type: 'CREATE_MEAL',
    description: description.trim(),
    loggedAt,
    userId,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString(),
    error: null,
  };

  queue.push(queueItem);
  saveSyncQueue(queue);

  return { queueItem, localMeal };
};

/**
 * Process the synchronization queue.
 * Strictly adheres to Supabase RLS by transmitting the user's active JWT Bearer token.
 */
export const processSyncQueue = async (session) => {
  if (!navigator.onLine) {
    return { status: 'offline', synced: 0, failed: 0, remaining: getSyncQueue().length };
  }

  if (!session?.access_token || !session?.user?.id) {
    return { status: 'unauthenticated', synced: 0, failed: 0, remaining: getSyncQueue().length };
  }

  const userId = session.user.id;
  const queue = getSyncQueue();
  const userItems = queue.filter(item => item.userId === userId && (item.status === 'pending' || item.status === 'failed'));

  if (userItems.length === 0) {
    return { status: 'idle', synced: 0, failed: 0, remaining: 0 };
  }

  const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of userItems) {
    // Update status to syncing
    item.status = 'syncing';
    item.attempts = (item.attempts || 0) + 1;
    saveSyncQueue(queue);

    try {
      const response = await fetch(`${apiURL}/api/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          description: item.description,
          client_id: item.client_id,
          logged_at: item.loggedAt,
        }),
      });

      if (response.ok) {
        // Success or idempotent duplicate resolved
        item.status = 'synced';
        syncedCount++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client/Validation error (don't retry endlessly)
        const errJson = await response.json().catch(() => ({}));
        item.status = 'failed';
        item.error = errJson.error || `Client error (${response.status})`;
        failedCount++;
      } else {
        // Server or Gateway error (keep as pending for next attempt)
        item.status = 'pending';
        item.error = `Server error (${response.status})`;
        break; // Stop current batch if server is having trouble
      }
    } catch (networkErr) {
      item.status = 'pending';
      item.error = networkErr.message || 'Network request failed';
      break; // Network dropped; stop queue processing
    }
  }

  // Remove fully synced items from the queue to keep storage clean
  const remainingQueue = queue.filter(item => item.status !== 'synced');
  saveSyncQueue(remainingQueue);

  return {
    status: failedCount > 0 ? 'partial_error' : 'success',
    synced: syncedCount,
    failed: failedCount,
    remaining: remainingQueue.filter(item => item.userId === userId).length,
  };
};

/**
 * Clear all failed items for a user
 */
export const clearFailedItems = (userId) => {
  const queue = getSyncQueue();
  const filtered = queue.filter(item => !(item.userId === userId && item.status === 'failed'));
  saveSyncQueue(filtered);
};
