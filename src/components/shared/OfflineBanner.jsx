import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Thin banner that appears when the device goes offline and disappears on reconnect.
 * Uses amber (not coral/red) per design spec — never show red to students.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="bg-oecs-amber-light border-b border-oecs-amber text-oecs-amber text-sm font-medium text-center py-2 px-4"
        >
          {t('app.offline')}
        </motion.div>
      )}
      {!isOffline && showReconnected && (
        <motion.div
          key="online"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="bg-oecs-teal-light border-b border-oecs-teal text-oecs-teal text-sm font-medium text-center py-2 px-4"
        >
          {t('app.online')}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
