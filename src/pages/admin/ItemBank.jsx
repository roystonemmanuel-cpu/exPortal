import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';
import { QuestionEditor } from '../../components/admin/QuestionEditor.jsx';

const SUBJECTS = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies'];
const GRADES = ['K', '1', '2', '3', '4', '5', '6'];
const TYPES = ['mcq', 'true_false', 'fill_blank', 'drag_order', 'image_label', 'audio', 'short_answer'];

/**
 * Admin item bank — list, search, filter questions; open editor to create/edit.
 */
export default function ItemBank() {
  const { t } = useTranslation();
  const { profile } = useSessionStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null); // null = list view

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', profile?.school_id, search, filterGrade, filterSubject],
    queryFn: async () => {
      let q = supabase
        .from('questions')
        .select('id, type, stem_text, subject, grade_level, retired_at')
        .eq('school_id', profile.school_id)
        .is('retired_at', null)
        .order('created_at', { ascending: false });

      if (search) q = q.ilike('stem_text', `%${search}%`);
      if (filterGrade) q = q.eq('grade_level', filterGrade);
      if (filterSubject) q = q.eq('subject', filterSubject);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.school_id),
  });

  const retireMutation = useMutation({
    mutationFn: (id) => supabase.from('questions').update({ retired_at: new Date().toISOString() }).eq('id', id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });

  if (editingQuestion !== null) {
    return (
      <QuestionEditor
        question={editingQuestion === 'new' ? null : editingQuestion}
        schoolId={profile?.school_id}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['questions'] }); setEditingQuestion(null); }}
        onCancel={() => setEditingQuestion(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-4">
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">{t('admin.item_bank')}</h1>
        <button
          onClick={() => setEditingQuestion('new')}
          className="tap-target px-4 py-2 rounded-xl bg-oecs-teal text-white text-sm font-semibold"
        >
          + {t('admin.new_question')}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Search + filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.search_placeholder')}
            className="flex-1 min-w-[180px] rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[14px] focus:outline-none focus:border-oecs-teal"
          />
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            className="rounded-xl border-2 border-oecs-neutral-400 px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            <option value="">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="rounded-xl border-2 border-oecs-neutral-400 px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Question list */}
        {isLoading && <p className="text-oecs-neutral-400 text-sm">{t('common.loading')}</p>}
        {!isLoading && questions.length === 0 && (
          <p className="text-oecs-neutral-400 text-sm">No questions found. Create one to get started.</p>
        )}

        <ul className="flex flex-col gap-2">
          {questions.map(q => (
            <li key={q.id} className="bg-white rounded-xl border-2 border-oecs-neutral-400 px-4 py-4 flex gap-4 items-start">
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <p className="text-[14px] text-oecs-neutral-800 truncate font-medium">{q.stem_text ?? '(No stem)'}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge label={q.type} />
                  <Badge label={q.subject} />
                  <Badge label={q.grade_level === 'K' ? 'Kindergarten' : `Grade ${q.grade_level}`} />
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditingQuestion(q)}
                  className="tap-target px-3 py-1.5 rounded-lg border border-oecs-neutral-400 text-xs text-oecs-neutral-800">
                  Edit
                </button>
                <button onClick={() => retireMutation.mutate(q.id)}
                  className="tap-target px-3 py-1.5 rounded-lg border border-oecs-neutral-400 text-xs text-oecs-neutral-400">
                  {t('admin.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function Badge({ label }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-oecs-navy-light text-oecs-navy text-[11px] font-medium">
      {label}
    </span>
  );
}
