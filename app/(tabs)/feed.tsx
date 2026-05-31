import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  const router = useRouter()
  const { addToHistory } = useStore()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(false)
    setError(false)
    try {
      const data = await feedAPI.getDiscover()
      setPapers(data)
    } catch {
      setError(true)
      setPapers([])
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [])

  const renderPaper = ({ item }: { item: Paper }) => {
    const categories = safeArray(item.categories)
    const authors = safeArray(item.authors)
    const isOA = !!(item.open_access_url || item.arxiv_id)

    return (
      <TouchableOpacity
        style={styles.paperCard}
        onPress={() => {
          addToHistory(item)
          feedAPI.logInteraction({ paper_id: item.id, type: 'read' }).catch(() => {})
          router.push(`/paper/${item.id}`)
        }}
        activeOpacity={0.7} // Slightly lower opacity for better touch feedback
      >
        <View style={styles.cardMain}>
          {/* Top Row: Badges */}
          {(categories.length > 0 || isOA) && (
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

          {/* Title & Meta */}
          <Text style={styles.paperTitle} numberOfLines={2}>
            {safeString(item.title)}
          </Text>
          <Text style={styles.paperMeta} numberOfLines={1}>
            {authors.slice(0, 2).join(', ')}
            {authors.length > 2 ? ' et al.' : ''}
            {item.year ? ` • ${item.year}` : ''}
            {item.venue ? ` • ${item.venue}` : ''}
          </Text>
        </View>

        {/* Abstract */}
        <Text style={styles.abstract} numberOfLines={3}>
          {safeString(item.abstract)}
        </Text>

        {/* Footer: Citations & Call to Action */}
        <View style={styles.cardFooter}>
          {item.citation_count ? (
            <View style={styles.citationBadge}>
              <Text style={styles.citations}>
                {Number(item.citation_count).toLocaleString()} citations
              </Text>
            </View>
          ) : (
            <View /> /* Empty view to push CTA to the right if no citations */
          )}
          
          <Text style={styles.readMoreText}>Read Article →</Text>
        </View>
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
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
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
        }
        ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.background 
  },
  header: { 
    paddingHorizontal: Spacing.lg, 
    paddingTop: Spacing.md, 
    paddingBottom: Spacing.lg 
  },
  headerTitle: { 
    color: Colors.textPrimary, 
    fontSize: Fonts.sizes.xxl, 
    fontWeight: Fonts.weights.bold 
  },
  headerSub: { 
    color: Colors.textMuted, 
    fontSize: Fonts.sizes.sm, 
    marginTop: 4 
  },
  list: { 
    paddingBottom: Spacing.xxl 
  },
  
  // --- Modern Card Styling ---
  paperCard: { 
    backgroundColor: Colors.surface || '#FFFFFF', // Use your theme's card/surface color
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    // Android Shadow
    elevation: 3,
  },
  cardMain: { 
    marginBottom: Spacing.sm 
  },
  
  // --- Badges ---
  pills: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: Spacing.sm 
  },
  pill: { 
    backgroundColor: Colors.accentDim || 'rgba(0,122,255,0.1)', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  pillText: { 
    color: Colors.accent, 
    fontSize: 10, 
    fontWeight: Fonts.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  oaBadge: { 
    backgroundColor: 'rgba(79,247,160,0.15)', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderWidth: 1, 
    borderColor: 'rgba(79,247,160,0.4)' 
  },
  oaBadgeText: { 
    color: '#28A745', // Darkened slightly for better readability
    fontSize: 10, 
    fontWeight: Fonts.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // --- Typography ---
  paperTitle: { 
    color: Colors.textPrimary, 
    fontSize: Fonts.sizes.md + 1, // Slightly larger
    fontWeight: Fonts.weights.bold, 
    lineHeight: 24, 
    marginBottom: 6 
  },
  paperMeta: { 
    color: Colors.accent, // Highlighting the author/venue string slightly
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.medium,
  },
  abstract: { 
    color: Colors.textSecondary, 
    fontSize: Fonts.sizes.sm, 
    lineHeight: 22, 
    marginBottom: Spacing.md 
  },
  
  // --- Footer & CTA ---
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  citationBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  citations: { 
    color: Colors.textMuted, 
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.medium,
  },
  readMoreText: {
    color: Colors.accent,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
  },
  
  // --- Empty States ---
  empty: { 
    alignItems: 'center', 
    paddingVertical: Spacing.xxl, 
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { 
    fontSize: 48, 
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  emptyTitle: { 
    color: Colors.textPrimary, 
    fontSize: Fonts.sizes.lg, 
    fontWeight: Fonts.weights.bold 
  },
  emptySubtitle: { 
    color: Colors.textMuted, 
    fontSize: Fonts.sizes.sm, 
    textAlign: 'center',
    lineHeight: 20,
  },
})