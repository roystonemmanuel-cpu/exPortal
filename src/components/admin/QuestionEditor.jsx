import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';

const SUBJECTS = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies'];
const GRADES = ['K', '1', '2', '3', '4', '5', '6'];
const TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'drag_order', label: 'Drag and Order' },
  { value: 'image_label', label: 'Image Label' },
  { value: 'audio', label: 'Audio Question' },
  { value: 'short_answer', label: 'Short Answer' },
];

/**
 * Full question editor for the admin item bank.
 * Handles create + update. Uploads images/audio to Supabase Storage.
 *
 * @param {{ question: Object|null, schoolId: string, onSaved: ()=>void, onCancel: ()=>void }} props
 */
export function QuestionEditor({ question, schoolId, onSaved, onCancel }) {
  const { t } = useTranslation();
  const isNew = !question;

  const [form, setForm] = useState({
    type: question?.type ?? 'mcq',
    stem_text: question?.stem_text ?? '',
    subject: question?.subject ?? SUBJECTS[0],
    grade_level: question?.grade_level ?? '3',
    marks: question?.marks ?? 1,
    correct_answer: question?.correct_answer ?? '',
    choices: question?.choices ?? [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        const { error } = await supabase.from('questions').insert({ ...data, school_id: schoolId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').update(data).eq('id', question.id);
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  function handleSave() {
    const data = {
      type: form.type,
      stem_text: form.stem_text,
      subject: form.subject,
      grade_level: form.grade_level,
      marks: Number(form.marks),
      correct_answer: form.correct_answer,
      choices: ['mcq', 'drag_order', 'audio'].includes(form.type) ? form.choices : null,
    };
    saveMutation.mutate(data);
  }

  const showChoices = ['mcq', 'drag_order', 'audio'].includes(form.type);

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3">
        <button onClick={onCancel} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">
          {isNew ? t('admin.new_question') : 'Edit Question'}
        </h1>
        <button onClick={handleSave} disabled={saveMutation.isPending}
          className="tap-target px-5 py-2 rounded-xl bg-oecs-teal text-white text-sm font-semibold">
          {saveMutation.isPending ? t('common.loading') : t('admin.save')}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {saveMutation.isError && (
          <p className="text-oecs-amber text-sm">{saveMutation.error?.message ?? t('common.error')}</p>
        )}

        {/* Type */}
        <Field label={t('admin.type')}>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        {/* Grade + Subject */}
        <div className="flex gap-3">
          <Field label={t('admin.grade')} className="flex-1">
            <select value={form.grade_level} onChange={e => set('grade_level', e.target.value)}
              className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
              {GRADES.map(g => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
            </select>
          </Field>
          <Field label={t('admin.subject')} className="flex-1">
            <select value={form.subject} onChange={e => set('subject', e.target.value)}
              className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Stem */}
        <Field label="Question stem">
          <textarea
            value={form.stem_text}
            onChange={e => set('stem_text', e.target.value)}
            rows={4}
            placeholder="Type the question here. Use ___ for fill-in-the-blank gaps."
            className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] resize-none focus:outline-none focus:border-oecs-teal"
          />
        </Field>

        {/* Choices (MCQ / drag / audio) */}
        {showChoices && (
          <Field label="Answer choices">
            <div className="flex flex-col gap-2">
              {form.choices.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-oecs-neutral-400">
                    {c.id.toUpperCase()}
                  </span>
                  <input
                    type="text"
                    value={c.text}
                    onChange={e => {
                      const next = [...form.choices];
                      next[i] = { ...c, text: e.target.value };
                      set('choices', next);
                    }}
                    placeholder={`Option ${c.id.toUpperCase()}`}
                    className="flex-1 rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[14px] focus:outline-none focus:border-oecs-teal"
                  />
                  {form.type === 'mcq' && (
                    <input type="radio" name="correct" value={c.id}
                      checked={form.correct_answer === c.id}
                      onChange={() => set('correct_answer', c.id)}
                      aria-label={`Mark option ${c.id.toUpperCase()} as correct`}
                      className="w-5 h-5 accent-oecs-teal" />
                  )}
                </div>
              ))}
            </div>
          </Field>
        )}

        {/* Correct answer (non-MCQ) */}
        {form.type === 'fill_blank' && (
          <Field label="Correct answer">
            <input type="text" value={form.correct_answer}
              onChange={e => set('correct_answer', e.target.value)}
              placeholder="Expected answer (case-insensitive)"
              className="w-full rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] focus:outline-none focus:border-oecs-teal"
            />
          </Field>
        )}
        {form.type === 'true_false' && (
          <Field label="Correct answer">
            <div className="flex gap-4">
              {['true', 'false'].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tf" value={v}
                    checked={form.correct_answer === v}
                    onChange={() => set('correct_answer', v)}
                    className="w-5 h-5 accent-oecs-teal" />
                  <span className="text-[14px] font-medium">{v === 'true' ? 'True' : 'False'}</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        {/* Marks */}
        <Field label="Marks">
          <input type="number" min={1} max={10} value={form.marks}
            onChange={e => set('marks', e.target.value)}
            className="w-24 rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] focus:outline-none focus:border-oecs-teal"
          />
        </Field>
      </main>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      <label className="text-sm font-medium text-oecs-neutral-800">{label}</label>
      {children}
    </div>
  );
}
