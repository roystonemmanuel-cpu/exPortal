import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signIn } from '../../lib/supabase.js';

/**
 * Invigilator (and admin) email+password login screen.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    // sessionStore.init will pick up the auth change; navigate to dashboard
    navigate('/invigilator');
  }

  return (
    <div className="min-h-screen bg-oecs-navy flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold text-oecs-neutral-800">OECS Examination Portal</h1>
          <p className="text-sm text-oecs-neutral-400 mt-1">Invigilator / Admin Sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-oecs-neutral-800">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] text-oecs-neutral-800 focus:outline-none focus:border-oecs-teal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-oecs-neutral-800">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-3 text-[15px] text-oecs-neutral-800 focus:outline-none focus:border-oecs-teal"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-oecs-amber text-center">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="py-4 rounded-xl bg-oecs-teal text-white font-semibold min-h-[52px] mt-2">
            {loading ? t('common.loading') : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
