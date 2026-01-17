import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
    [],
  )
  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI as string | undefined

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      return
    }

    const sendCode = async () => {
      setStatus('loading')
      try {
        const response = await fetch(`${apiBaseUrl}/oauth/github-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          throw new Error('GitHub OAuth failed.')
        }

        setStatus('success')
        setMessage('GitHub OAuth success.')
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Unknown error.')
      } finally {
        const nextUrl = window.location.pathname
        window.history.replaceState({}, '', nextUrl)
      }
    }

    void sendCode()
  }, [apiBaseUrl])

  const handleGithubLogin = () => {
    if (!githubClientId) {
      setStatus('error')
      setMessage('Missing VITE_GITHUB_CLIENT_ID.')
      return
    }

    const targetRedirect =
      redirectUri ?? `${window.location.origin}${window.location.pathname}`
    const authorizeUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${encodeURIComponent(githubClientId)}` +
      `&redirect_uri=${encodeURIComponent(targetRedirect)}` +
      `&scope=read:user`

    window.location.href = authorizeUrl
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#0b0b0b_60%)] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)] backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">GitHub OAuth</h1>
        <p className="mt-3 text-sm text-slate-300">
          Connect your GitHub account to sync repos into the universe.
        </p>
        <button
          type="button"
          onClick={handleGithubLogin}
          className="mt-8 w-full rounded-xl border border-white/10 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110"
        >
          Connect GitHub
        </button>
        <div className="mt-4 text-xs text-slate-400">
          Status: {status}
          {message ? ` - ${message}` : ''}
        </div>
      </div>
    </main>
  )
}

export default App
