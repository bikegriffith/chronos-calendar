import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { familyColorList } from '@/styles/theme';
import type { FamilyMember } from '@shared/types';
import { AVATAR_EMOJIS } from '@shared/constants';
import { getCalendarList } from '@/services/calendarService';
import type { CalendarAccount } from '@/services/calendarService';
import { setConfig, normalizeFamilyMember } from '@/services/configService';

function generateId(): string {
  return `fm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface FamilyMemberSetupProps {
  onComplete: () => void;
}

export default function FamilyMemberSetup({ onComplete }: FamilyMemberSetupProps) {
  const [members, setMembers] = useState<FamilyMember[]>(() => [
    {
      id: generateId(),
      name: '',
      color: familyColorList[0].DEFAULT,
      avatar: '👤',
      calendarIds: [],
    },
  ]);
  const [calendarList, setCalendarList] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCalendarList()
      .then((list) => setCalendarList(list))
      .catch(() => setCalendarList([]))
      .finally(() => setLoading(false));
  }, []);

  const addMember = useCallback(() => {
    const usedColors = new Set(members.map((m) => m.color));
    const nextColor =
      familyColorList.find((c) => !usedColors.has(c.DEFAULT))?.DEFAULT ?? familyColorList[0].DEFAULT;
    setMembers((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        color: nextColor,
        avatar: AVATAR_EMOJIS[prev.length % AVATAR_EMOJIS.length],
        calendarIds: [],
      },
    ]);
  }, [members]);

  const updateMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== id)));
  }, []);

  const toggleCalendarForMember = useCallback((memberId: string, calendarId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const ids = m.calendarIds ?? [];
        const next = ids.includes(calendarId)
          ? ids.filter((c) => c !== calendarId)
          : [...ids, calendarId];
        return { ...m, calendarIds: next };
      })
    );
  }, []);

  const handleFinish = useCallback(async () => {
    const valid = members
      .filter((m) => m.name.trim())
      .map((m) => normalizeFamilyMember({ ...m, name: m.name.trim() }));
    if (valid.length === 0) {
      setError('Add at least one family member with a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setConfig({
        familyMembers: valid,
        familySetupComplete: true,
      });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }, [members, onComplete]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-dark-950 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-10 h-10 rounded-full border-2 border-accent-primary border-t-transparent animate-spin"
        />
        <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">Loading your calendars…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-dark-950">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-shrink-0 px-6 pt-12 pb-6 text-center"
      >
        <h1 className="font-display text-heading-xl font-semibold text-neutral-900 dark:text-neutral-dark-50 mb-2">
          Welcome to your family calendar
        </h1>
        <p className="text-body text-neutral-600 dark:text-neutral-dark-400 max-w-md mx-auto">
          Add everyone who shares a calendar. You’ll pick a color and emoji for each person and link their Google calendars.
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {members.map((member) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-2xl bg-white dark:bg-neutral-dark-900 border border-neutral-200 dark:border-neutral-dark-700 shadow-card dark:shadow-dark-card overflow-hidden"
              >
                <div className="p-4 flex items-start gap-4">
                  <motion.span
                    className="text-3xl shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-dark-800"
                    style={{ backgroundColor: `${member.color}22` }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {member.avatar ?? '👤'}
                  </motion.span>
                  <div className="flex-1 min-w-0 space-y-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateMember(member.id, { name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-800 text-neutral-900 dark:text-neutral-dark-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-dark-500 text-body font-medium focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                    />
                    <div className="flex flex-wrap gap-2">
                      {familyColorList.map((c) => (
                        <button
                          key={c.DEFAULT}
                          type="button"
                          onClick={() => updateMember(member.id, { color: c.DEFAULT })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary ${
                            member.color === c.DEFAULT
                              ? 'border-neutral-800 dark:border-neutral-dark-200 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.DEFAULT }}
                          aria-label={`Color ${c.DEFAULT}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => updateMember(member.id, { avatar: emoji })}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                            member.avatar === emoji
                              ? 'bg-accent-primary/20 ring-2 ring-accent-primary'
                              : 'bg-neutral-100 dark:bg-neutral-dark-800 hover:bg-neutral-200 dark:hover:bg-neutral-dark-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {calendarList.length > 0 && (
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-dark-800">
                        <p className="text-caption font-medium text-neutral-500 dark:text-neutral-dark-400 mb-2">
                          Calendars for {member.name || 'this person'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {calendarList.map((cal) => {
                            const selected = (member.calendarIds ?? []).includes(cal.id);
                            return (
                              <button
                                key={cal.id}
                                type="button"
                                onClick={() => toggleCalendarForMember(member.id, cal.id)}
                                className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors ${
                                  selected
                                    ? 'text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-dark-700 text-neutral-700 dark:text-neutral-dark-300 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600'
                                }`}
                                style={selected ? { backgroundColor: cal.backgroundColor ?? member.color } : undefined}
                              >
                                {cal.summary || cal.id.slice(0, 12)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="shrink-0 p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label="Remove member"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={addMember}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-dark-600 text-neutral-600 dark:text-neutral-dark-400 hover:border-accent-primary hover:text-accent-primary dark:hover:text-accent-primary font-medium transition-colors flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-xl">+</span> Add another person
          </motion.button>
        </div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-shrink-0 px-4 py-6 bg-white/80 dark:bg-neutral-dark-900/80 border-t border-neutral-200 dark:border-neutral-dark-700"
      >
        <div className="max-w-lg mx-auto space-y-3">
          {error && (
            <p className="text-body-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}
          <motion.button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-accent-primary text-white font-semibold text-body shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none transition-all"
            whileHover={!saving ? { scale: 1.02 } : undefined}
            whileTap={!saving ? { scale: 0.98 } : undefined}
          >
            {saving ? 'Saving…' : "We're all set — go to calendar"}
          </motion.button>
        </div>
      </motion.footer>
    </div>
  );
}
