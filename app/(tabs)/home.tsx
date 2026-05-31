import { useFocusEffect, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing, Swipe } from '../../constants'
import { feedAPI } from '../../services/api'
import {
  registerForPushNotifications,
  scheduleDailyReminder,
  scheduleStreakAtRiskReminder,
  scheduleWeeklyDigest,
} from '../../services/notifications'
import useStore from '../../store/useStore'
import type { Paper } from '../../types'
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH  = SCREEN_WIDTH - Spacing.lg * 2
const CARD_HEIGHT = 460

const GENRES = [
  { id: 'cs.AI',   label: 'AI',        emoji: '🤖' },
  { id: 'cs.LG',   label: 'ML',        emoji: '🧠' },
  { id: 'cs.CL',   label: 'NLP',       emoji: '💬' },
  { id: 'q-bio',   label: 'Biology',   emoji: '🧬' },
  { id: 'physics', label: 'Physics',   emoji: '⚛️'  },
  { id: 'math',    label: 'Math',      emoji: '📐' },
  { id: 'econ',    label: 'Economics', emoji: '📊' },
  { id: 'med',     label: 'Medicine',  emoji: '🏥' },
]


function safeString(val: any): string {
  if (!val) return ''
  return String(val)
}
function safeArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  if (typeof val === 'string') return val.split(/[\s,]+/).filter(Boolean)
  return []
}

const MiniCard = ({ paper, onPress }: { paper: Paper; onPress: () => void }) => {
  const categories = safeArray(paper.categories)
  return (
    <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.8}>
      {categories.length > 0 && (
        <View style={styles.miniPill}>
          <Text style={styles.miniPillText}>{categories[0]}</Text>
        </View>
      )}
      <Text style={styles.miniTitle} numberOfLines={3}>{safeString(paper.title)}</Text>
      {paper.year ? <Text style={styles.miniYear}>{paper.year}</Text> : null}
    </TouchableOpacity>
  )
}

function HSection({ title, papers, onPaperPress, loading = false }: {
  title: string; papers: Paper[]; onPaperPress: (p: Paper) => void; loading?: boolean
}) {
  if (!loading && papers.length === 0) return null
  return (
    <View style={styles.hSection}>
      <Text style={styles.hSectionTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.accent} style={{ marginLeft: Spacing.lg }} />
      ) : (
        <FlatList
          horizontal
          data={papers}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          getItemLayout={(_, index) => ({ length: 176, offset: 176 * index, index })}
          renderItem={({ item }) => (
            <MiniCard paper={item} onPress={() => onPaperPress(item)} />
          )}
        />
      )}
    </View>
  )
}

function CardContent({ paper }: { paper: Paper }) {
  const categories = safeArray(paper.categories)
  const authors    = safeArray(paper.authors)
  const isRecent   = paper.year && paper.year >= 2023
  const isCited    = paper.citation_count && paper.citation_count > 100

  return (
    <View style={styles.content}>
      {/* Top row — category pill + badges */}
      <View style={styles.cardTopRow}>
        <View style={styles.categories}>
          {categories.slice(0, 2).map((cat, i) => (
            <View key={`${cat}-${i}`} style={styles.categoryPill}>
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
        </View>
        <View style={styles.badges}>
          {isRecent && (
            <View style={styles.badgeNew}>
              <Text style={styles.badgeNewText}>NEW</Text>
            </View>
          )}
          {isCited && (
            <View style={styles.badgeCited}>
              <Text style={styles.badgeCitedText}>🔥 {Number(paper.citation_count).toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title — bigger and bolder */}
      <Text style={styles.cardTitle} numberOfLines={4}>
        {safeString(paper.title)}
      </Text>

      {/* Meta */}
      <Text style={styles.cardMeta} numberOfLines={1}>
        {authors.slice(0, 2).join(', ')}
        {authors.length > 2 ? ' et al.' : ''}
        {paper.year ? ` · ${paper.year}` : ''}
      </Text>

      {paper.venue ? (
        <Text style={styles.cardVenue} numberOfLines={1}>{paper.venue}</Text>
      ) : null}

      {/* Abstract with "Read more" fade */}
      <View style={styles.abstractContainer}>
        <Text style={styles.cardAbstract} numberOfLines={6}>
          {safeString(paper.abstract)}
        </Text>
        <View style={styles.abstractFade} />
      </View>

      {/* Bottom hint */}
      <Text style={styles.tapHint}>Tap to read</Text>
    </View>
  )
}

export default function HomeScreen() {
  const router = useRouter()

  // Card stack
  const [papers, setPapers]         = useState<Paper[]>([])
  const [topIndex, setTopIndex]     = useState(0)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Sections — each from its own endpoint
  const [likedPapers, setLikedPapers]         = useState<Paper[]>([])
  const [moreLikeThis, setMoreLikeThis]       = useState<Paper[]>([])
  const [todaysPick, setTodaysPick]           = useState<Paper | null>(null)
  const [mixed, setMixed]                     = useState<Paper[]>([])
  const [madeForYou, setMadeForYou]           = useState<Paper[]>([])
  const [trendingPapers, setTrendingPapers]   = useState<Paper[]>([])
  const [selectedGenre, setSelectedGenre]     = useState(GENRES[0].id)
  const [likedPapers2, setLikedPapers2]       = useState<Paper[]>([]) // local swipe likes
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [stackError, setStackError] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  let toastTimeout: NodeJS.Timeout

  const { addToHistory, recentHistory, loadHistory } = useStore()

  const topIndexRef = useRef(0)
  const position    = useRef(new Animated.ValueXY()).current
  const isAnimating = useRef(false)

  const showToast = (message: string) => {
    if (toastTimeout) clearTimeout(toastTimeout)
    setToast({ message, visible: true })
    toastTimeout = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 1500)
  }

  // ── Load card stack (fast, shown first) ────────────────────────────────────
  const loadStack = useCallback(async () => {
    try {
      const discoverPapers = await feedAPI.getDiscover()
      // Exclude today's pick from stack if we have it
      const todayKey = `todays_pick_id_${new Date().toISOString().split('T')[0]}`
      const pickId   = await SecureStore.getItemAsync(todayKey).catch(() => null)
      const filtered = pickId ? discoverPapers.filter(p => p.id !== pickId) : discoverPapers
      setPapers(filtered)

      // Mixed = different random seed from main discover
      setMixed([...discoverPapers].sort(() => Math.random() - 0.5).slice(0, 10))
      setMadeForYou(discoverPapers.slice(10, 20))
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

 useEffect(() => {
  const init = async () => {
    setLoading(false) // show UI immediately

    // Fire today's pick AND discover at the same time
    try {
      const today        = new Date().toISOString().split('T')[0]
      const pickCacheKey = `todays_pick_${today}`
      const pickIdKey    = `todays_pick_id_${today}`


      const cachedPick = await SecureStore.getItemAsync(pickCacheKey).catch(() => null)

      if (cachedPick) {
        // Pick is cached — fire discover immediately in parallel with nothing
        const pick = JSON.parse(cachedPick) as Paper
        setTodaysPick(pick)

        const discoverPapers = await feedAPI.getDiscover()
        const filtered = discoverPapers.filter(p => p.id !== pick.id)
        setPapers(filtered)
        setMixed([...discoverPapers].sort(() => Math.random() - 0.5).slice(0, 10))
        setMadeForYou(discoverPapers.slice(10, 20))
        setStackError(false)
       
      } else {
        // No cache — fire both in parallel
        const [pick, discoverPapers] = await Promise.all([
          feedAPI.getTodaysPick(),
          feedAPI.getDiscover(),
        ])
        setTodaysPick(pick)
        await SecureStore.setItemAsync(pickCacheKey, JSON.stringify(pick)).catch(() => {})
        await SecureStore.setItemAsync(pickIdKey, pick.id).catch(() => {})

        const filtered = discoverPapers.filter(p => p.id !== pick.id)
        setPapers(filtered)
        setMixed([...discoverPapers].sort(() => Math.random() - 0.5).slice(0, 10))
        setMadeForYou(discoverPapers.slice(10, 20))
      }
    } catch {setStackError(true)}

    // Sections in parallel — unchanged
    try {
      const [liked, moreLike, trending] = await Promise.all([
        feedAPI.getLiked(10),
        feedAPI.getSimilarToSaved(10),
        feedAPI.getTrending(selectedGenre, 10),
      ])
      setLikedPapers(liked)
      setMoreLikeThis(moreLike)
      setTrendingPapers(trending)
    } catch {}
    finally { setSectionsLoading(false) }

    await loadHistory()
    const granted = await registerForPushNotifications()
    if (granted) { await scheduleDailyReminder(); await scheduleWeeklyDigest() 
      const { streak } = useStore.getState()
    if (streak.currentStreak > 1) {
      await scheduleStreakAtRiskReminder(streak.currentStreak)
    }

    }
  }
  init()
}, [])

  useFocusEffect(useCallback(() => { loadHistory() }, []))

  // Reload trending when genre changes
  useEffect(() => {
    const fetchTrendingForGenre = async () => {
      setTrendingLoading(true)
      try {
        const data = await feedAPI.getTrending(selectedGenre, 10)
        setTrendingPapers(data)
      } catch (error) {
        console.error('Failed to fetch trending:', error)
        setTrendingPapers([])
      } finally {
        setTrendingLoading(false)
      }
    }
    fetchTrendingForGenre()
  }, [selectedGenre])

  useEffect(() => { position.setValue({ x: 0, y: 0 }) }, [topIndex])

  const advanceCard = useCallback(() => {
    isAnimating.current = false
    const next = topIndexRef.current + 1
    topIndexRef.current = next
    position.setValue({ x: 0, y: 0 })
    setTopIndex(next)
  }, [position])

  const swipeOut = useCallback((direction: 'left' | 'right', dy: number) => {
    if (isAnimating.current) return
    isAnimating.current = true
    Animated.timing(position, {
      toValue:         { x: direction === 'right' ? Swipe.outOfScreenX : -Swipe.outOfScreenX, y: dy },
      duration:        250,
      useNativeDriver: true,
    }).start(advanceCard)
  }, [advanceCard, position])

  const handleLike = useCallback(() => {
    if (isAnimating.current) return
    const paper = papers[topIndexRef.current]
    if (!paper) return
    feedAPI.logInteraction({ paper_id: paper.id, type: 'like' }).catch(() => {})
    setLikedPapers2(prev => [paper, ...prev].slice(0, 20))
    showToast('Liked')
    swipeOut('right', 0)
  }, [papers, swipeOut])

  const handleSkip = useCallback(() => {
    if (isAnimating.current) return
    const paper = papers[topIndexRef.current]
    if (!paper) return
    feedAPI.logInteraction({ paper_id: paper.id, type: 'skip' }).catch(() => {})
    showToast('Skipped')
    swipeOut('left', 0)
  }, [papers, swipeOut])

  const goToPaper = (paper: Paper) => {
    addToHistory(paper)
    feedAPI.logInteraction({ paper_id: paper.id, type: 'read' }).catch(() => {})
    router.push(`/paper/${paper.id}`)
  }

  const topPaper    = papers[topIndex]
  const secondPaper = papers[topIndex + 1]
  const thirdPaper  = papers[topIndex + 2]

  // Merge local swipe likes with backend likes
  const allLiked = [...likedPapers2, ...likedPapers]
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    .slice(0, 20)


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
  setRefreshing(true)
  const today = new Date().toISOString().split('T')[0]
  await SecureStore.deleteItemAsync(`todays_pick_${today}`).catch(() => {})
  await SecureStore.deleteItemAsync(`todays_pick_id_${today}`).catch(() => {})
  setTopIndex(0)
  topIndexRef.current = 0
  setPapers([])
  setTodaysPick(null)
  setLikedPapers([])
  setMoreLikeThis([])
  setTrendingPapers([])
  setSectionsLoading(true)

  let pickId: string | null = null
  try {
    const pick = await feedAPI.getTodaysPick()
    setTodaysPick(pick)
    pickId = pick.id
    const today2 = new Date().toISOString().split('T')[0]
    await SecureStore.setItemAsync(`todays_pick_${today2}`, JSON.stringify(pick)).catch(() => {})
    await SecureStore.setItemAsync(`todays_pick_id_${today2}`, pick.id).catch(() => {})
  } catch {}

  try {
    const discoverPapers = await feedAPI.getDiscover()
    const filtered = pickId ? discoverPapers.filter(p => p.id !== pickId) : discoverPapers
    setPapers(filtered)
    setMixed([...discoverPapers].sort(() => Math.random() - 0.5).slice(0, 10))
    setMadeForYou(discoverPapers.slice(10, 20))
  } catch {}

  try {
    const [liked, moreLike, trending] = await Promise.all([
      feedAPI.getLiked(10),
      feedAPI.getSimilarToSaved(10),
      feedAPI.getTrending(selectedGenre, 10),
    ])
    setLikedPapers(liked)
    setMoreLikeThis(moreLike)
    setTrendingPapers(trending)
  } catch {}
  finally { setSectionsLoading(false); setRefreshing(false) }
}}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Card stack */}
        <View style={styles.swipeSection}>
          <View style={styles.swipeHeader}>
            <Text style={styles.swipeSectionTitle}>💎 Discover</Text>
            {/* Hint text removed */}
          </View>
          <View style={styles.cardStack}>
            {thirdPaper && (
              <View style={[styles.card, styles.thirdCard]} pointerEvents="none">
                <CardContent paper={thirdPaper} />
              </View>
            )}
            {secondPaper && (
              <View style={[styles.card, styles.secondCard]} pointerEvents="none">
                <CardContent paper={secondPaper} />
              </View>
            )}
            {topPaper ? (
              <Animated.View
                style={[styles.card, styles.topCard, {
                  transform: [{ translateX: position.x }, { translateY: position.y }],
                }]}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.95}
                  onPress={() => {
                    addToHistory(topPaper)
                    feedAPI.logInteraction({ paper_id: topPaper.id, type: 'read' }).catch(() => {})
                    router.push(`/paper/${topPaper.id}`)
                  }}
                >
                  <CardContent paper={topPaper} />
                </TouchableOpacity>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.cardBtn, styles.skipBtn]} onPress={handleSkip}>
                    <Text style={styles.skipBtnText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cardBtn, styles.likeBtn]} onPress={handleLike}>
                    <Text style={styles.likeBtnText}>♥</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
                <View style={styles.emptyStack}>
    {stackError ? (
      <>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text style={styles.emptyTitle}>Couldn't load papers</Text>
        <Text style={styles.emptySubtitle}>Pull down to try again</Text>
      </>
    ) : (
      <>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
      </>
    )}
  </View>

            )}
            {/* Toast message */}
            {toast.visible && (
              <View style={styles.toast}>
                <Text style={styles.toastText}>{toast.message}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's Pick */}
        {todaysPick && (
          <View style={styles.hSection}>
            <Text style={styles.hSectionTitle}>🔥 Today's Pick</Text>
            <TouchableOpacity
              style={styles.todayCard}
              onPress={() => goToPaper(todaysPick)}
              activeOpacity={0.8}
            >
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>HOT FOR YOU</Text>
              </View>
              <Text style={styles.todayTitle} numberOfLines={3}>
                {safeString(todaysPick.title)}
              </Text>
              <Text style={styles.todayMeta} numberOfLines={1}>
                {safeArray(todaysPick.authors).slice(0, 2).join(', ')}
                {todaysPick.year ? ` · ${todaysPick.year}` : ''}
              </Text>
              <Text style={styles.todayAbstract} numberOfLines={3}>
                {safeString(todaysPick.abstract)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <HSection
          title="♥ Liked by You"
          papers={allLiked}
          onPaperPress={goToPaper}
          loading={sectionsLoading && likedPapers.length === 0}
        />

        {recentHistory.length > 0 && (
          <HSection title="Recently Read" papers={recentHistory.slice(0, 10)} onPaperPress={goToPaper} />
        )}

        <HSection
          title="More of What You Like"
          papers={moreLikeThis}
          onPaperPress={goToPaper}
          loading={sectionsLoading && moreLikeThis.length === 0}
        />

        <HSection title="Mixed for You" papers={mixed} onPaperPress={goToPaper} />

        {/* Trending by Genre */}
        <View style={styles.hSection}>
          <Text style={styles.hSectionTitle}>Trending by Genre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
            {GENRES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genreChip, selectedGenre === g.id && styles.genreChipActive]}
                onPress={() => setSelectedGenre(g.id)}
              >
                <Text style={styles.genreEmoji}>{g.emoji}</Text>
                <Text style={[styles.genreLabel, selectedGenre === g.id && styles.genreLabelActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {trendingLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={{ marginLeft: Spacing.lg }} />
          ) : trendingPapers.length > 0 ? (
            <FlatList
              horizontal
              data={trendingPapers}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              getItemLayout={(_, index) => ({ length: 176, offset: 176 * index, index })}
              renderItem={({ item }) => (
                <MiniCard paper={item} onPress={() => goToPaper(item)} />
              )}
            />
          ) : (
            <Text style={styles.noGenreText}>
              No trending papers for {GENRES.find(g => g.id === selectedGenre)?.label}
            </Text>
          )}
        </View>

        <HSection title="✦ Made for You" papers={madeForYou} onPaperPress={goToPaper} />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  swipeSection:     { marginBottom: Spacing.md },
  swipeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  swipeSectionTitle:{ color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  cardStack:        { height: CARD_HEIGHT + 20, width: '100%', alignItems: 'center', justifyContent: 'center' },

  topCard:          { zIndex: 10 },
  secondCard:       { zIndex: 5, transform: [{ scale: 0.96 }, { translateY: 10 }] },
  thirdCard:        { zIndex: 1, transform: [{ scale: 0.92 }, { translateY: 20 }] },
  emptyStack:       { alignItems: 'center', gap: Spacing.sm },
  emptyEmoji:       { fontSize: 40 },
  emptyTitle:       { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  hSection:         { marginBottom: Spacing.lg },
  hSectionTitle:    { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  hList:            { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  miniCard:         { width: 160, backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  miniPill:         { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: Spacing.xs },
  miniPillText:     { color: Colors.accent, fontSize: 9, fontWeight: Fonts.weights.semibold },
  miniTitle:        { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, lineHeight: 18, marginBottom: 4 },
  miniYear:         { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  todayCard:        { marginHorizontal: Spacing.lg, backgroundColor: Colors.accentDim, borderRadius: 16, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.accent },
  todayBadge:       { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  todayBadgeText:   { color: '#fff', fontSize: 9, fontWeight: Fonts.weights.bold, letterSpacing: 1 },
  todayTitle:       { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, lineHeight: 24, marginBottom: Spacing.sm },
  todayMeta:        { color: Colors.accent, fontSize: Fonts.sizes.xs, marginBottom: Spacing.sm },
  todayAbstract:    { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 20 },
  genreRow:         { paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  genreChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  genreChipActive:  { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  genreEmoji:       { fontSize: 14 },
  genreLabel:       { color: Colors.textSecondary, fontSize: Fonts.sizes.sm },
  genreLabelActive: { color: Colors.accent },
  emptySubtitle: { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center', marginTop: 4 },
  noGenreText:      { color: Colors.textMuted, fontSize: Fonts.sizes.sm, paddingHorizontal: Spacing.lg, fontStyle: 'italic' },
  toast: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
    zIndex: 20,
  },
  toastText: {
    color: '#fff',
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  content:           { flex: 1, padding: Spacing.lg, paddingBottom: Spacing.sm },
cardTopRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
categories:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
badges:            { flexDirection: 'row', gap: 6, marginLeft: 8 },
categoryPill:      { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
categoryText:      { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
badgeNew:          { backgroundColor: 'rgba(45,212,191,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(45,212,191,0.4)' },
badgeNewText:      { color: '#2DD4BF', fontSize: 9, fontWeight: Fonts.weights.bold, letterSpacing: 0.8 },
badgeCited:        { backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' },
badgeCitedText:    { color: '#FBBF24', fontSize: 9, fontWeight: Fonts.weights.bold },
cardTitle:         { color: Colors.textPrimary, fontSize: 22, fontWeight: Fonts.weights.bold, lineHeight: 30, marginBottom: Spacing.sm, letterSpacing: -0.3 },
cardMeta:          { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: 3 },
cardVenue:         { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, marginBottom: Spacing.md, letterSpacing: 0.3 },
abstractContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
cardAbstract:      { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 21 },
abstractFade:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, backgroundColor: 'transparent' },
tapHint:           { color: Colors.textMuted, fontSize: 10, textAlign: 'center', paddingTop: Spacing.sm, letterSpacing: 0.5 },
card:              { position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 24, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20 },
cardActions:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
cardBtn:           { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
skipBtn:           { backgroundColor: 'rgba(247,79,79,0.12)', borderWidth: 1.5, borderColor: Colors.skip },
likeBtn:           { backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1.5, borderColor: Colors.accent },
skipBtnText:       { color: Colors.skip, fontSize: 22, fontWeight: Fonts.weights.bold },
likeBtnText:       { color: Colors.accent, fontSize: 22 },
})