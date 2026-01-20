import { useEffect, useRef, useState } from 'react'
import type { AuthState, GalaxyResponse, SummaryResponse } from '../types/universe'

export const useGalaxyData = (
  auth: AuthState | null,
  apiBaseUrl: string,
  selectedUserId: number | null,
) => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [galaxy, setGalaxy] = useState<GalaxyResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [message, setMessage] = useState('')
  const lastSyncedRepoRef = useRef<number | null>(null)
  const lastAggregateKeyRef = useRef<string | null>(null)
  const summaryOwnerRef = useRef<string | null>(null)
  const backgroundSyncInFlightRef = useRef<Set<number>>(new Set())
  const initialBackgroundSyncPendingRef = useRef(false)
  const prevAuthRef = useRef<AuthState | null>(null)
  const viewLoadingStartedAtRef = useRef<number | null>(null)
  const viewLoadingTimeoutRef = useRef<number | null>(null)
  const isViewingFriend = selectedUserId != null
  const VIEW_LOADING_MIN_MS = 2000
  const currentViewKey = selectedUserId == null ? 'me' : String(selectedUserId)

  const beginViewLoading = () => {
    if (viewLoadingTimeoutRef.current != null) {
      window.clearTimeout(viewLoadingTimeoutRef.current)
      viewLoadingTimeoutRef.current = null
    }
    viewLoadingStartedAtRef.current = Date.now()
    setViewLoading(true)
  }

  const finishViewLoading = () => {
    const startedAt = viewLoadingStartedAtRef.current
    if (!startedAt) {
      setViewLoading(false)
      return
    }

    const elapsed = Date.now() - startedAt
    const remaining = VIEW_LOADING_MIN_MS - elapsed
    if (remaining <= 0) {
      setViewLoading(false)
      return
    }

    if (viewLoadingTimeoutRef.current != null) {
      window.clearTimeout(viewLoadingTimeoutRef.current)
    }
    viewLoadingTimeoutRef.current = window.setTimeout(() => {
      setViewLoading(false)
      viewLoadingTimeoutRef.current = null
    }, remaining)
  }

  const backgroundSyncedReposRef = useRef<Set<number>>(new Set())
  const summaryRefreshTimeoutRef = useRef<number | null>(null)
  const summaryRefreshQueueRef = useRef(0)
  const summaryRefreshInFlightRef = useRef(false)

  // 레포를 폴링 방식으로 30초마다 호출
  const fetchSummary = async (withSync: boolean) => {
    if (!auth) {
      return
    }

    let summaryOk = false
    if (isViewingFriend) {
      withSync = false
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
      const summaryUrl = isViewingFriend
        ? `${apiBaseUrl}/universe/users/${selectedUserId}/summary`
        : `${apiBaseUrl}/universe/me/summary`
      const response = await fetch(summaryUrl, {
        headers: { Authorization: `Bearer ${auth.appToken}` },
      })
      if (!response.ok) {
        if (isViewingFriend && (response.status === 403 || response.status === 404)) {
          setSummary(null)
          setGalaxy(null)
          setSelectedRepoId(null)
          setMessage(
            response.status === 403
              ? 'Friend universe is private.'
              : 'Friend universe not found.',
          )
          return
        }
        throw new Error('Failed to load summary.')
      }
      const data = (await response.json()) as SummaryResponse
      setSummary(data)
      setMessage('')
      summaryOwnerRef.current = currentViewKey
      summaryOk = true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Summary fetch failed.')
    } finally {
      if (withSync) {
        setSyncing(false)
      }
      if (!summaryOk) {
        finishViewLoading()
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
      prevAuthRef.current = null
      initialBackgroundSyncPendingRef.current = false
      lastAggregateKeyRef.current = null
      summaryOwnerRef.current = null
      viewLoadingStartedAtRef.current = null
      if (viewLoadingTimeoutRef.current != null) {
        window.clearTimeout(viewLoadingTimeoutRef.current)
        viewLoadingTimeoutRef.current = null
      }
      return
    }

    if (!prevAuthRef.current) {
      initialBackgroundSyncPendingRef.current = true
    }

    prevAuthRef.current = auth
  }, [auth])


  useEffect(() => {
    if (!auth) {
      setViewLoading(false)
      setMessage('')
      return
    }

    beginViewLoading()
    setSummary(null)
    setGalaxy(null)
    setMessage('')
    lastAggregateKeyRef.current = null
    summaryOwnerRef.current = null
  }, [auth, selectedUserId])

  useEffect(() => {
    if (!auth) {
      setSummary(null)
      setGalaxy(null)
      setSelectedRepoId(null)
      lastSyncedRepoRef.current = null
      lastAggregateKeyRef.current = null
      summaryOwnerRef.current = null
      backgroundSyncedReposRef.current.clear()
      if (summaryRefreshTimeoutRef.current) {
        window.clearTimeout(summaryRefreshTimeoutRef.current)
        summaryRefreshTimeoutRef.current = null
      }
      summaryRefreshQueueRef.current = 0
      summaryRefreshInFlightRef.current = false
      setViewLoading(false)
      initialBackgroundSyncPendingRef.current = false
      return
    }

    void fetchSummary(true)
  }, [apiBaseUrl, auth, selectedUserId])

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
  }, [apiBaseUrl, auth, selectedUserId])

  useEffect(() => {
    if (!auth || !summary) {
      return
    }

    if (summaryOwnerRef.current !== currentViewKey) {
      return
    }

    let cancelled = false

    const loadAggregateGalaxy = async () => {
      setSyncing(true)
      try {
        const responses = await Promise.all(
          summary.galaxies.map((repo) => {
            const url = isViewingFriend
              ? `${apiBaseUrl}/universe/users/${selectedUserId}/galaxies/${repo.repoId}?types=commit,pr`
              : `${apiBaseUrl}/universe/me/galaxies/${repo.repoId}?types=commit,pr`
            return fetch(url, {
              headers: { Authorization: `Bearer ${auth.appToken}` },
            })
          }),
        )
        if (cancelled) {
          return
        }
        const failed = responses.find((res) => !res.ok)
        if (failed) {
          if (isViewingFriend && (failed.status === 403 || failed.status === 404)) {
            setGalaxy(null)
            setMessage(
              failed.status === 403
                ? 'Friend universe is private.'
                : 'Friend universe not found.',
            )
            lastAggregateKeyRef.current = null
            return
          }
          lastAggregateKeyRef.current = null
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
        setMessage('')
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Galaxy fetch failed.')
          lastAggregateKeyRef.current = null
        }
      } finally {
        if (!cancelled) {
          setSyncing(false)
          finishViewLoading()
        }
      }
    }

    const loadSingleGalaxy = async (repoId: number) => {
      const repo = summary.galaxies.find((item) => item.repoId === repoId)
      if (!repo) {
        finishViewLoading()
        return
      }

      setSyncing(true)
      if (!isViewingFriend && lastSyncedRepoRef.current !== repoId) {
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
        const galaxyUrl = isViewingFriend
          ? `${apiBaseUrl}/universe/users/${selectedUserId}/galaxies/${repo.repoId}?types=commit,pr`
          : `${apiBaseUrl}/universe/me/galaxies/${repo.repoId}?types=commit,pr`
        const response = await fetch(galaxyUrl, {
          headers: { Authorization: `Bearer ${auth.appToken}` },
        })
        if (cancelled) {
          return
        }
        if (!response.ok) {
          if (isViewingFriend && (response.status === 403 || response.status === 404)) {
            setGalaxy(null)
            setMessage(
              response.status === 403
                ? 'Friend universe is private.'
                : 'Friend universe not found.',
            )
            return
          }
          throw new Error('Failed to load galaxy.')
        }
        const data = (await response.json()) as GalaxyResponse
        if (cancelled) {
          return
        }
        setGalaxy(data)
        setMessage('')
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
          finishViewLoading()
        }
      }
    }

    if (!selectedRepoId) {
      const summaryKey = summary.galaxies
        .map((repo) => `${repo.repoId}:${repo.commitCount}`)
        .join('|')
      if (lastAggregateKeyRef.current !== summaryKey) {
        lastAggregateKeyRef.current = summaryKey
        void loadAggregateGalaxy()
      } else {
        finishViewLoading()
      }
    } else {
      lastAggregateKeyRef.current = null
      void loadSingleGalaxy(selectedRepoId)
    }

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, auth, summary, selectedRepoId, selectedUserId, currentViewKey])

  useEffect(() => {
    if (
      !auth ||
      !summary ||
      isViewingFriend ||
      !initialBackgroundSyncPendingRef.current
    ) {
      return
    }

    let cancelled = false

    const repoIds = summary.galaxies
      .map((repo) => repo.repoId)
      .filter(
        (repoId) =>
          repoId !== selectedRepoId &&
          !backgroundSyncedReposRef.current.has(repoId) &&
          !backgroundSyncInFlightRef.current.has(repoId),
      )

    if (!repoIds.length) {
      return undefined
    }

    initialBackgroundSyncPendingRef.current = false
    let didSync = false

    const queue = [...repoIds]
    const concurrency = 3

    const syncRepo = async (repoId: number) => {
      backgroundSyncInFlightRef.current.add(repoId)
      try {
        const response = await fetch(
          `${apiBaseUrl}/oauth/commits/sync?repoId=${encodeURIComponent(repoId)}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.appToken}` },
          },
        )
        if (response.status === 409) {
          backgroundSyncedReposRef.current.add(repoId)
          didSync = true
          return
        }
        if (!response.ok) {
          throw new Error('Failed to sync commits.')
        }
        backgroundSyncedReposRef.current.add(repoId)
        didSync = true
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Commit sync failed.')
        }
      } finally {
        backgroundSyncInFlightRef.current.delete(repoId)
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

    const runQueue = async () => {
      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, () => runWorker()),
      )
      if (!cancelled && didSync) {
        scheduleSummaryRefresh(2)
      }
    }

    void runQueue()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, auth, summary, selectedRepoId, selectedUserId])

  useEffect(() => {
    return () => {
      if (viewLoadingTimeoutRef.current != null) {
        window.clearTimeout(viewLoadingTimeoutRef.current)
      }
    }
  }, [])

  return {
    summary,
    selectedRepoId,
    setSelectedRepoId,
    galaxy,
    syncing,
    message,
    setMessage,
    viewLoading,
  }
}
