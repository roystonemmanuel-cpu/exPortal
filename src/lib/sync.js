import { supabase } from './supabase.js';
import { getUnsyncedResponses, markSynced } from './db.js';

let syncInProgress = false;

/**
 * Flush all unsynced local responses to Supabase.
 * Safe to call any time — debounced internally.
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function syncResponses() {
  if (!supabase || syncInProgress) return { synced: 0, failed: 0 };
  syncInProgress = true;

  try {
    const unsynced = await getUnsyncedResponses();
    if (unsynced.length === 0) return { synced: 0, failed: 0 };

    // Batch upsert to Supabase
    const rows = unsynced.map(r => ({
      student_session_id: r.sessionId,
      question_id: r.questionId,
      response_value: r.responseValue,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('responses')
      .upsert(rows, { onConflict: 'student_session_id,question_id', ignoreDuplicates: false });

    if (error) {
      console.warn('Sync failed:', error.message);
      return { synced: 0, failed: unsynced.length };
    }

    const ids = unsynced.map(r => r.id);
    await markSynced(ids);
    return { synced: ids.length, failed: 0 };

  } catch (err) {
    console.warn('Sync error:', err);
    return { synced: 0, failed: 0 };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Start a background sync loop that fires every 30 seconds when online.
 * Returns a cleanup function.
 * @returns {() => void}
 */
export function startBackgroundSync() {
  const interval = setInterval(() => {
    if (navigator.onLine) syncResponses();
  }, 30_000);

  const handleOnline = () => syncResponses();
  window.addEventListener('online', handleOnline);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', handleOnline);
  };
}
