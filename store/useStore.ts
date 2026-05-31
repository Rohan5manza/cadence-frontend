import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import type { Paper, Playlist, User } from '../types'

// ── Keys ──────────────────────────────────────────────────────────────────────
const TOKEN_KEY    = 'cadence_token'
const TOKEN_EXPIRY = 'cadence_token_expiry'
const PREFS_KEY    = 'cadence_prefs'
const HISTORY_KEY  = 'cadence_history'
const READING_KEY  = 'cadence_reading'
const STREAK_KEY   = 'cadence_streak'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000


// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr     = () => new Date().toISOString().split('T')[0]
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().split('T')[0]

// ── Interfaces ────────────────────────────────────────────────────────────────
interface UserPreferences {
  // Existing
  topics:          string[]
  difficultyLevel: 'any' | 'accessible' | 'technical' | 'expert'
  onboardingDone:  boolean
 
  // New profile fields
  displayName:     string
  role:            'student' | 'researcher' | 'professor' | 'industry' | 'curious'
  institution:     string
  primaryField:    string   // one topic ID from DETAILED_TOPICS
  readingGoal:     'stay_current' | 'deep_dive' | 'broad' | 'specific'
  experienceLevel: 'beginner' | 'intermediate' | 'expert'
  weeklyGoal:      number   // 3 | 5 | 10 | 20
}

interface ReadingProgress {
  paperId:    string
  paperTitle: string
  scrollY:    number
  mode:       'text' | 'pdf'
  lastReadAt: string
}

interface StreakData {
  currentStreak: number   // consecutive days with at least 1 genuine read
  lastReadDate:  string   // YYYY-MM-DD of last genuine read
  longestStreak: number
  totalPapers:   number   // total genuine reads ever
  todayCount:    number   // genuine reads today
  lastChecked:   string   // YYYY-MM-DD — to reset todayCount on new day
}

interface RecordReadResult {
  isFirstToday:  boolean
  newStreak:     number
  streakBroken:  boolean
  oldStreak:     number
}

interface CadenceStore {
  // Auth
  user:            User | null
  token:           string | null
  setUser:         (user: User | null) => void
  setToken:        (token: string | null) => void
  loadStoredToken: () => Promise<boolean>
  logout:          () => Promise<void>

  // Preferences
  preferences:     UserPreferences
  setPreferences:  (prefs: Partial<UserPreferences>) => Promise<void>
  loadPreferences: () => Promise<void>
  

  // Saved papers (local cache)
  savedPaperIds: Set<string>
  savePaper:     (paperId: string) => void
  unsavePaper:   (paperId: string) => void
  isSaved:       (paperId: string) => boolean

  // Reading progress (continue reading)
  readingProgress:     ReadingProgress | null
  setReadingProgress:  (progress: ReadingProgress | null) => Promise<void>
  loadReadingProgress: () => Promise<void>

  // Recent history
  recentHistory: Paper[]
  addToHistory:  (paper: Paper) => Promise<void>
  loadHistory:   () => Promise<void>

  // Streak (genuine reads — 60+ seconds)
  streak:            StreakData
  loadStreak:        () => Promise<void>
  recordGenuineRead: () => Promise<RecordReadResult>

  // Playlists (local cache)
  playlists:    Playlist[]
  setPlaylists: (playlists: Playlist[]) => void
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_PREFS: UserPreferences = {
  topics:          [],
  difficultyLevel: 'any',
  onboardingDone:  false,
  displayName:     '',
  role:            'curious',
  institution:     '',
  primaryField:    '',
  readingGoal:     'broad',
  experienceLevel: 'intermediate',
  weeklyGoal:      5,
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  lastReadDate:  '',
  longestStreak: 0,
  totalPapers:   0,
  todayCount:    0,
  lastChecked:   '',
}

// ── Store ─────────────────────────────────────────────────────────────────────
const useStore = create<CadenceStore>((set, get) => ({

  // ── Auth ───────────────────────────────────────────────────────────────────
  user:    null,
  token:   null,
  setUser: (user) => set({ user }),

  setToken: async (token) => {
    set({ token })
    if (token) {
      const expiry = Date.now() + THIRTY_DAYS_MS
      await SecureStore.setItemAsync(TOKEN_KEY, token)
      await SecureStore.setItemAsync(TOKEN_EXPIRY, String(expiry))
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY)
    }
  },

  loadStoredToken: async () => {
    try {
      const token  = await SecureStore.getItemAsync(TOKEN_KEY)
      const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY)
      console.log('Token expiry:', new Date(Number(expiry)).toISOString())
      if (token && expiry && Date.now() < Number(expiry)) {
        set({ token })
        return true
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY)
    } catch {}
    return false
  },

  logout: async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY)
  await SecureStore.deleteItemAsync(HISTORY_KEY)
  await SecureStore.deleteItemAsync(READING_KEY)
  await SecureStore.deleteItemAsync(STREAK_KEY)
  // Clear today's pick cache
  const today = new Date().toISOString().split('T')[0]
  await SecureStore.deleteItemAsync(`todays_pick_${today}`).catch(() => {})
  await SecureStore.deleteItemAsync(`todays_pick_id_${today}`).catch(() => {})
  set({
    token:           null,
    user:            null,
    recentHistory:   [],
    readingProgress: null,
    streak:          DEFAULT_STREAK,
    savedPaperIds:   new Set(),
    playlists:       [],
  })
},

  // ── Preferences ────────────────────────────────────────────────────────────
  preferences: DEFAULT_PREFS,

  setPreferences: async (prefs) => {
    const updatedPrefs = { ...get().preferences, ...prefs }
    set({ preferences: updatedPrefs })
    await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(updatedPrefs))
  },

  loadPreferences: async () => {
    try {
      const raw = await SecureStore.getItemAsync(PREFS_KEY)
      if (raw) set({ preferences: JSON.parse(raw) })
    } catch {}
  },

  // ── Saved papers ───────────────────────────────────────────────────────────
  savedPaperIds: new Set(),
  savePaper:   (id) => set((s) => ({ savedPaperIds: new Set([...s.savedPaperIds, id]) })),
  unsavePaper: (id) => set((s) => {
    const n = new Set(s.savedPaperIds)
    n.delete(id)
    return { savedPaperIds: n }
  }),
  isSaved: (id) => get().savedPaperIds.has(id),

  // ── Reading progress ───────────────────────────────────────────────────────
  readingProgress: null,

  setReadingProgress: async (progress) => {
    set({ readingProgress: progress })
    if (progress) {
      await SecureStore.setItemAsync(READING_KEY, JSON.stringify(progress))
    } else {
      await SecureStore.deleteItemAsync(READING_KEY)
    }
  },

  loadReadingProgress: async () => {
    try {
      const raw = await SecureStore.getItemAsync(READING_KEY)
      if (raw) set({ readingProgress: JSON.parse(raw) })
    } catch {}
  },

  // ── Recent history ─────────────────────────────────────────────────────────
  recentHistory: [],

  addToHistory: async (paper) => {
    set((s) => {
      const filtered = s.recentHistory.filter((p) => p.id !== paper.id)
      const updated  = [paper, ...filtered].slice(0, 10)
      SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(updated)).catch(() => {})
      return { recentHistory: updated }
    })
  },

  loadHistory: async () => {
    try {
      const raw = await SecureStore.getItemAsync(HISTORY_KEY)
      if (raw) set({ recentHistory: JSON.parse(raw) })
    } catch {}
  },

  // ── Streak ─────────────────────────────────────────────────────────────────
  streak: DEFAULT_STREAK,

  loadStreak: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STREAK_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as StreakData
        const today = todayStr()
        // Reset today's count if it's a new day
        if (saved.lastChecked !== today) {
          set({ streak: { ...saved, todayCount: 0, lastChecked: today } })
        } else {
          set({ streak: saved })
        }
      }
    } catch {}
  },

  recordGenuineRead: async () => {
    const today = todayStr()
    const yesterday = yesterdayStr()
    const prev  = get().streak
    const oldStreak = prev.currentStreak

    const isFirstToday = prev.lastChecked !== today || prev.todayCount === 0

    // Compute new streak
    let newStreak: number
    if (prev.lastReadDate === today) {
      // Already read today — streak unchanged
      newStreak = prev.currentStreak
    } else if (prev.lastReadDate === yesterday) {
      // Consecutive day — extend streak
      newStreak = prev.currentStreak + 1
    } else if (prev.lastReadDate === '') {
      // First ever read
      newStreak = 1
    } else {
      // Gap > 1 day — streak broken, restart
      newStreak = 1
    }

    const streakBroken = oldStreak > 1 && newStreak === 1 && prev.lastReadDate !== today && prev.lastReadDate !== yesterday

    const updated: StreakData = {
      currentStreak: newStreak,
      lastReadDate:  today,
      longestStreak: Math.max(prev.longestStreak, newStreak),
      totalPapers:   prev.totalPapers + 1,
      todayCount:    (prev.lastChecked === today ? prev.todayCount : 0) + 1,
      lastChecked:   today,
    }

    set({ streak: updated })
    await SecureStore.setItemAsync(STREAK_KEY, JSON.stringify(updated))

    return { isFirstToday, newStreak, streakBroken, oldStreak }
  },

  // ── Playlists ──────────────────────────────────────────────────────────────
  playlists:    [],
  setPlaylists: (playlists) => set({ playlists }),
}))

export default useStore
export type { ReadingProgress, RecordReadResult, StreakData, UserPreferences }
