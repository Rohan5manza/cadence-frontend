import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../../constants'
import { libraryAPI } from '../../services/api'
import type { Paper, Playlist } from '../../types'



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

export default function PlaylistDetailScreen() {
  const { id }                    = useLocalSearchParams<{ id: string }>()
  const router                    = useRouter()
  const [playlist, setPlaylist]   = useState<Playlist | null>(null)
  const [papers, setPapers]       = useState<Paper[]>([])
  const [loading, setLoading]     = useState(true)
  const [removing, setRemoving]   = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [pl, pps] = await Promise.all([
          libraryAPI.getPlaylist(String(id)),
          libraryAPI.getPlaylistPapers(String(id)),
        ])
        setPlaylist(pl)
        setPapers(pps)
      } catch {
        setPlaylist(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleRemovePaper = (paper: Paper) => {
    Alert.alert('Remove Paper', `Remove "${safeString(paper.title).slice(0, 50)}..." from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setRemoving(paper.id)
        try {
          await libraryAPI.removeFromPlaylist(String(id), paper.id)
          setPapers((prev) => prev.filter((p) => p.id !== paper.id))
        } catch {
          Alert.alert('Error', 'Failed to remove paper')
        } finally {
          setRemoving(null)
        }
      }},
    ])
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  if (!playlist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Playlist not found</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={papers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.playlistHeader}>
            <View style={styles.playlistIcon}>
              <Text style={{ color: Colors.accent, fontSize: 36 }}>◈</Text>
            </View>
            <Text style={styles.playlistName}>{safeString(playlist.name)}</Text>
            <Text style={styles.playlistMeta}>{papers.length} papers</Text>
            {papers.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No papers yet</Text>
                <Text style={styles.emptySub}>
                  Go to a paper and tap "+ Playlist" to add it here
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const categories = safeArray(item.categories)
          const authors    = safeArray(item.authors)
          return (
            <TouchableOpacity
              style={styles.paperCard}
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
              <Text style={styles.paperTitle} numberOfLines={2}>{safeString(item.title)}</Text>
              <Text style={styles.paperMeta} numberOfLines={1}>
                {authors.slice(0, 2).join(', ')}
                {authors.length > 2 ? ' et al.' : ''}
                {item.year ? ` · ${item.year}` : ''}
              </Text>
              <View style={styles.cardRow}>
                <TouchableOpacity
                  style={styles.readBtn}
                  onPress={() => router.push(`/paper/read?id=${item.id}`)}
                >
                  <Text style={styles.readBtnText}>📖 Read</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemovePaper(item)}
                  disabled={removing === item.id}
                >
                  {removing === item.id
                    ? <ActivityIndicator size="small" color={Colors.skip} />
                    : <Text style={styles.removeBtnText}>Remove</Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText:      { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  header:         { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:        { color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  list:           { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  playlistHeader: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  playlistIcon:   { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  playlistName:   { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, textAlign: 'center', marginBottom: 4 },
  playlistMeta:   { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  emptyBox:       { marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText:      { color: Colors.textSecondary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  emptySub:       { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
  paperCard:      { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  pills:          { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  pill:           { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:       { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
  paperTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, lineHeight: 22, marginBottom: 4 },
  paperMeta:      { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: Spacing.sm },
  cardRow:        { flexDirection: 'row', gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  readBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.accent, backgroundColor: 'rgba(79,142,247,0.1)' },
  readBtnText:    { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  removeBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.skip, backgroundColor: 'rgba(247,79,79,0.1)' },
  removeBtnText:  { color: Colors.skip, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
})