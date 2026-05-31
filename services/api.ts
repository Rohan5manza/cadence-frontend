import axios from 'axios'
import { API_BASE_URL } from '../constants'
import type {
  AuthTokens,
  Interaction,
  LoginRequest,
  Paper,
  Playlist,
  RecommendationResponse
} from '../types'


// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token management
let _token: string | null = null
export const setToken  = (token: string) => { _token = token }
export const getToken  = () => _token
export const clearToken = () => { _token = null }

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthTokens> => {
    const res = await api.post('/auth/login', data)
    return res.data
  },
  register: async (data: LoginRequest): Promise<AuthTokens> => {
    const res = await api.post('/auth/register', data)
    return res.data
  },
}

// ── Papers ────────────────────────────────────────────────────────────────────
export const papersAPI = {
  getById: async (id: string): Promise<Paper> => {
    const res = await api.get(`/papers/${id}`)
    return res.data
  },
  search: async (query: string, limit = 20): Promise<Paper[]> => {
    const res = await api.get('/papers/search', { params: { q: query, limit } })
    return res.data
  },
  getFreePdf: async (paperId: string) => {
    const res = await api.get(`/papers/${paperId}/unpaywall`)
    return res.data
  },
  getSimilar: async (paperId: string, limit = 20): Promise<Paper[]> => {
    const res = await api.get(`/papers/${paperId}/similar`, { params: { limit } })
    return res.data
  },
  
}

// ── Feed ──────────────────────────────────────────────────────────────────────
export const feedAPI = {
  getDiscover: async (): Promise<Paper[]> => {
    // We no longer need to pull preferences from useStore here 
    // because the backend now reads them directly from the database!
    const res = await api.get('/feed/discover')
    return res.data
  },
  getDailyTen: async (): Promise<RecommendationResponse> => {
    const res = await api.get('/feed/daily')
    return res.data
  },
  logInteraction: async (interaction: Interaction): Promise<void> => {
    await api.post('/feed/interaction', interaction)
  },
  getLiked: async (limit = 20): Promise<Paper[]> => {
  const res = await api.get('/feed/liked', { params: { limit } })
  return res.data
},
 
getSimilarToSaved: async (limit = 20): Promise<Paper[]> => {
  const res = await api.get('/feed/similar-to-saved', { params: { limit } })
  return res.data
},
 
getTrending: async (category: string, limit = 20): Promise<Paper[]> => {
  const res = await api.get('/feed/trending', { params: { category, limit } })
  return res.data
},
 
getTodaysPick: async (): Promise<Paper> => {
  const res = await api.get('/feed/todays-pick')
  return res.data
},
 
}

// ── Library ───────────────────────────────────────────────────────────────────
export const libraryAPI = {
  getSaved: async (): Promise<Paper[]> => {
    const res = await api.get('/library/saved')
    return res.data
  },
  listPlaylists: async (): Promise<Playlist[]> => {
    const res = await api.get('/library/playlists');
    return res.data;
  },
  savePaper: async (paperId: string): Promise<void> => {
    await api.post(`/library/saved/${paperId}`)
  },
  unsavePaper: async (paperId: string): Promise<void> => {
    await api.delete(`/library/saved/${paperId}`)
  },
  getPlaylist: async (playlistId: string): Promise<Playlist> => {
    const res = await api.get(`/library/playlists/${playlistId}`);
    return res.data
  },
  getPlaylistPapers: async (playlistId: string): Promise<Paper[]> => {
    const res = await api.get(`/library/playlists/${playlistId}/papers`);
    return res.data
  },
  createPlaylist: async (name: string): Promise<Playlist> => {
    const res = await api.post('/library/playlists', { name })
    return res.data
  },
  addPaperToPlaylist: async (playlistId: string | number, paperId: string): Promise<void> => {
    await api.post(`/library/playlists/${playlistId}/papers/${paperId}`)
  },
  updatePlaylistName: async (playlistId: string | number, name: string): Promise<void> => {
  await api.patch(`/library/playlists/${playlistId}`, { name })
},
removeFromPlaylist: async (playlistId: string | number, paperId: string): Promise<void> => {
  await api.delete(`/library/playlists/${playlistId}/papers/${paperId}`)
},
deletePlaylist: async (playlistId: string | number): Promise<void> => {
  await api.delete(`/library/playlists/${playlistId}`)
},
}

// ── User ──────────────────────────────────────────────────────────────────────
 
export const userAPI = {
  getProfile: async (): Promise<{
    topics: string[]
    difficulty: string
    display_name: string
    role: string
    institution: string
    primary_field: string
    reading_goal: string
    experience_level: string
    weekly_goal: number
  }> => {
    const res = await api.get('/user/profile')
    return res.data
  },
 
  updateProfile: async (profile: {
    topics:          string[]
    difficulty:      string
    display_name:    string
    role:            string
    institution:     string
    primary_field:   string
    reading_goal:    string
    experience_level:string
    weekly_goal:     number
  }): Promise<void> => {
    await api.put('/user/profile', profile)
  },
}
 

export default api