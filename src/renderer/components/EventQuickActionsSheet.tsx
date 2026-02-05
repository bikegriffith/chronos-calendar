import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import type { CalendarEvent as ServiceCalendarEvent } from '../services/calendarService';

export interface EventQuickActionsSheetProps {
  event: ServiceCalendarEvent | null;
  onClose: () => void;
  onEdit: (event: ServiceCalendarEvent) => void;
  onDelete: (event: ServiceCalendarEvent) => void;
}

export default function EventQuickActionsSheet({
  event,
  onClose,
  onEdit,
  onDelete,
}: EventQuickActionsSheetProps) {
  const handleEdit = useCallback(() => {
    if (event) {
      onEdit(event);
      onClose();
    }
  }, [event, onEdit, onClose]);

  const handleDelete = useCallback(() => {
    if (event) {
      onDelete(event);
      onClose();
    }
  }, [event, onDelete, onClose]);

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm"
            aria-hidden
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Event actions"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white dark:bg-neutral-dark-800 shadow-modal border-t border-neutral-200 dark:border-neutral-dark-600 overflow-hidden safe-area-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 pb-6">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-dark-600 mx-auto mb-3" />
              <p className="text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 px-2 mb-3 truncate text-center">
                {event.summary || '(No title)'}
              </p>
              <div className="flex flex-col gap-1">
                <motion.button
                  type="button"
                  onClick={handleEdit}
                  className="flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-xl text-left text-body font-medium text-neutral-900 dark:text-neutral-dark-50 hover:bg-neutral-100 dark:hover:bg-neutral-dark-700 active:bg-neutral-200 dark:active:bg-neutral-dark-600 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-dark-600">
                    <Pencil className="w-5 h-5 text-neutral-600 dark:text-neutral-dark-300" />
                  </span>
                  Edit event
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-xl text-left text-body font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40">
                    <Trash2 className="w-5 h-5" />
                  </span>
                  Delete event
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
