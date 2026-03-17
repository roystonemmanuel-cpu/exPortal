import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase, subscribeToSession } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';

/**
 * Invigilator live classroom monitor.
 * Shows all seated students, their status, and provides session controls.
 * Uses Supabase real-time subscriptions.
 */
export default function InvigilatorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useSessionStore();

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('active'); // 'active' | 'paused'
  const [incidentNote, setIncidentNote] = useState('');
  const [showIncident, setShowIncident] = useState(false);
  const [incidentSaved, setIncidentSaved] = useState(false);

  // Load invigilator's sessions
  useEffect(() => {
    if (!profile) return;
    supabase
      .from('sessions')
      .select('id, status, started_at, exams(title, subject, grade_level)')
      .eq('invigilator_id', profile.id)
      .eq('status', 'active')
      .then(({ data }) => setSessions(data ?? []));
  }, [profile]);

  // Load students for selected session and subscribe to real-time updates
  useEffect(() => {
    if (!activeSession) return;

    supabase
      .from('student_sessions')
      .select('id, student_name, student_pin, submitted_at')
      .eq('session_id', activeSession)
      .then(({ data }) => setStudents(data ?? []));

    const channel = subscribeToSession(activeSession, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setStudents(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
      }
      if (payload.eventType === 'INSERT') {
        setStudents(prev => [...prev, payload.new]);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [activeSession]);

  async function handlePauseResume() {
    const next = sessionStatus === 'active' ? 'paused' : 'active';
    await supabase.from('sessions').update({ status: next }).eq('id', activeSession);
    setSessionStatus(next);
  }

  async function handleCollect() {
    await supabase.from('sessions').update({ status: 'collecting', ended_at: new Date().toISOString() }).eq('id', activeSession);
    navigate('/invigilator/collect');
  }

  async function handleLogIncident() {
    if (!incidentNote.trim()) return;
    await supabase.from('incidents').insert({
      session_id: activeSession,
      invigilator_id: profile.id,
      note: incidentNote,
      created_at: new Date().toISOString(),
    });
    setIncidentNote('');
    setIncidentSaved(true);
    setTimeout(() => { setIncidentSaved(false); setShowIncident(false); }, 2000);
  }

  const seatedCount = students.length;
  const submittedCount = students.filter(s => s.submitted_at).length;

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-oecs-navy text-white px-4 py-4 flex items-center justify-between">
        <h1 className="text-[16px] font-semibold">{t('invigilator.title')}</h1>
        <p className="text-xs opacity-80">{profile?.full_name}</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Session selector */}
        {!activeSession && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-oecs-neutral-400 uppercase tracking-wide">
              Select session
            </h2>
            {sessions.length === 0 && (
              <p className="text-oecs-neutral-400 text-sm">No active sessions found.</p>
            )}
            {sessions.map(s => (
              <button key={s.id} onClick={() => setActiveSession(s.id)}
                className="w-full text-left bg-white rounded-xl border-2 border-oecs-neutral-400 px-4 py-4 flex flex-col gap-1 min-h-[60px]">
                <span className="font-semibold text-oecs-neutral-800">{s.exams?.title}</span>
                <span className="text-sm text-oecs-neutral-400">
                  {s.exams?.subject} · Grade {s.exams?.grade_level} · Code: {s.id}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeSession && (
          <>
            {/* Session code display */}
            <div className="bg-oecs-navy-light rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-oecs-navy font-semibold uppercase tracking-wide">
                  {t('invigilator.session_code')}
                </p>
                <p className="text-2xl font-bold font-mono text-oecs-navy mt-1">{activeSession}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-oecs-navy">{t('invigilator.students_seated', { count: seatedCount })}</p>
                <p className="text-sm text-oecs-teal font-medium">{t('invigilator.students_submitted', { count: submittedCount })}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handlePauseResume}
                className={[
                  'tap-target flex-1 py-3 rounded-xl border-2 font-medium text-sm',
                  sessionStatus === 'active'
                    ? 'border-oecs-amber bg-oecs-amber-light text-oecs-amber'
                    : 'border-oecs-teal bg-oecs-teal-light text-oecs-teal',
                ].join(' ')}>
                {sessionStatus === 'active' ? t('invigilator.pause') : t('invigilator.resume')}
              </button>
              <button onClick={() => setShowIncident(true)}
                className="tap-target flex-1 py-3 rounded-xl border-2 border-oecs-neutral-400 bg-white text-oecs-neutral-800 font-medium text-sm">
                {t('invigilator.incident')}
              </button>
              <button onClick={handleCollect}
                className="tap-target flex-1 py-3 rounded-xl bg-oecs-navy text-white font-semibold text-sm">
                {t('invigilator.collect')}
              </button>
            </div>

            {/* Student list */}
            <div className="flex flex-col gap-2">
              {students.map(s => (
                <div key={s.id}
                  className="bg-white rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 flex items-center gap-4 min-h-[52px]">
                  <div className={[
                    'w-3 h-3 rounded-full shrink-0',
                    s.submitted_at ? 'bg-oecs-teal' : 'bg-oecs-amber',
                  ].join(' ')} aria-label={s.submitted_at ? t('invigilator.status_submitted') : t('invigilator.status_active')} />
                  <span className="flex-1 text-[14px] text-oecs-neutral-800">{s.student_name || `PIN ${s.student_pin}`}</span>
                  <span className="text-xs text-oecs-neutral-400">
                    {s.submitted_at ? t('invigilator.status_submitted') : t('invigilator.status_active')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Incident modal */}
      {showIncident && (
        <div role="dialog" aria-modal="true" aria-label={t('invigilator.incident')}
          className="fixed inset-0 bg-black/40 flex items-end p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-auto flex flex-col gap-4">
            <h2 className="font-semibold text-oecs-neutral-800">{t('invigilator.incident')}</h2>
            {incidentSaved ? (
              <p className="text-oecs-teal font-medium">{t('invigilator.incident_saved')}</p>
            ) : (
              <>
                <textarea
                  value={incidentNote}
                  onChange={e => setIncidentNote(e.target.value)}
                  rows={4}
                  placeholder="Describe the incident…"
                  className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] resize-none focus:outline-none focus:border-oecs-teal"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowIncident(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-oecs-neutral-400 text-oecs-neutral-800 font-medium">
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleLogIncident}
                    className="flex-1 py-3 rounded-xl bg-oecs-navy text-white font-semibold">
                    {t('admin.save')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
