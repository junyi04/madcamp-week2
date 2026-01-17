export type FriendUser = {
  id: number
  nickname: string
  githubUser?: {
    githubId: string
    avatar: string | null
  } | null
}

export type FriendRequest = {
  id: number
  requesterId: number
  receiverId: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED'
  createdAt: string
  respondedAt: string | null
}

export type Friendship = {
  id: number
  friend: FriendUser
}

export type SearchUser = FriendUser
