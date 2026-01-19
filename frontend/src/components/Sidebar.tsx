import { useState } from 'react'
import type { GalaxyResponse, GalaxySummary, SummaryResponse } from '../types/universe'
import FriendPanel, { type FriendPanelProps } from './FriendPanel'

type SidebarProps = {
  summary: SummaryResponse | null
  galaxy: GalaxyResponse | null
  selectedRepoId: number | null
  syncing: boolean
  onSelectRepo: (repoId: number) => void
  onLogout: () => void
  friendPanel: FriendPanelProps
}

const Sidebar = ({
  summary,
  galaxy,
  selectedRepoId,
  syncing,
  onSelectRepo,
  onLogout,
  friendPanel,
}: SidebarProps) => {
  const [reposOpen, setReposOpen] = useState(true)

  const formatCommitDate = (value?: string) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
    }).format(parsed)
  }

  const selectedCommits =
    selectedRepoId && galaxy?.repoId === selectedRepoId
      ? galaxy.celestialObjects
          .filter((item) => item.type === 'COMMIT' && item.commit?.message)
          .slice(0, 30)
      : []

  return (
    <aside className="border-b border-white/5 bg-black/30 p-6 lg:border-b-0 lg:border-r lg:border-white/10">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
          Universe
        </p>
        <h2 className="mt-2 text-xl font-semibold">Constellation Map</h2>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200/80 transition hover:border-cyan-300/50 hover:text-cyan-100"
      >
        Logout
      </button>
    </div>

    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overview</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Repos</p>
          <p className="mt-1 text-sm text-slate-100">
            {summary?.galaxies.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Friends
          </p>
          <p className="mt-1 text-sm text-slate-100">{friendPanel.friends.length}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Select a repository to focus its constellation.
      </p>
    </div>

    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Repositories
        </h3>
        <button
          type="button"
          onClick={() => setReposOpen((prev) => !prev)}
          className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-200"
        >
          {reposOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      {reposOpen && (
        <div className="mt-3 space-y-2">
          {summary?.galaxies.map((repo: GalaxySummary) => (
            <div key={repo.repoId} className="space-y-2">
              <button
                type="button"
                onClick={() => onSelectRepo(repo.repoId)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  repo.repoId === selectedRepoId
                    ? 'border-cyan-300/60 bg-gradient-to-r from-cyan-300/15 via-cyan-300/5 to-transparent text-cyan-100'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/30'
                }`}
              >
                <span className="truncate">{repo.name}</span>
                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] tracking-[0.2em] text-slate-300">
                  {repo.commitCount}
                </span>
              </button>
              {repo.repoId === selectedRepoId && (
                <div className="space-y-2">
                  {selectedCommits.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/5 via-black/30 to-black/20 px-3 py-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        <span>Latest</span>
                        <span>{selectedCommits.length}</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {selectedCommits.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                            <div className="min-w-0 space-y-1">
                              <div className="truncate text-slate-200">
                                {item.commit?.message}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                <span>{formatCommitDate(item.commit?.date)}</span>
                                <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                                <span>{item.commit?.sha.slice(0, 6)}</span>
                                {item.commit?.type && (
                                  <>
                                    <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                                    <span className="text-cyan-200/80">{item.commit.type}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCommits.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-500">
                      No commits yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!summary?.galaxies.length && (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-400">
              No repositories yet. Sync GitHub to begin.
            </div>
          )}
        </div>
      )}
    </div>

    <FriendPanel {...friendPanel} />
    </aside>
  )
}

export default Sidebar
