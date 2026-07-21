import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminIcon } from '../admin/AdminIcons';

// Portal logout confirmation — both shells (admin + organizer) open this
// before actually signing out. Backdrop click / Esc cancels.
export default function LogoutConfirm({ open, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/45"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="font-portal relative w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-2xl"
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
              <AdminIcon.Logout size={20} />
            </span>
            <h2 className="mt-4 text-center text-lg font-bold text-gray-900">Log out?</h2>
            <p className="mt-1.5 text-center text-sm leading-relaxed text-gray-500">
              You&rsquo;ll be signed out of the portal and returned to the home page.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="h-10 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
