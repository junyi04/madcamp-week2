import { useEffect, useState } from 'react'
import type { AuthState, GalaxyResponse, SummaryResponse } from '../types/universe'

export const useGalaxyData = (auth: AuthState | null, apiBaseUrl: string) => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [galaxy, setGalaxy] = useState<GalaxyResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  // 레포를 폴링 방식으로 30초마다 호출
  const fetchSummary = async (withSync: boolean) => {
    if (!auth) {
      return
    }

    if (withSync) {
      setSyncing(true)
      try {
        await fetch(
          `${apiBaseUrl}/oauth/repos?accessToken=${encodeURIComponent(auth.accessToken)}`,
        )
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

  useEffect(() => {
    if (!auth) {
      setSummary(null)
      setGalaxy(null)
      setSelectedRepoId(null)
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

    // 사용자가 선택한 레포가 없을 때, 모든 레포 데이터 합쳐 보여줌
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
        const failed = responses.find((res) => !res.ok)
        if (failed) {
          throw new Error('Failed to load galaxies.')
        }
        const galaxies = (await Promise.all(
          responses.map((res) => res.json()),
        )) as GalaxyResponse[]

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
        setMessage(error instanceof Error ? error.message : 'Galaxy fetch failed.')
      } finally {
        setSyncing(false)
      }
    }

    // 특정 레포 선택 시, 해당 레포 상세 데이터 가져옴
    const loadSingleGalaxy = async (repoId: number) => {
      const repo = summary.galaxies.find((item) => item.repoId === repoId)
      if (!repo) {
        return
      }

      setSyncing(true)
      void fetch(
        `${apiBaseUrl}/oauth/commits/sync?accessToken=${encodeURIComponent(
          auth.accessToken,
        )}&owner=${encodeURIComponent(auth.githubId)}&repo=${encodeURIComponent(repo.name)}`,
        { method: 'POST' },
      ).catch(() => {
        // Commit sync is optional for UI; proceed to load cached stars.
      })

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

    if (!selectedRepoId) {
      void loadAggregateGalaxy()
    } else {
      void loadSingleGalaxy(selectedRepoId)
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
