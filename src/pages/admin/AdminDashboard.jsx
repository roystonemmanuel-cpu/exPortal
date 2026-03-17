import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore.js';

const NAV_ITEMS = [
  { to: '/admin/item-bank', label: 'admin.item_bank', icon: '📋' },
  { to: '/admin/exam-builder', label: 'admin.exam_builder', icon: '🏗️' },
  { to: '/admin/scheduler', label: 'admin.scheduler', icon: '📅' },
  { to: '/admin/analytics', label: 'admin.analytics', icon: '📊' },
  { to: '/admin/results', label: 'admin.results', icon: '🏆' },
  { to: '/admin/marking-queue', label: 'admin.marking_queue', icon: '✏️' },
];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { profile, signOut } = useSessionStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-oecs-navy text-white px-4 py-4 flex items-center justify-between">
        <h1 className="text-[16px] font-semibold">{t('admin.title')}</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-80">{profile?.full_name}</span>
          <button onClick={async () => { await signOut(); navigate('/login'); }}
            className="text-xs underline opacity-80">
            {t('common.sign_out')}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4">
          {NAV_ITEMS.map(item => (
            <Link key={item.to} to={item.to}
              className="bg-white rounded-2xl border-2 border-oecs-neutral-400 p-6 flex flex-col items-center gap-3 text-center hover:border-oecs-navy transition-colors min-h-[100px] justify-center">
              <span aria-hidden="true" className="text-3xl">{item.icon}</span>
              <span className="text-[14px] font-semibold text-oecs-neutral-800">{t(item.label)}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
