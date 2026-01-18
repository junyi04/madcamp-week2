import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuthState } from '../types/universe'

const authStorageKey = 'universe_auth'

const getStoredAuth = () => {
  const raw = localStorage.getItem(authStorageKey)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthState
  } catch {
    return null
  }
}

export const useAuth = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [auth, setAuth] = useState<AuthState | null>(() => getStoredAuth())
  const didSubmitRef = useRef(false)

  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
    [],
  )
  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI as string | undefined

  const storeAuth = (nextAuth: AuthState | null) => {
    if (!nextAuth) {
      localStorage.removeItem(authStorageKey)
      setAuth(null)
      return
    }
    localStorage.setItem(authStorageKey, JSON.stringify(nextAuth))
    setAuth(nextAuth)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      return
    }
    if (auth) {
      const nextUrl = window.location.pathname
      window.history.replaceState({}, '', nextUrl)
      return
    }
    if (didSubmitRef.current) {
      return
    }
    didSubmitRef.current = true

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

        const payload = (await response.json()) as {
          data?: { user?: { appToken: string; accessToken: string; githubId: string } }
        }
        if (!payload.data?.user?.appToken) {
          throw new Error('Missing GitHub session.')
        }

        storeAuth({
          appToken: payload.data.user.appToken,
          accessToken: payload.data.user.accessToken,
          githubId: payload.data.user.githubId,
        })
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

  const handleLogout = () => {
    storeAuth(null)
    setStatus('idle')
    setMessage('')
  }

  return {
    auth,
    status,
    message,
    setMessage,
    apiBaseUrl,
    handleGithubLogin,
    handleLogout,
  }
}
