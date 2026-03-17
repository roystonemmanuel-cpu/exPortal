import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';

/**
 * Scheduler — schedule an exam as a sitting (session), generate student PINs.
 *
 * Flow:
 *   1. Pick an exam from the list of drafts.
 *   2. Set date/time.
 *   3. Paste in student names (one per line) → system assigns PINs.
 *   4. Save → creates `sessions` + `student_sessions` rows.
 *   5. Shows a printable PIN sheet.
 */
export default function Scheduler() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSessionStore();

  const [selectedExamId, setSelectedExamId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [pinSheet, setPinSheet] = useState(null); // [{name, pin}]
  const [sessionId, setSessionId] = useState(null);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-draft', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, subject, grade_level, duration_minutes, status')
        .eq('school_id', profile.school_id)
        .in('status', ['draft', 'published'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.school_id),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      // 1. Create session
      const { data: session, error: sError } = await supabase
        .from('sessions')
        .insert({
          exam_id: selectedExamId,
          school_id: profile.school_id,
          invigilator_id: profile.id,
          status: 'scheduled',
          scheduled_at: new Date(scheduledAt).toISOString(),
        })
        .select('id')
        .single();
      if (sError) throw sError;

      // 2. Parse names and generate PINs
      const names = studentNames
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean);

      const rows = names.map(name => ({
        session_id: session.id,
        student_name: name,
        student_pin: generatePin(name, session.id),
      }));

      const { error: ssError } = await supabase
        .from('student_sessions')
        .insert(rows);
      if (ssError) throw ssError;

      return { session, rows };
    },
    onSuccess: ({ session, rows }) => {
      qc.invalidateQueries({ queryKey: ['exams-draft'] });
      setSessionId(session.id);
      setPinSheet(rows.map(r => ({ name: r.student_name, pin: r.student_pin })));
    },
  });

  if (pinSheet) {
    return <PinSheet sessionId={sessionId} rows={pinSheet} onDone={() => navigate('/admin')} />;
  }

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800">{t('admin.scheduler')}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {scheduleMutation.isError && (
          <p className="text-oecs-amber text-sm">{scheduleMutation.error?.message}</p>
        )}

        {/* Pick exam */}
        <Field label="Exam">
          <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
            className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            <option value="">Select an exam…</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>
                {e.title} — Gr {e.grade_level} {e.subject} ({e.duration_minutes} min)
              </option>
            ))}
          </select>
        </Field>

        {/* Date/time */}
        <Field label="Date and time">
          <input type="datetime-local" value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] focus:outline-none focus:border-oecs-teal"
          />
        </Field>

        {/* Student roster */}
        <Field label="Student names (one per line)">
          <textarea
            value={studentNames}
            onChange={e => setStudentNames(e.target.value)}
            rows={10}
            placeholder={"Amara Charles\nJovani Baptiste\nKessia Joseph\n…"}
            className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] font-mono resize-y focus:outline-none focus:border-oecs-teal"
          />
          <p className="text-xs text-oecs-neutral-400">
            {studentNames.split('\n').filter(n => n.trim()).length} students
          </p>
        </Field>

        <button
          onClick={() => scheduleMutation.mutate()}
          disabled={scheduleMutation.isPending || !selectedExamId || !scheduledAt || !studentNames.trim()}
          className={[
            'py-4 rounded-xl bg-oecs-teal text-white font-semibold min-h-[56px] text-base',
            (!selectedExamId || !scheduledAt || !studentNames.trim()) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {scheduleMutation.isPending ? t('common.loading') : 'Schedule & Generate PINs'}
        </button>
      </main>
    </div>
  );
}

/** Printable PIN sheet shown after scheduling */
function PinSheet({ sessionId, rows, onDone }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-oecs-neutral-400 print:hidden">
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800">Student PIN Sheet</h1>
        <div className="flex gap-3">
          <button onClick={() => window.print()}
            className="tap-target px-5 py-2 rounded-xl bg-oecs-navy text-white text-sm font-semibold">
            Print
          </button>
          <button onClick={onDone}
            className="tap-target px-5 py-2 rounded-xl border-2 border-oecs-neutral-400 text-oecs-neutral-800 text-sm font-medium">
            Done
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        <p className="text-sm text-oecs-neutral-400 mb-1">Session code</p>
        <p className="text-2xl font-bold font-mono text-oecs-navy mb-6">{sessionId}</p>

        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b-2 border-oecs-neutral-800">
              <th className="text-left py-2 pr-8 font-semibold text-oecs-neutral-800">Student Name</th>
              <th className="text-left py-2 font-semibold text-oecs-neutral-800">PIN</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-oecs-neutral-400">
                <td className="py-3 pr-8 text-oecs-neutral-800">{r.name}</td>
                <td className="py-3 font-mono text-2xl font-bold text-oecs-teal tracking-widest">{r.pin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-oecs-neutral-800">{label}</label>
      {children}
    </div>
  );
}

/**
 * Generate a deterministic 6-digit PIN from the student name + session id.
 * In production this would be a cryptographically random PIN assigned at provisioning.
 * @param {string} name
 * @param {string} sessionId
 * @returns {string}
 */
function generatePin(name, sessionId) {
  let hash = 0;
  const str = `${sessionId}:${name}:${Math.random()}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash) % 900000 + 100000);
}
