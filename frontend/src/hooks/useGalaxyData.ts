import { useEffect, useRef, useState } from 'react'
import type { AuthState, GalaxyResponse, SummaryResponse } from '../types/universe'

export const useGalaxyData = (auth: AuthState | null, apiBaseUrl: string) => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [galaxy, setGalaxy] = useState<GalaxyResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const lastSyncedRepoRef = useRef<number | null>(null)
  const backgroundSyncedReposRef = useRef<Set<number>>(new Set())
  const summaryRefreshTimeoutRef = useRef<number | null>(null)
  const summaryRefreshQueueRef = useRef(0)
  const summaryRefreshInFlightRef = useRef(false)

  const fetchSummary = async (withSync: boolean) => {
    if (!auth) {
      return
    }

    if (withSync) {
      setSyncing(true)
      try {
        await fetch(`${apiBaseUrl}/oauth/repos`, {
          headers: { Authorization: `Bearer ${auth.appToken}` },
        })
      } catch {
        // Ignore sync failures and still attempt to fetch summary.
      }
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Summary fetch failed.')
    } finally {
      if (withSync) {
        setSyncing(false)
      }
    }
  }

  const scheduleSummaryRefresh = (count = 1) => {
    summaryRefreshQueueRef.current += count
    if (summaryRefreshTimeoutRef.current != null || summaryRefreshInFlightRef.current) {
      return
    }
    summaryRefreshTimeoutRef.current = window.setTimeout(async () => {
      summaryRefreshTimeoutRef.current = null
      if (summaryRefreshQueueRef.current <= 0) {
        return
      }
      summaryRefreshQueueRef.current -= 1
      summaryRefreshInFlightRef.current = true
      try {
        await fetchSummary(false)
      } finally {
        summaryRefreshInFlightRef.current = false
        if (summaryRefreshQueueRef.current > 0) {
          scheduleSummaryRefresh(0)
        }
      }
    }, 600)
  }


  useEffect(() => {
    if (!auth) {
      setSummary(null)
      setGalaxy(null)
      setSelectedRepoId(null)
      lastSyncedRepoRef.current = null
      backgroundSyncedReposRef.current.clear()
      if (summaryRefreshTimeoutRef.current) {
        window.clearTimeout(summaryRefreshTimeoutRef.current)
        summaryRefreshTimeoutRef.current = null
      }
      summaryRefreshQueueRef.current = 0
      summaryRefreshInFlightRef.current = false
      return
    }

    void fetchSummary(true)
  }, [apiBaseUrl, auth])

  useEffect(() => {
    if (!auth) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchSummary(false)
    }, 180000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [apiBaseUrl, auth])

  useEffect(() => {
    if (!auth || !summary) {
      return
    }

    let cancelled = false

    const loadAggregateGalaxy = async () => {
      setSyncing(true)
      try {
        const responses = await Promise.all(
          summary.galaxies.map((repo) =>
            fetch(`${apiBaseUrl}/universe/me/galaxies/${repo.repoId}?types=commit,pr`, {
              headers: { Authorization: `Bearer ${auth.appToken}` },
            }),
          ),
        )
        if (cancelled) {
          return
        }
        const failed = responses.find((res) => !res.ok)
        if (failed) {
          throw new Error('Failed to load galaxies.')
        }
        const galaxies = (await Promise.all(
          responses.map((res) => res.json()),
        )) as GalaxyResponse[]
        if (cancelled) {
          return
        }

        const merged = galaxies.flatMap((entry) => entry.celestialObjects)
        const counts = galaxies.reduce(
          (acc, entry) => ({
            commits: acc.commits + entry.counts.commits,
            prs: acc.prs + entry.counts.prs,
          }),
          { commits: 0, prs: 0 },
        )

        setGalaxy({
          repoId: 0,
          name: 'All Repos',
          celestialObjects: merged,
          counts,
        })
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Galaxy fetch failed.')
        }
      } finally {
        if (!cancelled) {
          setSyncing(false)
        }
      }
    }

    const loadSingleGalaxy = async (repoId: number) => {
      const repo = summary.galaxies.find((item) => item.repoId === repoId)
      if (!repo) {
        return
      }

      setSyncing(true)
      if (lastSyncedRepoRef.current !== repoId) {
        lastSyncedRepoRef.current = repoId
        try {
          const syncResponse = await fetch(
            `${apiBaseUrl}/oauth/commits/sync?repoId=${encodeURIComponent(repo.repoId)}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${auth.appToken}` },
            },
          )
          if (!syncResponse.ok) {
            throw new Error('Failed to sync commits.')
          }
          scheduleSummaryRefresh(2)
        } catch (error) {
          if (!cancelled) {
            setMessage(error instanceof Error ? error.message : 'Commit sync failed.')
          }
        }
        if (cancelled) {
          return
        }
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/universe/me/galaxies/${repo.repoId}?types=commit,pr`,
          {
            headers: { Authorization: `Bearer ${auth.appToken}` },
          },
        )
        if (cancelled) {
          return
        }
        if (!response.ok) {
          throw new Error('Failed to load galaxy.')
        }
        const data = (await response.json()) as GalaxyResponse
        if (cancelled) {
          return
        }
        setGalaxy(data)
        setSummary((prev) => {
          if (!prev) {
            return prev
          }
          const current = prev.galaxies.find((item) => item.repoId === data.repoId)
          if (current?.commitCount === data.counts.commits) {
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
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Galaxy fetch failed.')
        }
      } finally {
        if (!cancelled) {
          setSyncing(false)
        }
      }
    }

    if (!selectedRepoId) {
      void loadAggregateGalaxy()
    } else {
      void loadSingleGalaxy(selectedRepoId)
    }

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, auth, summary, selectedRepoId])

  useEffect(() => {
    if (!auth || !summary) {
      return
    }

    let cancelled = false

    const repoIds = summary.galaxies
      .map((repo) => repo.repoId)
      .filter(
        (repoId) =>
          repoId !== selectedRepoId &&
          !backgroundSyncedReposRef.current.has(repoId),
      )

    if (!repoIds.length) {
      return undefined
    }

    const queue = [...repoIds]
    const concurrency = 3

    const syncRepo = async (repoId: number) => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/oauth/commits/sync?repoId=${encodeURIComponent(repoId)}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.appToken}` },
          },
        )
        if (!response.ok) {
          throw new Error('Failed to sync commits.')
        }
        backgroundSyncedReposRef.current.add(repoId)
        scheduleSummaryRefresh(2)
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Commit sync failed.')
        }
      }
    }

    const runWorker = async () => {
      while (queue.length && !cancelled) {
        const repoId = queue.shift()
        if (repoId == null) {
          return
        }
        await syncRepo(repoId)
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, () => runWorker()),
    )

    return () => {
      cancelled = true
    }
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
