import GalaxyCanvas from '../components/GalaxyCanvas'
import Sidebar from '../components/Sidebar'
import TopStatus from '../components/TopStatus'
import { useAuth } from '../hooks/useAuth'
import { useGalaxyData } from '../hooks/useGalaxyData'
import AuthGate from '../components/AuthGate'
import { useFriends } from '../hooks/useFriends'

const GalaxyPage = () => {
  const { auth, status, message, setMessage, apiBaseUrl, handleGithubLogin, handleLogout } =
    useAuth()
  const { summary, selectedRepoId, setSelectedRepoId, galaxy, syncing } = useGalaxyData(
    auth,
    apiBaseUrl,
  )
  const friendPanel = useFriends(auth, apiBaseUrl)

  if (!auth) {
    return <AuthGate status={status} message={message} onLogin={handleGithubLogin} />
  }

  const selectedRepo =
    summary?.galaxies.find((repo) => repo.repoId === selectedRepoId) ?? null
  const starCount = galaxy?.celestialObjects.length ?? 0

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,_rgba(56,189,248,0.16),_transparent_55%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.16),_transparent_50%),radial-gradient(circle_at_50%_85%,_rgba(250,204,21,0.1),_transparent_50%),linear-gradient(180deg,_#03050c,_#0b1525_60%,_#02040a)] text-slate-100">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[320px_1fr]">
        <div className="scrollbar-hidden h-full overflow-y-auto">
        <Sidebar
          summary={summary}
          selectedRepoId={selectedRepoId}
          syncing={syncing}
          onSelectRepo={setSelectedRepoId}
          onLogout={() => {
            handleLogout()
            setMessage('')
          }}
          friendPanel={{
            friends: friendPanel.friends,
            incoming: friendPanel.incoming,
            outgoing: friendPanel.outgoing,
            searchResults: friendPanel.searchResults,
            searchQuery: friendPanel.searchQuery,
            loading: friendPanel.loading,
            error: friendPanel.error,
            onSearch: friendPanel.searchUsers,
            onSendRequest: friendPanel.sendRequest,
            onAccept: friendPanel.acceptRequest,
            onReject: friendPanel.rejectRequest,
            onRemove: friendPanel.removeFriend,
          }}
        />
        </div>

        <section className="relative h-full min-h-[520px]">
          <TopStatus
            title={selectedRepo?.name ?? 'Select a repo'}
            subtitle={starCount ? `${starCount} stars rendered` : 'No stars yet'}
          />

          <GalaxyCanvas stars={galaxy?.celestialObjects ?? []} />

          {message && (
            <div className="absolute bottom-6 left-6 z-10 rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default GalaxyPage
