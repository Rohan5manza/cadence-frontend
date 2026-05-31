// Core paper type — matches your backend API response
export interface Paper {
  id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  venue: string
  doi?: string
  arxiv_id?: string
  categories: string[]
  source: 's2orc' | 'openalex' | 'arxiv'
  citation_count?: number
  open_access_url?: string
  is_downloaded?: boolean
}

// User type
export interface User {
  id: string
  email: string
  created_at: string
  topic_preferences: string[]
}

// Interaction types — what the user does with a paper
export type InteractionType = 'save' | 'like' | 'skip' | 'read' | 'share'


export interface Interaction {
  paper_id: string
  type: InteractionType
  duration_seconds?: number
  swipe_velocity?: number  // fast skip vs slow skip
  created_at?:      string 
}

// Playlist type
export interface Playlist {
  id: string
  name: string
  description?: string
  paper_ids: string[]
  created_at: string
  is_public: boolean
}

// API response types
export interface FeedResponse {
  papers: Paper[]
  next_cursor?: string
}

export interface RecommendationResponse {
  papers: Paper[]
  generated_at: string
}

// Auth types
export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

