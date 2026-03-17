import { create } from 'zustand';
import { supabase, getCurrentProfile } from '../lib/supabase.js';
import { saveSession, loadSession } from '../lib/db.js';

/**
 * @typedef {'student'|'invigilator'|'admin'|'school_admin'|null} UserRole
 */

/**
 * @typedef {Object} StudentSession
 * @property {string} id - student_session.id
 * @property {string} sessionId - exam session id
 * @property {string} studentPin
 * @property {string} studentName
 * @property {string} emisStudentId
 */

const useSessionStore = create((set, get) => ({
  /** @type {import('@supabase/supabase-js').User|null} */
  user: null,
  /** @type {{id:string, role:UserRole, school_id:string, full_name:string}|null} */
  profile: null,
  /** @type {StudentSession|null} */
  studentSession: null,
  /** @type {'loading'|'authenticated'|'unauthenticated'} */
  authStatus: 'loading',

  /** Bootstrap: restore auth state from Supabase and local IndexedDB. */
  init: async () => {
    if (!supabase) {
      set({ authStatus: 'unauthenticated' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await getCurrentProfile();
      set({ user: session.user, profile, authStatus: 'authenticated' });
    } else {
      set({ authStatus: 'unauthenticated' });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getCurrentProfile();
        set({ user: session.user, profile, authStatus: 'authenticated' });
      } else {
        set({ user: null, profile: null, authStatus: 'unauthenticated' });
      }
    });
  },

  /**
   * Claim a student seat with a PIN. Validates against the active session.
   * @param {string} pin
   * @param {string} sessionId - The invigilator's session id
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  claimStudentSeat: async (pin, sessionId) => {
    if (!supabase) return { success: false, error: 'Offline mode — cannot validate PIN against server.' };

    const { data, error } = await supabase
      .from('student_sessions')
      .select('id, session_id, student_pin, student_name, emis_student_id')
      .eq('session_id', sessionId)
      .eq('student_pin', pin)
      .is('submitted_at', null)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid PIN. Please try again.' };
    }

    const studentSession = {
      id: data.id,
      sessionId: data.session_id,
      studentPin: data.student_pin,
      studentName: data.student_name,
      emisStudentId: data.emis_student_id,
    };

    await saveSession({
      id: data.id,
      studentPin: pin,
      schoolId: '',
      status: 'active',
    });

    set({ studentSession });
    return { success: true };
  },

  /**
   * Restore a student session from IndexedDB (for offline recovery).
   * @param {string} studentSessionId
   */
  restoreStudentSession: async (studentSessionId) => {
    const session = await loadSession(studentSessionId);
    if (session) {
      set({
        studentSession: {
          id: session.id,
          sessionId: session.id,
          studentPin: session.studentPin,
          studentName: '',
          emisStudentId: '',
        },
      });
    }
  },

  clearStudentSession: () => set({ studentSession: null }),

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, profile: null, studentSession: null, authStatus: 'unauthenticated' });
  },
}));

export { useSessionStore };
