import { useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard, ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const SUGGESTED_QUERIES = [
  'transformer attention',
  'large language models',
  'CRISPR gene editing',
  'climate change',
  'reinforcement learning',
  'cancer immunotherapy',
  'quantum computing',
  'neural networks',
  'computer vision',
  'protein folding',
]

type SortMode = 'relevance' | 'year' | 'citations'
type FilterAccess = 'all' | 'open'

const HISTORY_KEY = 'search_history'

export default function SearchScreen() {
  const router                            = useRouter()
  const [query, setQuery]                 = useState('')
  const [results, setResults]             = useState<Paper[]>([])
  const [loading, setLoading]             = useState(false)
  const [searched, setSearched]           = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [sortMode, setSortMode]           = useState<SortMode>('relevance')
  const [filterAccess, setFilterAccess]   = useState<FilterAccess>('all')
  const [filterYearFrom, setFilterYearFrom] = useState<number | null>(null)
  const [showFilters, setShowFilters]     = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [rawResults, setRawResults]       = useState<Paper[]>([])
  const inputRef                          = useRef<TextInput>(null)

  const addToHistory = (q: string) => {
    setSearchHistory((prev) => {
      const updated = [q, ...prev.filter((h) => h !== q)].slice(0, 10)
      return updated
    })
  }

  const getSortedFiltered = useCallback((papers: Paper[]): Paper[] => {
    let filtered = [...papers]

    // Filter open access
    if (filterAccess === 'open') {
      filtered = filtered.filter((p) => p.open_access_url || p.arxiv_id)
    }

    // Filter by year
    if (filterYearFrom) {
      filtered = filtered.filter((p) => p.year && p.year >= filterYearFrom)
    }

    // Sort
    if (sortMode === 'year') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0))
    } else if (sortMode === 'citations') {
      filtered.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0))
    }

    return filtered
  }, [sortMode, filterAccess, filterYearFrom])

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return

    Keyboard.dismiss()
    setLoading(true)
    setError(null)
    setSearched(true)
    addToHistory(searchQuery.trim())

    try {
      const data = await papersAPI.search(searchQuery.trim(), 50)
      setRawResults(data)
      setResults(getSortedFiltered(data))
    } catch {
      setError('Search failed. Check your connection and try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, getSortedFiltered])

  // Re-apply sort/filter when they change
  const applyFilters = useCallback(() => {
    setResults(getSortedFiltered(rawResults))
  }, [rawResults, getSortedFiltered])

  const handleSuggestion = (s: string) => {
    setQuery(s)
    handleSearch(s)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setRawResults([])
    setSearched(false)
    setError(null)
    inputRef.current?.focus()
  }

  const renderPaper = ({ item }: { item: Paper }) => {
    const categories = safeArray(item.categories)
    const authors    = safeArray(item.authors)
    const isOA       = !!(item.open_access_url || item.arxiv_id)

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => router.push(`/paper/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          {categories.length > 0 && (
            <View style={styles.pills}>
              {categories.slice(0, 2).map((cat, i) => (
                <View key={`${cat}-${i}`} style={styles.pill}>
                  <Text style={styles.pillText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
          {isOA && (
            <View style={styles.oaBadge}>
              <Text style={styles.oaBadgeText}>Open Access</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {safeString(item.title)}
        </Text>

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
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.inputWrapper}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search papers..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
          onPress={() => handleSearch()}
          disabled={!query.trim() || loading}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filter toggle */}
      {searched && !loading && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {/* Sort chips */}
            {(['relevance', 'year', 'citations'] as SortMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.filterChip, sortMode === mode && styles.filterChipActive]}
                onPress={() => { setSortMode(mode); applyFilters() }}
              >
                <Text style={[styles.filterChipText, sortMode === mode && styles.filterChipTextActive]}>
                  {mode === 'relevance' ? '✦ Relevant' : mode === 'year' ? '📅 Newest' : '📊 Most Cited'}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Open access filter */}
            <TouchableOpacity
              style={[styles.filterChip, filterAccess === 'open' && styles.filterChipActive]}
              onPress={() => { setFilterAccess(filterAccess === 'open' ? 'all' : 'open'); applyFilters() }}
            >
              <Text style={[styles.filterChipText, filterAccess === 'open' && styles.filterChipTextActive]}>
                🔓 Open Access
              </Text>
            </TouchableOpacity>

            {/* Year filters */}
            {[2024, 2022, 2020, 2015].map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.filterChip, filterYearFrom === year && styles.filterChipActive]}
                onPress={() => { setFilterYearFrom(filterYearFrom === year ? null : year); applyFilters() }}
              >
                <Text style={[styles.filterChipText, filterYearFrom === year && styles.filterChipTextActive]}>
                  {year}+
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Searching papers...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !searched ? (
        <ScrollView contentContainerStyle={styles.preSearchContent} showsVerticalScrollIndicator={false}>
          {/* Search history */}
          {searchHistory.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setSearchHistory([])}>
                  <Text style={styles.clearHistory}>Clear</Text>
                </TouchableOpacity>
              </View>
              {searchHistory.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={styles.historyItem}
                  onPress={() => handleSuggestion(h)}
                >
                  <Text style={styles.historyIcon}>🕐</Text>
                  <Text style={styles.historyText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Try Searching For</Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTED_QUERIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords or remove some filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderPaper}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} results for "{query}"
              {filterAccess === 'open' ? ' · Open Access' : ''}
              {filterYearFrom ? ` · ${filterYearFrom}+` : ''}
            </Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: Colors.background },
  searchBar:            { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputWrapper:         { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm, gap: Spacing.xs },
  searchIcon:           { color: Colors.textMuted, fontSize: Fonts.sizes.lg },
  input:                { flex: 1, color: Colors.textPrimary, fontSize: Fonts.sizes.md, paddingVertical: Spacing.sm },
  clearBtn:             { color: Colors.textMuted, fontSize: Fonts.sizes.sm, padding: 4 },
  searchBtn:            { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  searchBtnDisabled:    { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  searchBtnText:        { color: '#fff', fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  filterBar:            { borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow:            { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  filterChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive:     { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  filterChipText:       { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  filterChipTextActive: { color: Colors.accent },
  centered:             { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  loadingText:          { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  errorText:            { color: Colors.textSecondary, fontSize: Fonts.sizes.md, textAlign: 'center' },
  retryBtn:             { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 10, backgroundColor: Colors.accent },
  retryBtnText:         { color: '#fff', fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  preSearchContent:     { padding: Spacing.lg, gap: Spacing.xl },
  section:              { gap: Spacing.sm },
  sectionHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:         { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1, textTransform: 'uppercase' },
  clearHistory:         { color: Colors.accent, fontSize: Fonts.sizes.xs },
  historyItem:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyIcon:          { fontSize: 14 },
  historyText:          { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  suggestionsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  suggestionChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  suggestionText:       { color: Colors.textSecondary, fontSize: Fonts.sizes.sm },
  resultsList:          { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  resultsCount:         { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: Spacing.md },
  resultCard:           { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardTopRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  pills:                { flexDirection: 'row', gap: 6, flex: 1 },
  pill:                 { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:             { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  oaBadge:              { backgroundColor: 'rgba(79,247,160,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#4FF7A0' },
  oaBadgeText:          { color: '#4FF7A0', fontSize: 9, fontWeight: Fonts.weights.semibold },
  title:                { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, lineHeight: 22, marginBottom: 4 },
  meta:                 { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: 4 },
  citations:            { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  emptyEmoji:           { fontSize: 40 },
  emptyTitle:           { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  emptySubtitle:        { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center' },
})