import { useState } from 'react'
import type { GalaxySummary, SummaryResponse } from '../types/universe'
import FriendPanel, { type FriendPanelProps } from './FriendPanel'

type SidebarProps = {
  summary: SummaryResponse | null
  selectedRepoId: number | null
  syncing: boolean
  onSelectRepo: (repoId: number) => void
  onLogout: () => void
  friendPanel: FriendPanelProps
}

const Sidebar = ({
  summary,
  selectedRepoId,
  syncing,
  onSelectRepo,
  onLogout,
  friendPanel,
}: SidebarProps) => {
  const [reposOpen, setReposOpen] = useState(true)

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
            <button
              key={repo.repoId}
              type="button"
              onClick={() => onSelectRepo(repo.repoId)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                repo.repoId === selectedRepoId
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/30'
              }`}
            >
              <span className="truncate">{repo.name}</span>
              <span className="text-xs text-slate-400">{repo.commitCount}</span>
            </button>
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
