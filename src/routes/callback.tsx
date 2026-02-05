import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { exchangeCodeForTokens, isBrowserAuthConfigured } from '@/services/googleAuth'

export const Route = createFileRoute('/callback')({
  component: CallbackPage,
})

function CallbackPage() {
  const [status, setStatus] = useState<'exchanging' | 'done' | 'error'>('exchanging')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code || !isBrowserAuthConfigured()) {
      setStatus('done')
      return
    }
    exchangeCodeForTokens(code)
      .then(() => {
        setStatus('done')
        window.location.replace('/')
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'exchanging') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Completing sign-in…</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 px-4">
        <p className="text-slate-300 text-center">Sign-in failed. You can close this and try again.</p>
        <a
          href="/"
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          Back to app
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-slate-400">Redirecting…</div>
    </div>
  )
}
