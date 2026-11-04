'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Info, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function Toaster() {
  const toast = useAppStore((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => {
      if (useAppStore.getState().toast?.id === toast.id) useAppStore.setState({ toast: null });
    }, 4500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 12, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="pointer-events-auto flex max-w-[440px] items-center gap-2 rounded-2xl border border-ink-500 bg-ink-700/95 px-4 py-3 text-sm shadow-card backdrop-blur"
            onClick={() => useAppStore.setState({ toast: null })}
          >
            {toast.tone === 'warning' ? (
              <TriangleAlert className="h-4 w-4 shrink-0 text-[#fab219]" aria-label="주의" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-gold-deep" aria-label="알림" />
            )}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
