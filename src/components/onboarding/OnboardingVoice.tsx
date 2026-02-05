import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MessageCircle } from 'lucide-react'
import VoiceButton from '@/components/VoiceButton'
import {
  requestMicrophonePermission,
  isVoiceInputAvailable,
} from '@/services/voiceRecorder'

const EXAMPLE_COMMANDS = [
  'Add dentist appointment for Sarah next Tuesday at 2pm',
  'Soccer practice every Thursday at 4pm',
  'Family dinner at 6pm tomorrow',
]

export interface OnboardingVoiceProps {
  onContinue: () => void
}

export default function OnboardingVoice({ onContinue }: OnboardingVoiceProps) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [testTranscript, setTestTranscript] = useState('')

  const handleRequestPermission = async () => {
    const ok = await requestMicrophonePermission()
    setPermissionGranted(ok)
  }

  const handleTestResult = (text: string) => {
    setTestTranscript(text)
  }

  const voiceSupported = isVoiceInputAvailable()

  return (
    <motion.div
      className="flex flex-col items-center text-center px-6 py-8 min-h-[80vh] justify-center"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="w-20 h-20 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Mic className="w-10 h-10 text-sky-500" />
      </motion.div>
      <h2 className="mt-8 text-2xl font-bold text-slate-800 dark:text-slate-100">
        Enable voice
      </h2>
      <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-md">
        Add events by speaking. We’ll use your device’s microphone and browser speech recognition—no extra apps.
      </p>

      {!voiceSupported && (
        <p className="mt-4 text-amber-600 dark:text-amber-400 text-sm">
          Voice isn’t supported in this browser. Try Chrome or Edge. You can still use the calendar without it.
        </p>
      )}

      {voiceSupported && permissionGranted === null && (
        <motion.button
          type="button"
          onClick={handleRequestPermission}
          className="mt-8 px-6 py-3 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Allow microphone access
        </motion.button>
      )}

      {voiceSupported && permissionGranted === true && (
        <motion.div
          className="mt-8 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Try saying something like:
          </p>
          <ul className="flex flex-col gap-2 text-left max-w-sm">
            {EXAMPLE_COMMANDS.map((cmd, i) => (
              <motion.li
                key={cmd}
                className="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <span className="italic">&ldquo;{cmd}&rdquo;</span>
              </motion.li>
            ))}
          </ul>
          <div className="mt-4">
            <VoiceButton onResult={handleTestResult} />
          </div>
          {testTranscript && (
            <motion.p
              className="text-sm text-slate-600 dark:text-slate-400 max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Heard: &ldquo;{testTranscript}&rdquo;
            </motion.p>
          )}
        </motion.div>
      )}

      {voiceSupported && permissionGranted === false && (
        <motion.p
          className="mt-4 text-amber-600 dark:text-amber-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Microphone access was denied. You can enable it later in browser settings and still use the calendar.
        </motion.p>
      )}

      <motion.div
        className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 w-full max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-caption text-slate-500 dark:text-slate-400">
          Optional: For smart parsing of voice into event title, time, and date, your team can set up an Anthropic API key on the server. See README for details.
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onContinue}
        className="mt-8 px-8 py-3.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue
      </motion.button>
    </motion.div>
  )
}
