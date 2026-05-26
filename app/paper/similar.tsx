import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../../constants'
import { papersAPI } from '../../services/api'
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

export default function SimilarPapersScreen() {
  const { id }                      = useLocalSearchParams<{ id: string }>()
  const router                      = useRouter()
  const [papers, setPapers]         = useState<Paper[]>([])
  const [sourcePaper, setSource]    = useState<Paper | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [similar, source] = await Promise.all([
          papersAPI.getSimilar(String(id), 30),
          papersAPI.getById(String(id)),
        ])
        setPapers(similar)
        setSource(source)
      } catch {
        setPapers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const renderPaper = ({ item }: { item: Paper }) => {
    const categories = safeArray(item.categories)
    const authors    = safeArray(item.authors)

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/paper/${item.id}`)}
        activeOpacity={0.8}
      >
        {categories.length > 0 && (
          <View style={styles.pills}>
            {categories.slice(0, 2).map((cat, i) => (
              <View key={`${cat}-${i}`} style={styles.pill}>
                <Text style={styles.pillText}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>{safeString(item.title)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {authors.slice(0, 2).join(', ')}
          {authors.length > 2 ? ' et al.' : ''}
          {item.year ? ` · ${item.year}` : ''}
          {item.venue ? ` · ${item.venue}` : ''}
        </Text>
        {item.citation_count ? (
          <Text style={styles.citations}>
            {Number(item.citation_count).toLocaleString()} citations
          </Text>
        ) : null}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
      </View>

      {sourcePaper && (
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceLabel}>Papers similar to</Text>
          <Text style={styles.sourceTitle} numberOfLines={2}>
            {safeString(sourcePaper.title)}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Finding similar papers...</Text>
        </View>
      ) : papers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No similar papers found</Text>
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(item) => item.id}
          renderItem={renderPaper}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.count}>{papers.length} similar papers</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  sourceInfo:  { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  sourceLabel: { color: Colors.textMuted, fontSize: Fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sourceTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  emptyEmoji:  { fontSize: 40 },
  emptyTitle:  { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  list:        { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  count:       { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: Spacing.md },
  card:        { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  pills:       { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  pill:        { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:    { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  title:       { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, lineHeight: 22, marginBottom: 4 },
  meta:        { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: 4 },
  citations:   { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
})