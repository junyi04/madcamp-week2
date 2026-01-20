import { useEffect, useMemo, useRef, useState } from 'react'
import GalaxyCanvas from '../components/GalaxyCanvas'
import Sidebar from '../components/Sidebar'
import RepoGalaxy from '../components/repo-galaxy/RepoGalaxy'
import { useAuth } from '../hooks/useAuth'
import { useGalaxyData } from '../hooks/useGalaxyData'
import AuthGate from '../components/AuthGate'
import { useFriends } from '../hooks/useFriends'
import UniverseCanvas from '../components/UniverseCanvas'

const FOCUS_TRANSITION_MS = 1500  // 전환 지연 시간 조정

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
  const starCount = galaxy?.celestialObjects.length ?? 0
  const showRepoGalaxy = selectedRepoId != null
  const showUniverseLayer = !showRepoGalaxy
  const showRepoLayer = showRepoGalaxy
  const commitTypes = useMemo(() => {
    if (!showRepoGalaxy) return []
    return (
      galaxy?.celestialObjects
        .filter((item) => item.type === 'COMMIT' && item.commit?.type)
        .map((item) => item.commit?.type as string) ?? []
    )
  }, [showRepoGalaxy, galaxy])
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
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200/80 transition hover:border-cyan-300/60 hover:text-cyan-100"
          >
            {sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          </button>

          {viewLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-slate-100">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                Loading universe...
              </div>
            </div>
          )}

          <div
            className={`absolute inset-0 transition-opacity duration-[420ms] ease-in-out ${
              showUniverseLayer ? 'opacity-100' : 'opacity-0'
            } ${showUniverseLayer ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <UniverseCanvas
              repos={summary?.galaxies ?? []}
              selectedRepoId={selectedRepoId}
              focusRepoId={focusRepoId}
              exitRepoId={exitRepoId}
              onSelectRepo={() => {}}
            />

            <div className="relative z-10 h-full">
              <GalaxyCanvas stars={galaxy?.celestialObjects ?? []} />
            </div>
          </div>

          <div
            className={`absolute inset-0 transition-opacity duration-[420ms] ease-in-out ${
              showRepoLayer ? 'opacity-100' : 'opacity-0'
            } ${showRepoLayer ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <div className="relative z-10 h-full">
              <RepoGalaxy
                active={showRepoLayer}
                commitCount={selectedRepo?.commitCount}
                seedKey={selectedRepo?.repoId ?? selectedRepo?.name}
                commitTypes={commitTypes}
              />
            </div>
          </div>

          {bannerMessage && (
            <div className="absolute bottom-6 left-6 z-10 rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              {bannerMessage}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default GalaxyPage
