import { useEffect, useState } from 'react'
import type { AuthState, GalaxyResponse, SummaryResponse } from '../types/universe'

export const useGalaxyData = (auth: AuthState | null, apiBaseUrl: string) => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [galaxy, setGalaxy] = useState<GalaxyResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!auth) {
      setSummary(null)
      setGalaxy(null)
      setSelectedRepoId(null)
      return
    }

    const bootstrap = async () => {
      setSyncing(true)
      try {
        await fetch(
          `${apiBaseUrl}/oauth/repos?accessToken=${encodeURIComponent(auth.accessToken)}`,
        )
      } catch {
        // Ignore sync failures and still attempt to fetch summary.
      }

      try {
        const response = await fetch(`${apiBaseUrl}/universe/me/summary`, {
          headers: { Authorization: `Bearer ${auth.appToken}` },
        })
        if (!response.ok) {
          throw new Error('Failed to load summary.')
        }
        const data = (await response.json()) as SummaryResponse
        setSummary(data)
        if (!selectedRepoId && data.galaxies.length) {
          setSelectedRepoId(data.galaxies[0].repoId)
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Summary fetch failed.')
      } finally {
        setSyncing(false)
      }
    }

    void bootstrap()
  }, [apiBaseUrl, auth])

  useEffect(() => {
    if (!auth || !summary || !selectedRepoId) {
      return
    }

    const repo = summary.galaxies.find((item) => item.repoId === selectedRepoId)
    if (!repo) {
      return
    }

    const loadGalaxy = async () => {
      setSyncing(true)
      try {
        await fetch(
          `${apiBaseUrl}/oauth/commits?accessToken=${encodeURIComponent(
            auth.accessToken,
          )}&owner=${encodeURIComponent(auth.githubId)}&repo=${encodeURIComponent(repo.name)}`,
        )
      } catch {
        // Commit sync is optional for UI; proceed to load cached stars.
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/universe/me/galaxies/${repo.repoId}?types=commit,pr`,
          {
            headers: { Authorization: `Bearer ${auth.appToken}` },
          },
        )
        if (!response.ok) {
          throw new Error('Failed to load galaxy.')
        }
        const data = (await response.json()) as GalaxyResponse
        setGalaxy(data)
        setSummary((prev) => {
          if (!prev) {
            return prev
          }
          const updated = prev.galaxies.map((item) =>
            item.repoId === data.repoId
              ? { ...item, commitCount: data.counts.commits }
              : item,
          )
          return { ...prev, galaxies: updated }
        })
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Galaxy fetch failed.')
      } finally {
        setSyncing(false)
      }
    }

    void loadGalaxy()
  }, [apiBaseUrl, auth, summary, selectedRepoId])

  return {
    summary,
    selectedRepoId,
    setSelectedRepoId,
    galaxy,
    syncing,
    message,
    setMessage,
  }
}
