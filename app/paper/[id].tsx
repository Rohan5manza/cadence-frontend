import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Colors, Fonts, Spacing } from '../../constants'
import { feedAPI, libraryAPI, papersAPI } from '../../services/api'
import {
  sendFirstReadOfDayNotification,
  sendStreakBrokenNotification,
  sendStreakNotification,
} from '../../services/notifications'
import useStore from '../../store/useStore'
import type { Paper } from '../../types'

function safeArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  if (typeof val === 'string') return val.split(/[\s,]+/).filter(Boolean)
  return []
}

function safeString(val: any): string {
  if (!val) return ''
  return String(val)
}

export default function PaperDetailScreen() {
  const { id }                        = useLocalSearchParams<{ id: string }>()
  const router                        = useRouter()
  const [paper, setPaper]             = useState<Paper | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showWebView, setShowWebView] = useState(false)
  const [webViewUrl, setWebViewUrl]   = useState('')
  const [freePdfUrl, setFreePdfUrl]   = useState<string | null>(null)
  const [checkingPdf, setCheckingPdf] = useState(false)
  const [authorPapers, setAuthorPapers]   = useState<Paper[]>([])
const [authorLoading, setAuthorLoading] = useState(false)

  const { savePaper, unsavePaper, isSaved, setReadingProgress, addToHistory, recordGenuineRead } = useStore()

  const webViewOpenTime   = useRef<number | null>(null)
  const webViewReadLogged = useRef(false)

  const hasPDF = !!(paper?.open_access_url || paper?.arxiv_id)


  // ── Load paper ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const real = await papersAPI.getById(safeString(id))
        setPaper(real)
        addToHistory(real)
      } catch {
        setPaper(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Check Unpaywall ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!paper || hasPDF) return
    const check = async () => {
      setCheckingPdf(true)
      try {
        const result = await papersAPI.getFreePdf(paper.id)
        if (result?.url) setFreePdfUrl(result.url)
      } catch {}
      finally { setCheckingPdf(false) }
    }
    check()
  }, [paper, hasPDF])

  useEffect(() => {
  if (!paper) return
  setAuthorLoading(true)
  papersAPI.byAuthor(paper.id, 8)
    .then(setAuthorPapers)
    .catch(() => setAuthorPapers([]))
    .finally(() => setAuthorLoading(false))
}, [paper])
  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveToggle = () => {
    if (!paper) return
    if (isSaved(paper.id)) {
      unsavePaper(paper.id)
      libraryAPI.unsavePaper(paper.id).catch(() => {})
    } else {
      savePaper(paper.id)
      libraryAPI.savePaper(paper.id).catch(() => {})
    }
  }

  const handleShare = async () => {
    if (!paper) return
    const url = paper.arxiv_id
      ? `https://arxiv.org/abs/${paper.arxiv_id}`
      : `https://semanticscholar.org/paper/${paper.id}`
    await Share.share({ title: safeString(paper.title), message: `${paper.title}\n\n${url}`, url })
  }

  const openWebView = (url: string, mode: 'text' | 'pdf') => {
    if (!paper) return
    webViewOpenTime.current   = Date.now()
    webViewReadLogged.current = false
    setReadingProgress({
      paperId:    paper.id,
      paperTitle: safeString(paper.title),
      scrollY:    0,
      mode,
      lastReadAt: new Date().toISOString(),
    })
    setWebViewUrl(url)
    setShowWebView(true)
  }

  const handleViewExternal = () => {
    if (!paper) return
    const url = paper.doi
      ? `https://doi.org/${paper.doi}`
      : paper.arxiv_id
      ? `https://arxiv.org/abs/${paper.arxiv_id}`
      : `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${safeString(paper.title)}"`)}`
    openWebView(url, 'text')
  }

  const handleCloseWebView = async () => {
    setShowWebView(false)
    if (
      paper &&
      webViewOpenTime.current &&
      !webViewReadLogged.current &&
      (Date.now() - webViewOpenTime.current) / 1000 >= 60
    ) {
      webViewReadLogged.current = true
      const elapsed = Math.round((Date.now() - webViewOpenTime.current) / 1000)
      const { isFirstToday, newStreak, streakBroken, oldStreak } = await recordGenuineRead()
      feedAPI.logInteraction({ paper_id: paper.id, type: 'read', duration_seconds: elapsed }).catch(() => {})
      if (streakBroken) sendStreakBrokenNotification(oldStreak)
      if (isFirstToday) sendFirstReadOfDayNotification()
      const milestones = [3, 7, 14, 30, 100]
      if (milestones.includes(newStreak)) sendStreakNotification(newStreak)
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  if (!paper) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Paper not found</Text>
      </View>
    )
  }

  const saved      = isSaved(paper.id)
  const categories = safeArray(paper.categories)
  const authors    = safeArray(paper.authors)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.length > 0 ? (
          <View style={styles.categories}>
            {categories.slice(0, 3).map((cat, i) => (
              <View key={`${cat}-${i}`} style={styles.categoryPill}>
                <Text style={styles.categoryText}>{cat}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.title}>{safeString(paper.title)}</Text>

        {authors.length > 0 ? (
          <Text style={styles.authors}>{authors.join(', ')}</Text>
        ) : null}

        <View style={styles.metaRow}>
          {paper.venue ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{paper.venue}</Text>
            </View>
          ) : null}
          {paper.year ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{paper.year}</Text>
            </View>
          ) : null}
          {paper.citation_count ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {Number(paper.citation_count).toLocaleString()} citations
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, saved ? styles.savedBtn : styles.saveBtn]}
            onPress={handleSaveToggle}
          >
            <Text style={styles.actionBtnText}>{saved ? '🔖 Saved' : '🔖 Save'}</Text>
          </TouchableOpacity>

          {hasPDF ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.readBtn]}
              onPress={() => router.push(`/paper/read?id=${paper.id}`)}
            >
              <Text style={styles.actionBtnText}>📖 Read</Text>
            </TouchableOpacity>
          ) : null}

          {freePdfUrl ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.openAccessBtn]}
              onPress={() => openWebView(freePdfUrl, 'pdf')}
            >
              <Text style={styles.actionBtnText}>🔓 Free PDF</Text>
            </TouchableOpacity>
          ) : null}

          {checkingPdf ? (
            <View style={[styles.actionBtn, styles.externalBtn]}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          ) : null}

          {!hasPDF && !freePdfUrl && !checkingPdf ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.externalBtn]}
              onPress={handleViewExternal}
            >
              <Text style={styles.actionBtnText}>🔗 Find Paper</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn]}
            onPress={handleShare}
          >
            <Text style={styles.actionBtnText}>↗ Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.similarBtn]}
            onPress={() => router.push(`/paper/similar?id=${paper.id}` as any)}
          >
            <Text style={styles.actionBtnText}>◈ Similar</Text>
          </TouchableOpacity>
        </View>

        {!hasPDF && !freePdfUrl && !checkingPdf ? (
          <Text style={styles.findPaperNote}>
            Access not guaranteed — this paper may be behind a paywall.
          </Text>
        ) : null}

                <View style={styles.divider} />
        <Text style={styles.abstract}>{safeString(paper.abstract)}</Text>

        {/* Also by Author */}
        {(authorLoading || authorPapers.length > 0) && (
          <View style={{ marginTop: Spacing.xl }}>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>
              Also by {authors[0]?.split(' ').pop() || 'Author'}
            </Text>
            {authorLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <FlatList
                horizontal
                data={authorPapers}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.md, paddingVertical: Spacing.sm }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.authorCard}
                    onPress={() => router.push(`/paper/${item.id}`)}
                    activeOpacity={0.8}
                  >
                    {item.year && <Text style={styles.authorCardYear}>{item.year}</Text>}
                    <Text style={styles.authorCardTitle} numberOfLines={3}>{item.title}</Text>
                    {item.citation_count ? (
                      <Text style={styles.authorCardCitations}>
                        {Number(item.citation_count).toLocaleString()} citations
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        <View style={styles.divider} />
        <Text style={styles.sourceText}>
          {`Source: ${safeString(paper.source).toUpperCase()}${paper.arxiv_id ? ` · arXiv:${paper.arxiv_id}` : ''}`}
        </Text>
      </ScrollView>

      {showWebView ? (
        <View style={StyleSheet.absoluteFill}>
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={handleCloseWebView}>
                <Text style={styles.webViewClose}>✕ Close</Text>
              </TouchableOpacity>
            </View>
            <WebView
              source={{ uri: webViewUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={Colors.accent} />
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText:     { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton:    { padding: 4 },
  backText:      { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  categories:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  categoryPill:  { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText:  { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  title:         { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, lineHeight: 34, marginBottom: Spacing.md },
  authors:       { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 20, marginBottom: Spacing.md },
  metaRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  metaBadge:     { backgroundColor: Colors.surfaceHigh, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  metaBadgeText: { color: Colors.textSecondary, fontSize: Fonts.sizes.xs },
  actionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm },
  actionBtn:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  saveBtn:       { borderColor: Colors.save, backgroundColor: 'rgba(79, 142, 247, 0.1)' },
  savedBtn:      { borderColor: Colors.save, backgroundColor: Colors.save },
  readBtn:       { borderColor: Colors.accent, backgroundColor: Colors.accent },
  openAccessBtn: { borderColor: '#4FF7A0', backgroundColor: 'rgba(79, 247, 160, 0.15)' },
  externalBtn:   { borderColor: Colors.border, backgroundColor: Colors.surfaceHigh },
  shareBtn:      { borderColor: Colors.border, backgroundColor: Colors.surfaceHigh },
  similarBtn:    { borderColor: Colors.accentDim, backgroundColor: Colors.accentDim, alignSelf: 'flex-start' },
  actionBtnText: { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  findPaperNote: { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontStyle: 'italic', marginBottom: Spacing.md },
  divider:       { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  sectionLabel:  { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  abstract:      { color: Colors.textSecondary, fontSize: Fonts.sizes.md, lineHeight: 26 },
  sourceText:    { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  webViewHeader: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  webViewClose:  { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  authorCard:         { width: 160, backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
authorCardYear:     { color: Colors.accent, fontSize: 10, fontWeight: Fonts.weights.bold, marginBottom: 4 },
authorCardTitle:    { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, lineHeight: 18, marginBottom: Spacing.xs },
authorCardCitations:{ color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginTop: 4 },
})