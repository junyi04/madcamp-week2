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

  const commitDotClass: Record<string, string> = {
    feat: 'bg-cyan-300/90',
    fix: 'bg-rose-300/90',
    docs: 'bg-sky-500/80',
    style: 'bg-sky-500/80',
    test: 'bg-emerald-300/80',
    refactor: 'bg-violet-300/90',
    perf: 'bg-violet-900/90',
    chore: 'bg-orange-300/60',
    build: 'bg-orange-300/60',
    ci: 'bg-orange-300/60',
    other: 'bg-slate-500',
  }

  const commitTypeClass: Record<string, string> = {
    feat: 'text-cyan-300/90',
    fix: 'text-rose-300/90',
    docs: 'text-sky-500/80',
    style: 'text-sky-500/80',
    test: 'text-emerald-200/80',
    refactor: 'text-violet-300/90',
    perf: 'text-violet-300/90',
    chore: 'text-orange-200/70',
    build: 'text-orange-200/70',
    ci: 'text-orange-200/70',
    other: 'text-slate-400',
  }

  const isMergePullRequest = (message?: string) => {
    const normalized = message?.trim().toLowerCase() ?? ''
    return normalized.startsWith('merge pull request')
  }

  const selectedCommits =
    selectedRepoId && galaxy?.repoId === selectedRepoId
      ? galaxy.celestialObjects
          .filter((item) => item.type === 'COMMIT' && item.commit?.message).reverse()
          .slice(0, 30)
      : []

  return (
    <aside className="h-full min-h-screen border-b border-white/5 bg-black/30 p-6 lg:border-b-0 lg:border-r lg:border-white/10">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
          Code Galaxy
        </p>
        <h2 className="mt-2 text-xl font-semibold">Universe Map</h2>
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
        Select a repository to focus on its galaxy.
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
                        {selectedCommits.map((item) => {
                          const commitType = normalizeCommitType(
                            item.commit?.type,
                            item.commit?.message,
                          )
                          
                          const isMerge = isMergePullRequest(item.commit?.message)
                          const dotClass = isMerge
                            ? 'bg-amber-300/90'
                            : commitDotClass[commitType]

                          const typeLabel = isMerge ? 'PR' : commitType

                          const typeClass = isMerge
                            ? 'text-amber-200/90'
                            : commitTypeClass[commitType]
                            
                          return (
                            <div key={item.id} className="flex items-start gap-3">
                              <span
                                className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dotClass}`}
                              />
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
                                      <span className={typeClass}>
                                        {typeLabel}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
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
