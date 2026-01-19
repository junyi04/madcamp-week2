export type AuthState = {
  appToken: string
  accessToken: string
  githubId: string
}

export type GalaxySummary = {
  repoId: number
  name: string
  commitCount: number
}

export type SummaryResponse = {
  galaxies: GalaxySummary[]
  counts: { commits: number; prs: number }
  lastSyncedAt: string | null
}

export type GalaxyResponse = {
  repoId: number
  name: string
  celestialObjects: CelestialObject[]
  counts: { commits: number; prs: number }
}

export type CelestialObject = {
  id: number
  type: 'COMMIT' | 'PR'
  x: number
  y: number
  z: number
  size: number
  color: string
  commit?: {
    id: number
    sha: string
    message: string
    date: string
    type: string
  } | null
  pullRequest?: {
    id: string
    title?: string | null
    url?: string | null
  } | null
}
