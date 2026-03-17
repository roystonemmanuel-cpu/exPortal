import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';

const SUBJECTS = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies'];
const GRADES = ['K', '1', '2', '3', '4', '5', '6'];

/**
 * Admin exam builder — two-panel layout:
 *   Left: question picker (search + filter from item bank)
 *   Right: current exam question list (drag to reorder)
 */
export default function ExamBuilder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSessionStore();

  // Exam metadata
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState('3');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Selected questions for this exam (ordered array of question objects)
  const [examQuestions, setExamQuestions] = useState([]);

  // Picker filters
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerGrade, setPickerGrade] = useState('');
  const [pickerSubject, setPickerSubject] = useState('');

  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load question bank
  const { data: bankQuestions = [] } = useQuery({
    queryKey: ['questions-bank', profile?.school_id, pickerSearch, pickerGrade, pickerSubject],
    queryFn: async () => {
      let q = supabase
        .from('questions')
        .select('id, type, stem_text, subject, grade_level, marks')
        .eq('school_id', profile.school_id)
        .is('retired_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (pickerSearch) q = q.ilike('stem_text', `%${pickerSearch}%`);
      if (pickerGrade) q = q.eq('grade_level', pickerGrade);
      if (pickerSubject) q = q.eq('subject', pickerSubject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.school_id),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the exam record
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title,
          subject,
          grade_level: grade,
          school_id: profile.school_id,
          duration_minutes: Number(durationMinutes),
          status: 'draft',
        })
        .select('id')
        .single();
      if (examError) throw examError;

      // 2. Create exam_questions join rows
      const rows = examQuestions.map((q, i) => ({
        exam_id: exam.id,
        question_id: q.id,
        order: i + 1,
      }));
      if (rows.length) {
        const { error: qError } = await supabase.from('exam_questions').insert(rows);
        if (qError) throw qError;
      }
      return exam;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setSaved(true);
      setTimeout(() => navigate('/admin/scheduler'), 1200);
    },
  });

  function addQuestion(q) {
    if (examQuestions.find(e => e.id === q.id)) return; // no duplicates
    setExamQuestions(prev => [...prev, q]);
  }

  function removeQuestion(id) {
    setExamQuestions(prev => prev.filter(q => q.id !== id));
  }

  function handleDrop(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...examQuestions];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    setExamQuestions(next);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  const totalMarks = examQuestions.reduce((s, q) => s + (q.marks ?? 1), 0);
  const addedIds = new Set(examQuestions.map(q => q.id));

  return (
    <div className="min-h-screen bg-oecs-neutral-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/admin')} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">
          {t('admin.exam_builder')}
        </h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title || examQuestions.length === 0}
          className={[
            'tap-target px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors',
            saved ? 'bg-oecs-teal' :
            saveMutation.isPending ? 'bg-oecs-teal/60' : 'bg-oecs-teal',
            (!title || examQuestions.length === 0) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {saved ? '✓ Saved' : saveMutation.isPending ? t('common.loading') : t('admin.save')}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Exam metadata + selected questions */}
        <div className="w-1/2 border-r border-oecs-neutral-400 flex flex-col overflow-hidden">
          {/* Metadata form */}
          <div className="px-4 py-4 border-b border-oecs-neutral-400 bg-white flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Exam title"
              className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[15px] focus:outline-none focus:border-oecs-teal w-full"
            />
            <div className="flex gap-3">
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="flex-1 rounded-xl border-2 border-oecs-neutral-400 px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="rounded-xl border-2 border-oecs-neutral-400 px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
                {GRADES.map(g => <option key={g} value={g}>{g === 'K' ? 'Kinder' : `Gr ${g}`}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input type="number" min={10} max={180} value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  className="w-16 rounded-xl border-2 border-oecs-neutral-400 px-2 py-2.5 text-[14px] focus:outline-none focus:border-oecs-teal text-center"
                />
                <span className="text-xs text-oecs-neutral-400">min</span>
              </div>
            </div>
            <p className="text-xs text-oecs-neutral-400">
              {examQuestions.length} questions · {totalMarks} marks
            </p>
          </div>

          {/* Ordered question list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {examQuestions.length === 0 && (
              <p className="text-sm text-oecs-neutral-400 text-center py-8">
                Add questions from the right panel.
              </p>
            )}
            {examQuestions.map((q, i) => (
              <div
                key={q.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragEnter={() => setDragOverIdx(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className={[
                  'flex items-center gap-3 bg-white rounded-xl border-2 px-3 py-3 cursor-grab',
                  dragOverIdx === i ? 'border-oecs-teal bg-oecs-teal-light' : 'border-oecs-neutral-400',
                  dragIdx === i ? 'opacity-40' : '',
                ].join(' ')}
              >
                <span className="text-oecs-neutral-400 text-lg shrink-0" aria-hidden="true">⠿</span>
                <span className="w-6 h-6 rounded-full bg-oecs-navy-light text-oecs-navy text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-[13px] text-oecs-neutral-800 truncate">{q.stem_text ?? `(${q.type})`}</span>
                <TypeBadge type={q.type} />
                <span className="text-xs text-oecs-neutral-400 shrink-0">{q.marks ?? 1}mk</span>
                <button onClick={() => removeQuestion(q.id)}
                  aria-label="Remove question"
                  className="tap-target text-oecs-neutral-400 hover:text-oecs-coral text-lg shrink-0">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Question bank picker */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-oecs-neutral-400 bg-white flex flex-col gap-2">
            <input type="search" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
              placeholder={t('admin.search_placeholder')}
              className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[14px] focus:outline-none focus:border-oecs-teal"
            />
            <div className="flex gap-2">
              <select value={pickerGrade} onChange={e => setPickerGrade(e.target.value)}
                className="flex-1 rounded-xl border-2 border-oecs-neutral-400 px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-oecs-teal">
                <option value="">All grades</option>
                {GRADES.map(g => <option key={g} value={g}>{g === 'K' ? 'Kinder' : `Grade ${g}`}</option>)}
              </select>
              <select value={pickerSubject} onChange={e => setPickerSubject(e.target.value)}
                className="flex-1 rounded-xl border-2 border-oecs-neutral-400 px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-oecs-teal">
                <option value="">All subjects</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {bankQuestions.map(q => {
              const added = addedIds.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => addQuestion(q)}
                  disabled={added}
                  className={[
                    'w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 py-3 min-h-[52px]',
                    'transition-colors duration-100',
                    added
                      ? 'border-oecs-teal bg-oecs-teal-light opacity-60 cursor-not-allowed'
                      : 'border-oecs-neutral-400 bg-white hover:border-oecs-navy',
                  ].join(' ')}
                >
                  <span className="flex-1 text-[13px] text-oecs-neutral-800 truncate">{q.stem_text ?? `(${q.type})`}</span>
                  <TypeBadge type={q.type} />
                  <span className="text-xs text-oecs-neutral-400 shrink-0">{q.marks ?? 1}mk</span>
                  <span className="text-lg shrink-0 text-oecs-teal">{added ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const SHORT = {
    mcq: 'MCQ', true_false: 'T/F', fill_blank: 'Fill',
    drag_order: 'Drag', image_label: 'Label', audio: 'Audio', short_answer: 'SA',
  };
  return (
    <span className="px-2 py-0.5 rounded-full bg-oecs-neutral-100 text-oecs-neutral-400 text-[11px] font-medium shrink-0">
      {SHORT[type] ?? type}
    </span>
  );
}
