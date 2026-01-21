import { useEffect, useMemo, useRef, useState } from 'react'
import GalaxyCanvas from '../components/GalaxyCanvas'
import Sidebar from '../components/Sidebar'
import RepoGalaxy from '../components/repo-galaxy/RepoGalaxy'
import { useAuth } from '../hooks/useAuth'
import { useGalaxyData } from '../hooks/useGalaxyData'
import AuthGate from '../components/AuthGate'
import { useFriends } from '../hooks/useFriends'
import UniverseCanvas from '../components/UniverseCanvas'

const FOCUS_TRANSITION_MS = 1000  // 전환 지연 시간 조정

const GalaxyPage = () => {
  const {
    auth,
    status,
    message: authMessage,
    setMessage: setAuthMessage,
    apiBaseUrl,
    handleGithubLogin,
    handleLogout,
  } = useAuth()
  
  // PC 폭 따라 사이드바 OC 여부
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [focusRepoId, setFocusRepoId] = useState<number | null>(null)
  const [exitRepoId, setExitRepoId] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const focusTimerRef = useRef<number | null>(null)
  const {
    summary,
    selectedRepoId,
    setSelectedRepoId,
    galaxy,
    syncing,
    message: galaxyMessage,
    setMessage: setGalaxyMessage,
    viewLoading,
    prefetchRepoSync,
  } = useGalaxyData(
    auth,
    apiBaseUrl,
    selectedUserId,
  )
  const friendPanel = useFriends(auth, apiBaseUrl)

  const bannerMessage = galaxyMessage || authMessage

  useEffect(() => {
    return () => {
      clearFocusTimer()
    }
  }, [])

  useEffect(() => {
    clearFocusTimer()
    setFocusRepoId(null)
    setExitRepoId(null)
    setSelectedRepoId(null)
  }, [selectedUserId])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedRepo =
    summary?.galaxies.find((repo) => repo.repoId === selectedRepoId) ?? null
  const showRepoGalaxy = selectedRepoId != null
  const showUniverseLayer = !showRepoGalaxy
  const showRepoLayer = showRepoGalaxy
  const commitGuide = useMemo(
    () => [
      {
        key: 'feat',
        label: 'feat',
        description: ' introducing a new feature',
        dotClass: 'bg-cyan-300/80',
        textClass: 'text-cyan-200/80',
      },
      {
        key: 'fix',
        label: 'fix',
        description: ' fixing a bug',
        dotClass: 'bg-rose-300/60',
        textClass: 'text-rose-200/70',
      },
      {
        key: 'docs',
        label: 'docs',
        description: ' documentation changes only',
        dotClass: 'bg-sky-300/60',
        textClass: 'text-sky-200/70',
      },
      {
        key: 'style',
        label: 'style',
        description: ' code style changes that do not affect code behavior',
        dotClass: 'bg-sky-300/60',
        textClass: 'text-sky-200/70',
      },
      {
        key: 'test',
        label: 'test',
        description: ' adding or modifying tests',
        dotClass: 'bg-emerald-300/60',
        textClass: 'text-emerald-200/70',
      },
      {
        key: 'refactor',
        label: 'refactor',
        description: ' code changes that neither fix a bug nor add a feature',
        dotClass: 'bg-violet-300/60',
        textClass: 'text-violet-200/70',
      },
      {
        key: 'perf',
        label: 'perf',
        description: ' improving performance',
        dotClass: 'bg-violet-300/60',
        textClass: 'text-violet-200/70',
      },
      {
        key: 'chore',
        label: 'chore',
        description: ' small, non-functional changes',
        dotClass: 'bg-orange-300/60',
        textClass: 'text-orange-200/70',
      },
      {
        key: 'build',
        label: 'build',
        description: ' build or dependency changes',
        dotClass: 'bg-orange-300/60',
        textClass: 'text-orange-200/70',
      },
      {
        key: 'ci',
        label: 'ci',
        description: ' changes to CI configuration files and scripts',
        dotClass: 'bg-orange-300/60',
        textClass: 'text-orange-200/70',
      },
      {
        key: 'pr',
        label: 'PR',
        description: 'Merge pull request',
        dotClass: 'bg-amber-300/90',
        textClass: 'text-amber-200/70',
      },
    ],
    [],
  )
  const normalizeCommitType = (type?: string, message?: string) => {
    const normalizedType = type?.trim().toLowerCase() ?? ''
    const normalizedMessage = message?.trim().toLowerCase() ?? ''
    const prefixMatch = normalizedMessage.match(/^\s*([a-z]+)(?:\([^)]+\))?:/)
    const keywordMatch = normalizedMessage.match(
      /\b(feat|fix|docs|style|test|refactor|perf|chore|build|ci)\b/,
    )
    const normalized = prefixMatch?.[1] || normalizedType || keywordMatch?.[1] || ''
    if (normalized.startsWith('feat')) return 'feat'
    if (normalized.startsWith('fix')) return 'fix'
    if (normalized.startsWith('docs')) return 'docs'
    if (normalized.startsWith('style')) return 'style'
    if (normalized.startsWith('test')) return 'test'
    if (normalized.startsWith('refactor')) return 'refactor'
    if (normalized.startsWith('perf')) return 'perf'
    if (normalized.startsWith('chore')) return 'chore'
    if (normalized.startsWith('build')) return 'build'
    if (normalized.startsWith('ci')) return 'ci'
    return 'other'
  }
  const isMergePullRequest = (message?: string) => {
    const normalized = message?.trim().toLowerCase() ?? ''
    return normalized.startsWith('merge pull request')
  }
  const commitStats = useMemo(() => {
    if (!showRepoGalaxy) return null
    const commits =
      galaxy?.celestialObjects.filter((item) => item.type === 'COMMIT') ?? []
    if (!commits.length) {
      return {
        total: 0,
        entries: [] as Array<typeof commitGuide[number] & { count: number; percent: number }>,
      }
    }
    const counts: Record<string, number> = {}
    commits.forEach((item) => {
      const isMerge = isMergePullRequest(item.commit?.message)
      const key = isMerge
        ? 'pr'
        : normalizeCommitType(item.commit?.type, item.commit?.message)
      counts[key] = (counts[key] ?? 0) + 1
    })
    const total = commits.length
    const entries = [
      ...commitGuide,
      {
        key: 'other',
        label: 'other',
        description: ' other',
        dotClass: 'bg-slate-500',
        textClass: 'text-slate-400',
      },
    ]
      .map((entry) => ({
        ...entry,
        count: counts[entry.key] ?? 0,
        percent: total ? ((counts[entry.key] ?? 0) / total) * 100 : 0,
      }))
      .filter((entry) => entry.count > 0)
    return { total, entries }
  }, [showRepoGalaxy, galaxy, commitGuide])
  const repoGalaxyReady =
    showRepoLayer && galaxy?.repoId != null && galaxy.repoId === selectedRepoId
  const commitTypes = useMemo(() => {
    if (!repoGalaxyReady) return []
    return (
      galaxy?.celestialObjects
        .filter((item) => item.type === 'COMMIT' && (item.commit?.type || item.commit?.message))
        .map((item) => (item.commit?.type ?? item.commit?.message ?? '') as string) ?? []
    )
  }, [repoGalaxyReady, galaxy])
  
  const statsReady = (commitStats?.total ?? 0) > 0
  useEffect(() => {
    if (!showRepoGalaxy) {
      setStatsOpen(false)
    }
  }, [showRepoGalaxy])

  function clearFocusTimer() {
    if (focusTimerRef.current != null) {
      window.clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
  }

  const startFocusTransition = (repoId: number) => {
    clearFocusTimer()
    setFocusRepoId(repoId)
    setExitRepoId(null)
    setSelectedRepoId(null)
    void prefetchRepoSync(repoId)
    focusTimerRef.current = window.setTimeout(() => {
      setSelectedRepoId(repoId)
      setFocusRepoId(null)
      focusTimerRef.current = null
    }, FOCUS_TRANSITION_MS)
  }

  const handleSelectUser = (userId: number | null) => {
    setSelectedUserId(userId)
  }

  if (!auth) {
    return <AuthGate status={status} message={authMessage} onLogin={handleGithubLogin} />
  }


  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,_rgba(56,189,248,0.16),_transparent_55%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.16),_transparent_50%),radial-gradient(circle_at_50%_85%,_rgba(250,204,21,0.1),_transparent_50%),linear-gradient(180deg,_#03050c,_#0b1525_60%,_#02040a)] text-slate-100">
      <div
        className={`grid h-full ${
          sidebarOpen ? 'grid-cols-[320px_minmax(0,1fr)]' : 'grid-cols-1'
        }`}
      >
        {sidebarOpen && (
          <div className="scrollbar-hidden h-full overflow-y-auto">
            <Sidebar
              summary={summary}
              galaxy={galaxy}
              selectedRepoId={selectedRepoId}
              syncing={syncing}
              onSelectRepo={(repoId) => {
                if (repoId === selectedRepoId) {
                  clearFocusTimer()
                  setFocusRepoId(null)
                  setExitRepoId(repoId)
                  setSelectedRepoId(null)
                  return
                }
                if (repoId === focusRepoId) {
                  clearFocusTimer()
                  setFocusRepoId(null)
                  return
                }
                if (repoId === exitRepoId) {
                  setExitRepoId(null)
                  return
                }
                startFocusTransition(repoId)
              }}
              onLogout={() => {
                handleLogout()
                setAuthMessage('')
                setGalaxyMessage('')
              }}
              friendPanel={{
                friends: friendPanel.friends,
                incoming: friendPanel.incoming,
                outgoing: friendPanel.outgoing,
                searchResults: friendPanel.searchResults,
                searchQuery: friendPanel.searchQuery,
                loading: friendPanel.loading,
                error: friendPanel.error,
                selectedFriendId: selectedUserId,
                onSelectFriend: handleSelectUser,
                onSearch: friendPanel.searchUsers,
                onSendRequest: friendPanel.sendRequest,
                onAccept: friendPanel.acceptRequest,
                onReject: friendPanel.rejectRequest,
                onRemove: friendPanel.removeFriend,
              }}
            />
          </div>
        )}

        <section className="relative h-full min-h-[520px]">
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200/80 transition hover:border-cyan-300/60 hover:text-cyan-100"
            >
              {sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200/80 transition hover:border-amber-200/60 hover:text-amber-100"
            >
              Commit guide
            </button>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              disabled={!statsReady}
              className={`rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200/80 transition ${
                statsReady
                  ? 'hover:border-emerald-200/60 hover:text-emerald-100'
                  : 'cursor-not-allowed opacity-40'
              }`}
            >
              Commit stats
            </button>
          </div>

          {viewLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-slate-100">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                Loading universe...
              </div>
            </div>
          )}

          <div
            className={`absolute inset-0 transition-opacity duration-[420ms] ease-in-out ${showUniverseLayer ? 'opacity-100' : 'opacity-0'
              } ${showUniverseLayer ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <UniverseCanvas
              repos={summary?.galaxies ?? []}
              selectedRepoId={selectedRepoId}
              focusRepoId={focusRepoId}
              exitRepoId={exitRepoId}
              onSelectRepo={() => { }}
            />

            <div className="relative z-10 h-full">
              <GalaxyCanvas stars={galaxy?.celestialObjects ?? []} />
            </div>
          </div>

          <div
            className={`absolute inset-0 transition-opacity duration-[420ms] ease-in-out ${showRepoLayer ? 'opacity-100' : 'opacity-0'
              } ${showRepoLayer ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <div className="relative z-10 h-full">
              {repoGalaxyReady && (
                <RepoGalaxy
                  active={repoGalaxyReady}
                  commitCount={selectedRepo?.commitCount}
                  seedKey={selectedRepo?.repoId ?? selectedRepo?.name}
                  commitTypes={commitTypes}
                />
              )}
            </div>
          </div>

          {bannerMessage && (
            <div className="absolute bottom-6 left-6 z-10 rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              {bannerMessage}
            </div>
          )}

          {guideOpen && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setGuideOpen(false)}
              role="presentation"
            >
              <div
                className="w-[min(520px,92vw)] rounded-2xl border border-white/10 bg-slate-950/90 p-5 text-slate-100 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Commit guide"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Developer Guide
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">Commit Terms</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(false)}
                    className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/30 hover:text-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {commitGuide.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${entry.dotClass}`}
                        />
                        <span className={`text-sm ${entry.textClass}`}>
                          {entry.label}
                        </span>
                      </div>
                      <span className="text-xs text-slate-300">
                        {entry.description}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-500">
                  커밋 메시지는 타입 접두어로 분류됩니다. 예: feat: add login
                </p>
              </div>
            </div>
          )}

          {statsOpen && commitStats && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setStatsOpen(false)}
              role="presentation"
            >
              <div
                className="w-[min(520px,92vw)] rounded-2xl border border-white/10 bg-slate-950/90 p-5 text-slate-100 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Commit stats"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Repository Stats
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {selectedRepo?.name ?? 'Selected repo'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatsOpen(false)}
                    className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/30 hover:text-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {commitStats.entries.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-[0.7] items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${entry.dotClass}`}
                        />
                        <span className={`text-sm ${entry.textClass}`}>
                          {entry.label}
                        </span>
                      </div>
                      <div className="flex flex-[2.0] items-center gap-6">
                        <div className="h-2 w-full rounded-full bg-white/5">
                          <div
                            className={`h-2 rounded-full ${entry.dotClass}`}
                            style={{ width: `${entry.percent.toFixed(1)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs text-slate-300">
                          {entry.count} · {entry.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-500">
                  Total commits: {commitStats.total}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default GalaxyPage
