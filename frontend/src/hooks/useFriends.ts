import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthState } from '../types/universe'
import type { FriendRequest, Friendship, SearchUser } from '../types/friends'

type SearchResponse = {
  data?: SearchUser[]
}

export const useFriends = (auth: AuthState | null, apiBaseUrl: string) => {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = useMemo(
    () => (auth ? { Authorization: `Bearer ${auth.appToken}` } : undefined),
    [auth],
  )

  const refreshAll = useCallback(async () => {
    if (!auth) {
      setFriends([])
      setIncoming([])
      setOutgoing([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        fetch(`${apiBaseUrl}/friends`, { headers }),
        fetch(`${apiBaseUrl}/friends/requests/incoming`, { headers }),
        fetch(`${apiBaseUrl}/friends/requests/outgoing`, { headers }),
      ])

      if (!friendsRes.ok || !incomingRes.ok || !outgoingRes.ok) {
        throw new Error('Failed to load friends.')
      }

      setFriends((await friendsRes.json()) as Friendship[])
      setIncoming((await incomingRes.json()) as FriendRequest[])
      setOutgoing((await outgoingRes.json()) as FriendRequest[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Friend fetch failed.')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, auth, headers])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const searchUsers = useCallback(
    async (query: string) => {
      setSearchQuery(query)
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setLoading(true)
      setError('')
      try {
        const response = await fetch(
          `${apiBaseUrl}/oauth/search?query=${encodeURIComponent(query)}`,
          { headers },
        )
        if (!response.ok) {
          throw new Error('Search failed.')
        }
        const data = (await response.json()) as SearchResponse
        setSearchResults(data.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl],
  )

  const sendRequest = useCallback(
    async (targetUserId: number) => {
      if (!auth) {
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${apiBaseUrl}/friends/requests`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetUserId }),
        })
        if (!response.ok) {
          throw new Error('Failed to send request.')
        }
        await refreshAll()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, auth, headers, refreshAll],
  )

  const acceptRequest = useCallback(
    async (requestId: number) => {
      if (!auth) {
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await fetch(
          `${apiBaseUrl}/friends/requests/${requestId}/accept`,
          {
            method: 'POST',
            headers,
          },
        )
        if (!response.ok) {
          throw new Error('Failed to accept request.')
        }
        await refreshAll()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Accept failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, auth, headers, refreshAll],
  )

  const rejectRequest = useCallback(
    async (requestId: number) => {
      if (!auth) {
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await fetch(
          `${apiBaseUrl}/friends/requests/${requestId}/reject`,
          {
            method: 'POST',
            headers,
          },
        )
        if (!response.ok) {
          throw new Error('Failed to reject request.')
        }
        await refreshAll()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reject failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, auth, headers, refreshAll],
  )

  const removeFriend = useCallback(
    async (friendId: number) => {
      if (!auth) {
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${apiBaseUrl}/friends/${friendId}`, {
          method: 'DELETE',
          headers,
        })
        if (!response.ok) {
          throw new Error('Failed to remove friend.')
        }
        await refreshAll()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Remove failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, auth, headers, refreshAll],
  )

  return {
    friends,
    incoming,
    outgoing,
    searchResults,
    searchQuery,
    loading,
    error,
    setError,
    searchUsers,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  }
}
