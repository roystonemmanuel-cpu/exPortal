import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

if (!supabaseConfigured) {
  console.warn('Supabase environment variables not set. Running in offline-only mode.');
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'oecs-auth',
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;

/**
 * Get the currently authenticated user's profile including role and school_id.
 * @returns {Promise<{id:string, role:string, school_id:string, full_name:string}|null>}
 */
export async function getCurrentProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }
  return data;
}

/**
 * Sign in with email + password (invigilator / admin).
 * @param {string} email
 * @param {string} password
 */
export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

/**
 * Subscribe to real-time session events for the invigilator dashboard.
 * @param {string} sessionId
 * @param {(payload: Object) => void} onStudentUpdate
 * @returns {import('@supabase/supabase-js').RealtimeChannel|null}
 */
export function subscribeToSession(sessionId, onStudentUpdate) {
  if (!supabase) return null;
  return supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'student_sessions',
      filter: `session_id=eq.${sessionId}`,
    }, onStudentUpdate)
    .subscribe();
}
