import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, Calendar, Moon, Mic } from 'lucide-react';
import { familyColorList } from '../styles/theme';
import type { FamilyMember, ChronosConfig, AppSettings } from '@shared/types';
import { getCalendarList } from '../services/calendarService';
import type { CalendarAccount } from '../services/calendarService';
import { getConfig, setConfig, normalizeFamilyMember } from '../services/configService';
import { login, logout } from '../services/googleAuth';

const AVATAR_EMOJIS = ['👩', '👨', '👧', '👦', '🧑', '👴', '👵', '👶', '🧒', '🌟', '💜', '🌈'];

const VOICE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'nl-NL', label: 'Dutch' },
  { value: 'hi-IN', label: 'Hindi' },
];

function generateId(): string {
  return `fm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface SettingsScreenProps {
  open: boolean;
  onClose: () => void;
  onDisconnect?: () => void;
  onConfigChange?: () => void;
}

export default function SettingsScreen({ open, onClose, onDisconnect, onConfigChange }: SettingsScreenProps) {
  const [config, setConfigState] = useState<ChronosConfig | null>(null);
  const [calendarList, setCalendarList] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleReconnecting, setGoogleReconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, cals] = await Promise.all([getConfig(), getCalendarList().catch(() => [])]);
      setConfigState(cfg);
      setCalendarList(cals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      if (!config) return;
      setSaving(true);
      try {
        const next = await setConfig({ settings: { ...config.settings, ...updates } });
        setConfigState(next);
        onConfigChange?.();
      } finally {
        setSaving(false);
      }
    },
    [config, onConfigChange]
  );

  const updateMembers = useCallback(
    async (members: FamilyMember[]) => {
      setSaving(true);
      try {
        const next = await setConfig({ familyMembers: members.map(normalizeFamilyMember) });
        setConfigState(next);
        onConfigChange?.();
      } finally {
        setSaving(false);
      }
    },
    [onConfigChange]
  );

  const addMember = useCallback(() => {
    if (!config) return;
    const usedColors = new Set(config.familyMembers.map((m) => m.color));
    const nextColor =
      familyColorList.find((c) => !usedColors.has(c.DEFAULT))?.DEFAULT ?? familyColorList[0].DEFAULT;
    const newMember: FamilyMember = {
      id: generateId(),
      name: '',
      color: nextColor,
      avatar: '👤',
      calendarIds: [],
    };
    updateMembers([...config.familyMembers, newMember]);
  }, [config, updateMembers]);

  const updateMember = useCallback(
    (id: string, updates: Partial<FamilyMember>) => {
      if (!config) return;
      updateMembers(
        config.familyMembers.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    [config, updateMembers]
  );

  const removeMember = useCallback(
    (id: string) => {
      if (!config || config.familyMembers.length <= 1) return;
      updateMembers(config.familyMembers.filter((m) => m.id !== id));
    },
    [config, updateMembers]
  );

  const toggleCalendarForMember = useCallback(
    (memberId: string, calendarId: string) => {
      if (!config) return;
      updateMembers(
        config.familyMembers.map((m) => {
          if (m.id !== memberId) return m;
          const ids = m.calendarIds ?? [];
          const next = ids.includes(calendarId)
            ? ids.filter((c) => c !== calendarId)
            : [...ids, calendarId];
          return { ...m, calendarIds: next };
        })
      );
    },
    [config, updateMembers]
  );

  const handleDisconnect = useCallback(async () => {
    await logout();
    onDisconnect?.();
    onClose();
  }, [onDisconnect, onClose]);

  const handleReconnect = useCallback(async () => {
    setGoogleReconnecting(true);
    try {
      await login();
      await load();
    } finally {
      setGoogleReconnecting(false);
    }
  }, [load]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-neutral-900/40 dark:bg-neutral-dark-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-dark-900 shadow-modal dark:shadow-dark-modal flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-dark-700">
          <h2 className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-dark-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
            </div>
          ) : config ? (
            <>
              {/* Family members */}
              <section>
                <h3 className="flex items-center gap-2 text-body-sm font-semibold text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide mb-3">
                  <User className="w-4 h-4" /> Family members
                </h3>
                <div className="space-y-3">
                  {config.familyMembers.map((member) => (
                    <motion.div
                      key={member.id}
                      layout
                      className="rounded-xl border border-neutral-200 dark:border-neutral-dark-700 bg-neutral-50 dark:bg-neutral-dark-800/50 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg shrink-0"
                          style={{ backgroundColor: `${member.color}22` }}
                        >
                          {member.avatar ?? '👤'}
                        </span>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMember(member.id, { name: e.target.value })}
                          placeholder="Name"
                          className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-800 text-body font-medium focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                        {config.familyMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 rounded-lg"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {familyColorList.map((c) => (
                          <button
                            key={c.DEFAULT}
                            type="button"
                            onClick={() => updateMember(member.id, { color: c.DEFAULT })}
                            className={`w-6 h-6 rounded-full border-2 ${
                              member.color === c.DEFAULT ? 'border-neutral-800 dark:border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c.DEFAULT }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {AVATAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => updateMember(member.id, { avatar: emoji })}
                            className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center ${
                              member.avatar === emoji ? 'bg-accent-primary/20 ring-2 ring-accent-primary' : 'bg-white dark:bg-neutral-dark-700'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {calendarList.length > 0 && (
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-dark-700">
                          <p className="text-caption text-neutral-500 dark:text-neutral-dark-400 mb-2">Calendars</p>
                          <div className="flex flex-wrap gap-1.5">
                            {calendarList.map((cal) => {
                              const selected = (member.calendarIds ?? []).includes(cal.id);
                              return (
                                <button
                                  key={cal.id}
                                  type="button"
                                  onClick={() => toggleCalendarForMember(member.id, cal.id)}
                                  className={`px-2 py-1 rounded-md text-caption font-medium ${
                                    selected ? 'text-white' : 'bg-neutral-200 dark:bg-neutral-dark-600 text-neutral-700 dark:text-neutral-dark-300'
                                  }`}
                                  style={selected ? { backgroundColor: cal.backgroundColor ?? member.color } : undefined}
                                >
                                  {cal.summary || cal.id.slice(0, 10)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={addMember}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-dark-600 text-neutral-500 dark:text-neutral-dark-400 text-body-sm font-medium hover:border-accent-primary hover:text-accent-primary transition-colors"
                  >
                    + Add family member
                  </button>
                </div>
              </section>

              {/* Google account */}
              <section>
                <h3 className="flex items-center gap-2 text-body-sm font-semibold text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide mb-3">
                  <Calendar className="w-4 h-4" /> Google Calendar
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-dark-800 text-neutral-700 dark:text-neutral-dark-200 hover:bg-neutral-200 dark:hover:bg-neutral-dark-700 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={googleReconnecting}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-primary text-white font-medium hover:opacity-95 disabled:opacity-60 transition-colors"
                  >
                    {googleReconnecting ? 'Connecting…' : 'Reconnect'}
                  </button>
                </div>
              </section>

              {/* Dark mode */}
              <section>
                <h3 className="flex items-center gap-2 text-body-sm font-semibold text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide mb-3">
                  <Moon className="w-4 h-4" /> Appearance
                </h3>
                <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
                  <span className="text-body text-neutral-800 dark:text-neutral-dark-100">Dark mode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.settings.darkMode}
                    onClick={() => updateSettings({ darkMode: !config.settings.darkMode })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      config.settings.darkMode ? 'bg-accent-primary' : 'bg-neutral-300 dark:bg-neutral-dark-600'
                    }`}
                  >
                    <motion.span
                      layout
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: config.settings.darkMode ? 22 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </label>
              </section>

              {/* Voice language */}
              <section>
                <h3 className="flex items-center gap-2 text-body-sm font-semibold text-neutral-500 dark:text-neutral-dark-400 uppercase tracking-wide mb-3">
                  <Mic className="w-4 h-4" /> Voice input language
                </h3>
                <select
                  value={config.settings.voiceLanguage}
                  onChange={(e) => updateSettings({ voiceLanguage: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-800 text-neutral-900 dark:text-neutral-dark-50 text-body focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  {VOICE_LANGUAGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-caption text-neutral-500 dark:text-neutral-dark-400">
                  Used when adding events by voice (browser only).
                </p>
              </section>
            </>
          ) : null}
        </div>

        {saving && (
          <div className="flex-shrink-0 px-4 py-2 text-center text-caption text-neutral-500 dark:text-neutral-dark-400">
            Saving…
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
