import { useState } from 'react'
import type { FriendRequest, Friendship, SearchUser } from '../types/friends'

export type FriendPanelProps = {
  friends: Friendship[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  searchResults: SearchUser[]
  searchQuery: string
  loading: boolean
  error: string
  selectedFriendId: number | null
  onSelectFriend: (userId: number | null) => void
  onSearch: (query: string) => void
  onSendRequest: (userId: number) => void
  onAccept: (requestId: number) => void
  onReject: (requestId: number) => void
  onRemove: (friendId: number) => void
}

const FriendPanel = ({
  friends,
  incoming,
  outgoing,
  searchResults,
  searchQuery,
  loading,
  error,
  selectedFriendId,
  onSelectFriend,
  onSearch,
  onSendRequest,
  onAccept,
  onReject,
  onRemove,
}: FriendPanelProps) => {
  const [query, setQuery] = useState(searchQuery)
  const [friendsOpen, setFriendsOpen] = useState(true)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Friends
        </h3>

        <button
          type="button"
          onClick={() => setFriendsOpen((prev) => !prev)}
          className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-200"
        >
          {friendsOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {friendsOpen && (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Find users
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="GitHub id"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onSearch(query)}
                className="rounded-lg border border-white/10 bg-cyan-300/20 px-3 text-xs text-cyan-100 transition hover:border-cyan-200/60"
              >
                Search
              </button>
            </div>

            {!!searchResults.length && (
              <div className="mt-3 space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {user.githubUser?.avatar ? (
                        <img
                          src={user.githubUser.avatar}
                          alt={user.nickname}
                          className="h-5 w-5 rounded-full"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-white/10" />
                      )}
                      <div>
                        <p className="text-slate-200">{user.nickname}</p>
                        <p className="text-[10px] text-slate-500">
                          {user.githubUser?.githubId ?? 'unknown'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSendRequest(user.id)}
                      className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-200 hover:border-cyan-200/60"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!!incoming.length && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Incoming
              </p>
              <div className="mt-2 space-y-2">
                {incoming.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2 py-1 text-xs text-slate-200"
                  >
                    <span>Request #{request.id}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onAccept(request.id)}
                        className="rounded-md border border-emerald-300/40 px-2 py-1 text-[10px] text-emerald-200"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(request.id)}
                        className="rounded-md border border-rose-300/40 px-2 py-1 text-[10px] text-rose-200"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!outgoing.length && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Pending
              </p>
              <div className="mt-2 space-y-2 text-xs text-slate-400">
                {outgoing.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-white/5 bg-black/30 px-2 py-1"
                  >
                    Request #{request.id}
                  </div>
                ))}
              </div>
            </div>
          )}

        {!!friends.length && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Your friends
            </p>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => onSelectFriend(null)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left text-xs transition ${
                  selectedFriendId === null
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                    : 'border-white/5 bg-black/30 text-slate-200 hover:border-white/30'
                }`}
              >
                <span>My Universe</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  you
                </span>
              </button>

                {friends.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onSelectFriend(entry.friend.id)}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1 text-xs transition ${
                      selectedFriendId === entry.friend.id
                        ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                        : 'border-white/5 bg-black/30 text-slate-200 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {entry.friend.githubUser?.avatar ? (
                        <img
                          src={entry.friend.githubUser.avatar}
                          alt={entry.friend.nickname}
                          className="h-5 w-5 rounded-full"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-white/10" />
                      )}
                      <div>
                        <p>{entry.friend.nickname}</p>
                        <p className="text-[10px] text-slate-500">
                          {entry.friend.githubUser?.githubId ?? 'unknown'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemove(entry.friend.id)
                      }}
                      className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-rose-300/60"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            !friends.length &&
            !incoming.length &&
            !outgoing.length && (
              <p className="text-xs text-slate-500">No friends yet.</p>
            )}

          {loading && <p className="text-xs text-slate-500">Updating...</p>}
          {error && <p className="text-xs text-rose-200">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default FriendPanel
