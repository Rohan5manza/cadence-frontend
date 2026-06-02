import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../../constants'
import { feedAPI } from '../../services/api'
import useStore from '../../store/useStore'
import type { Paper } from '../../types'

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

type SortMode = 'relevance' | 'date' | 'popular'

const SORT_OPTIONS: { id: SortMode; label: string; emoji: string }[] = [
  { id: 'relevance', label: 'For You',   emoji: '✦' },
  { id: 'date',      label: 'Latest',    emoji: '🕐' },
  { id: 'popular',   label: 'Most Cited',emoji: '🔥' },
]

export default function FeedScreen() {
  const router               = useRouter()
  const { addToHistory }     = useStore()
  const [papers, setPapers]  = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]    = useState(false)
  const [sort, setSort]      = useState<SortMode>('relevance')

  const load = useCallback(async (sortMode: SortMode) => {
  setError(false)
  try {
    const data = await feedAPI.getDiscover(sortMode)
    setPapers(data)
  } catch {
    setError(true)
    setPapers([])
  } finally {
    setRefreshing(false)
  }
}, []) 

  useEffect(() => { load('relevance') }, [])

  // Reload when sort changes
 const handleSort = (mode: SortMode) => {
  if (mode === sort) return
  setSort(mode)
  setPapers([])
  load(mode)
}


  const renderPaper = ({ item }: { item: Paper }) => {
    const categories = safeArray(item.categories)
    const authors    = safeArray(item.authors)
    const isOA       = !!(item.open_access_url || item.arxiv_id)
    const isRecent   = item.year && item.year >= 2023

    return (
      <TouchableOpacity
        style={styles.paperCard}
        onPress={() => {
          addToHistory(item)
          feedAPI.logInteraction({ paper_id: item.id, type: 'read' }).catch(() => {})
          router.push(`/paper/${item.id}`)
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardMain}>
          <View style={styles.pills}>
            {categories.slice(0, 2).map((cat, i) => (
              <View key={`${cat}-${i}`} style={styles.pill}>
                <Text style={styles.pillText}>{cat}</Text>
              </View>
            ))}
            {isOA && (
              <View style={styles.oaBadge}>
                <Text style={styles.oaBadgeText}>Open Access</Text>
              </View>
            )}
            {isRecent && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.paperTitle} numberOfLines={2}>
            {safeString(item.title)}
          </Text>
          <Text style={styles.paperMeta} numberOfLines={1}>
            {authors.slice(0, 2).join(', ')}
            {authors.length > 2 ? ' et al.' : ''}
            {item.year ? ` · ${item.year}` : ''}
            {item.venue ? ` · ${item.venue}` : ''}
          </Text>
        </View>

        <Text style={styles.abstract} numberOfLines={3}>
          {safeString(item.abstract)}
        </Text>

        <View style={styles.cardFooter}>
          {item.citation_count ? (
            <Text style={styles.citations}>
              {Number(item.citation_count).toLocaleString()} citations
            </Text>
          ) : <View />}
          <Text style={styles.readMore}>Read →</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={papers}
        keyExtractor={(item) => item.id}
        renderItem={renderPaper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(sort) }}
            tintColor={Colors.accent}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Feed</Text>
              <Text style={styles.headerSub}>Your personalized reading list</Text>
            </View>

            {/* Sort chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRow}
            >
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.sortChip, sort === opt.id && styles.sortChipActive]}
                  onPress={() => handleSort(opt.id)}
                >
                  <Text style={styles.sortEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.sortLabel, sort === opt.id && styles.sortLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading && (
              <ActivityIndicator
                size="small"
                color={Colors.accent}
                style={{ marginVertical: Spacing.lg }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            error ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={styles.emptyTitle}>Couldn't load feed</Text>
                <Text style={styles.emptySubtitle}>Pull down to try again</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>◈</Text>
                <Text style={styles.emptyTitle}>No papers yet</Text>
                <Text style={styles.emptySubtitle}>
                  Read and save papers to train your feed
                </Text>
              </View>
            )
          ) : null
        }
        ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle:    { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold },
  headerSub:      { color: Colors.textMuted, fontSize: Fonts.sizes.sm, marginTop: 4 },
  sortRow:        { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: Spacing.md },
  sortChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  sortChipActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  sortEmoji:      { fontSize: 13 },
  sortLabel:      { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  sortLabelActive:{ color: Colors.accent, fontWeight: Fonts.weights.semibold },
  list:           { paddingBottom: Spacing.xxl },
  paperCard:      { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  cardMain:       { marginBottom: Spacing.sm },
  pills:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  pill:           { backgroundColor: Colors.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:       { color: Colors.accent, fontSize: 10, fontWeight: Fonts.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  oaBadge:        { backgroundColor: 'rgba(79,247,160,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(79,247,160,0.4)' },
  oaBadgeText:    { color: '#28A745', fontSize: 10, fontWeight: Fonts.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  newBadge:       { backgroundColor: 'rgba(45,212,191,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(45,212,191,0.4)' },
  newBadgeText:   { color: '#2DD4BF', fontSize: 10, fontWeight: Fonts.weights.bold, letterSpacing: 0.8 },
  paperTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, lineHeight: 24, marginBottom: 6 },
  paperMeta:      { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  abstract:       { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 22, marginBottom: Spacing.md },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  citations:      { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  readMore:       { color: Colors.accent, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.bold },
  empty:          { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  emptyEmoji:     { fontSize: 48, color: Colors.textMuted, marginBottom: Spacing.sm },
  emptyTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  emptySubtitle:  { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
})