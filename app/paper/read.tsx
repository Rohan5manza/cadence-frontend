import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Platform, ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Colors, Fonts, Spacing } from '../../constants'
import { feedAPI, papersAPI } from '../../services/api'
import {
  sendFirstReadOfDayNotification,
  sendStreakBrokenNotification,
  sendStreakNotification,
} from '../../services/notifications'
import useStore from '../../store/useStore'
import type { Paper } from '../../types'

type ReadMode = 'text' | 'pdf'

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

export default function PaperReadScreen() {
  const { id }                      = useLocalSearchParams<{ id: string }>()
  const router                      = useRouter()
  const [paper, setPaper]           = useState<Paper | null>(null)
  const [loading, setLoading]       = useState(true)
  const [mode, setMode]             = useState<ReadMode>('text')
  const [fontSize, setFontSize]     = useState(16)
  const [darkMode, setDarkMode]     = useState(true)
  const [pdfLoading, setPdfLoading] = useState(true)

  const { setReadingProgress, recordGenuineRead } = useStore()

  // Refs for timer — avoids stale closure issues
  const paperRef            = useRef<Paper | null>(null)
  const readStartTime       = useRef<number | null>(null)
  const genuineReadLogged   = useRef(false)

  // ── Load paper ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const real = await papersAPI.getById(safeString(id))
        setPaper(real)
      } catch {
        setPaper(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Start timer + save reading progress when paper loads ───────────────────
  useEffect(() => {
    if (!paper) return
    paperRef.current          = paper
    readStartTime.current     = Date.now()
    genuineReadLogged.current = false
    setReadingProgress({
      paperId:    paper.id,
      paperTitle: safeString(paper.title),
      scrollY:    0,
      mode,
      lastReadAt: new Date().toISOString(),
    })
  }, [paper])

  // ── Update reading progress when mode changes ──────────────────────────────
  useEffect(() => {
    if (!paper) return
    setReadingProgress({
      paperId:    paper.id,
      paperTitle: safeString(paper.title),
      scrollY:    0,
      mode,
      lastReadAt: new Date().toISOString(),
    })
  }, [mode])

  // ── Genuine read timer — fires after 60 seconds ────────────────────────────
  useEffect(() => {
    if (!paper) return

    const interval = setInterval(async () => {
      if (genuineReadLogged.current) { clearInterval(interval); return }
      if (!readStartTime.current)    { return }
      if (!paperRef.current)         { return }

      const elapsed = (Date.now() - readStartTime.current) / 1000

      if (elapsed >= 60) {
        genuineReadLogged.current = true
        clearInterval(interval)

        const currentPaper = paperRef.current
        const { isFirstToday, newStreak, streakBroken, oldStreak } = await recordGenuineRead()

        // Log to backend as genuine long read
        feedAPI.logInteraction({
          paper_id:         currentPaper.id,
          type:             'read',
          duration_seconds: Math.round(elapsed),
        }).catch(() => {})

        // Fire notifications
        if (streakBroken)  await sendStreakBrokenNotification(oldStreak)
        if (isFirstToday)  await sendFirstReadOfDayNotification()
        const milestones = [3, 7, 14, 30, 100]
        if (milestones.includes(newStreak)) await sendStreakNotification(newStreak)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [paper])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasPDF = !!(paper?.open_access_url || paper?.arxiv_id)
  const pdfUrl = paper?.open_access_url ||
    (paper?.arxiv_id ? `https://arxiv.org/pdf/${paper.arxiv_id}` : null)

  const bg    = darkMode ? '#0A0A0F' : '#FAFAF8'
  const fg    = darkMode ? '#F0F0FF' : '#1A1A2E'
  const muted = darkMode ? '#8A8AB0' : '#666680'

  // ── Loading / error states ─────────────────────────────────────────────────
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

  const categories = safeArray(paper.categories)
  const authors    = safeArray(paper.authors)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: darkMode ? Colors.border : '#E0E0F0' }]}>
          
          {/* FIX: Use absolute positioning for the back button so it doesn't push
            the center content off-axis. 
          */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.topBarBtn, { color: Colors.accent }]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            {hasPDF && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
                  onPress={() => setMode('text')}
                >
                  <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>
                    Summary
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'pdf' && styles.modeBtnActive]}
                  onPress={() => setMode('pdf')}
                >
                  <Text style={[styles.modeBtnText, mode === 'pdf' && styles.modeBtnTextActive]}>
                    Full
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {mode === 'pdf' && pdfUrl ? (
  <View style={{ flex: 1 }}>
    {pdfLoading && (
      <View style={styles.pdfLoading}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
      </View>
    )}
    <WebView
      source={{ 
        uri: Platform.OS === 'android'
          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
          : pdfUrl
      }}
      style={{ flex: 1, backgroundColor: bg }}
      onLoad={() => setPdfLoading(false)}
      onError={() => setPdfLoading(false)}
      startInLoadingState={false}
      javaScriptEnabled
      domStorageEnabled
      scalesPageToFit={Platform.OS === 'android'}
      allowsInlineMediaPlayback
    />
  </View>
) : (
          /* Text / Summary mode */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.textContent, { backgroundColor: bg }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.paperHeader}>
              {categories.length > 0 && (
                <View style={styles.categories}>
                  {categories.slice(0, 3).map((cat, i) => (
                    <View key={`${cat}-${i}`} style={styles.categoryPill}>
                      <Text style={styles.categoryText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.paperTitle, { color: fg, fontSize: fontSize + 6 }]}>
                {safeString(paper.title)}
              </Text>

              {authors.length > 0 && (
                <Text style={[styles.paperAuthors, { color: muted, fontSize: fontSize - 2 }]}>
                  {authors.join(', ')}
                </Text>
              )}

              <View style={styles.metaRow}>
                {paper.venue ? (
                  <Text style={[styles.metaItem, { color: Colors.accent }]}>{paper.venue}</Text>
                ) : null}
                {paper.year ? (
                  <Text style={[styles.metaItem, { color: muted }]}>{paper.year}</Text>
                ) : null}
                {paper.citation_count ? (
                  <Text style={[styles.metaItem, { color: muted }]}>
                    {Number(paper.citation_count).toLocaleString()} citations
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: darkMode ? Colors.border : '#E0E0F0' }]} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: fg, fontSize: fontSize + 2 }]}>
                Abstract
              </Text>
              <Text style={[styles.sectionBody, {
                color:      darkMode ? '#C0C0E0' : '#2A2A4A',
                fontSize,
                lineHeight: fontSize * 1.7,
              }]}>
                {safeString(paper.abstract)}
              </Text>
            </View>

            {hasPDF ? (
              <View style={styles.pdfPromptBox}>
                <Text style={styles.pdfPromptTitle}>Full paper available</Text>
                <Text style={styles.pdfPromptBody}>
                  Switch to Full mode above to read the complete paper.
                </Text>
              </View>
            ) : null}

            {!hasPDF ? (
              <View style={styles.noFullTextBox}>
                <Text style={styles.noFullTextTitle}>Full text not available</Text>
                <Text style={styles.noFullTextBody}>
                  This paper may be behind a paywall. Only the abstract is shown here.
                </Text>
              </View>
            ) : null}

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textPrimary || '#333', fontSize: 16 },
  
  // -- Top Bar Styles --
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centers the content naturally
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.lg || 16,
    zIndex: 10, // Ensures it stays clickable above the center view
    paddingVertical: 8, // Bigger touch target
  },
  topBarBtn: {
    fontSize: Fonts?.sizes?.md || 16,
    fontWeight: '600',
  },
  topBarCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(120, 120, 150, 0.15)', // Fallback pill background
    borderRadius: 20,
    padding: 4,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  modeBtnActive: {
    backgroundColor: Colors.accent || '#4F8EF7',
  },
  modeBtnText: {
    fontSize: Fonts?.sizes?.sm || 14,
    fontWeight: '600',
    color: '#8A8AB0', 
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },

  // -- PDF & Layout Styles --
  pdfLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pdfLoadingText: { color: '#fff', marginTop: 12, fontSize: 16, fontWeight: '500' },
  textContent: { padding: Spacing.lg || 20 },
  paperHeader: { marginBottom: Spacing.lg || 20 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md || 12 },
  categoryPill: { 
    backgroundColor: 'rgba(79,142,247,0.15)', 
    borderRadius: 16, 
    paddingHorizontal: 10, 
    paddingVertical: 4 
  },
  categoryText: { color: Colors.accent || '#4F8EF7', fontSize: 12, fontWeight: '700' },
  paperTitle: { fontWeight: 'bold', marginBottom: Spacing.sm || 8 },
  paperAuthors: { marginBottom: Spacing.md || 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, width: '100%', marginBottom: Spacing.lg || 20 },
  section: { marginBottom: Spacing.xl || 24 },
  sectionTitle: { fontWeight: 'bold', marginBottom: Spacing.md || 12 },
  sectionBody: {},
  pdfPromptBox: { 
    backgroundColor: 'rgba(79,142,247,0.1)', 
    padding: Spacing.lg || 20, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(79,142,247,0.3)', 
    marginBottom: Spacing.lg || 20 
  },
  pdfPromptTitle: { color: Colors.accent || '#4F8EF7', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  pdfPromptBody: { color: '#8A8AB0', fontSize: 14, lineHeight: 20 },
  noFullTextBox: { 
    backgroundColor: 'rgba(247,79,79,0.1)', 
    padding: Spacing.lg || 20, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(247,79,79,0.3)', 
    marginBottom: Spacing.lg || 20 
  },
  noFullTextTitle: { color: '#F74F4F', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  noFullTextBody: { color: '#8A8AB0', fontSize: 14, lineHeight: 20 },
})