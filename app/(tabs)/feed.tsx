import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

export default function FeedScreen() {
  const router                          = useRouter()
  const { addToHistory} = useStore()
  const [papers, setPapers]             = useState<Paper[]>([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await feedAPI.getDiscover()
      setPapers(data)
    } catch { setPapers([]) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const renderPaper = ({ item }: { item: Paper }) => {
    const categories = safeArray(item.categories)
    const authors    = safeArray(item.authors)
    const isOA       = !!(item.open_access_url || item.arxiv_id)

    return (
      <TouchableOpacity
        style={styles.paperCard}
        onPress={() => {
          addToHistory(item)
          feedAPI.logInteraction({ paper_id: item.id, type: 'read' }).catch(() => {})
          router.push(`/paper/${item.id}`)
        }}
        activeOpacity={0.8}
      >
        <View style={styles.cardMain}>
          {categories.length > 0 && (
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
            </View>
          )}
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

        {item.citation_count ? (
          <Text style={styles.citations}>
            {Number(item.citation_count).toLocaleString()} citations
          </Text>
        ) : null}
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
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
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor={Colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Feed</Text>
            <Text style={styles.headerSub}>Your personalized reading list</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>◈</Text>
            <Text style={styles.emptyTitle}>No papers yet</Text>
            <Text style={styles.emptySubtitle}>Read and save papers to train your feed</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header:       { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle:  { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold },
  headerSub:    { color: Colors.textMuted, fontSize: Fonts.sizes.sm, marginTop: 2 },
  list:         { paddingBottom: Spacing.xxl },
  paperCard:    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cardMain:     { marginBottom: Spacing.sm },
  pills:        { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.xs },
  pill:         { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillText:     { color: Colors.accent, fontSize: 9, fontWeight: Fonts.weights.semibold },
  oaBadge:      { backgroundColor: 'rgba(79,247,160,0.15)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#4FF7A0' },
  oaBadgeText:  { color: '#4FF7A0', fontSize: 9, fontWeight: Fonts.weights.semibold },
  paperTitle:   { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, lineHeight: 22, marginBottom: 2 },
  paperMeta:    { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  abstract:     { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 20, marginBottom: Spacing.xs },
  citations:    { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  empty:        { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyEmoji:   { fontSize: 40, color: Colors.textMuted },
  emptyTitle:   { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  emptySubtitle:{ color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center' },
})