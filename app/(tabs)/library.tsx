import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../../constants'
import { libraryAPI } from '../../services/api'
import useStore from '../../store/useStore'
import type { Paper, Playlist } from '../../types'

function safeString(val: any): string {
  if (!val) return ''
  return String(val)
}

type Tab = 'overview' | 'saved' | 'playlists'

export default function LibraryScreen() {
  const router = useRouter()
  const { savePaper, unsavePaper, loadHistory, loadReadingProgress } = useStore()
  const recentHistoryState  = useStore((s) => s.recentHistory)
  const readingProgressState = useStore((s) => s.readingProgress)

  const [activeTab, setActiveTab]           = useState<Tab>('overview')
  const [papers, setPapers]                 = useState<Paper[]>([])
  const [playlists, setPlaylists]           = useState<Playlist[]>([])
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)

  // New playlist modal
  const [showNewPlaylist, setShowNewPlaylist]   = useState(false)
  const [newPlaylistName, setNewPlaylistName]   = useState('')
  const [creating, setCreating]                = useState(false)

  // Add to playlist modal
  const [paperToAdd, setPaperToAdd]            = useState<Paper | null>(null)
  const [addingTo, setAddingTo]                = useState<string | null>(null)

  // Rename playlist modal
  const [playlistToRename, setPlaylistToRename] = useState<Playlist | null>(null)
  const [renameValue, setRenameValue]           = useState('')
  const [renaming, setRenaming]                = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [saved, lists] = await Promise.all([
        libraryAPI.getSaved(),
        libraryAPI.listPlaylists(),
      ])
      setPapers(saved)
      setPlaylists(lists)
      saved.forEach((p) => savePaper(p.id))
    } catch (e) {
      console.error('Library load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    loadData()
    Promise.all([loadHistory(), loadReadingProgress()])
  }, []))

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleUnsave = (paper: Paper) => {
    Alert.alert('Remove Paper', 'Remove from your library?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await libraryAPI.unsavePaper(paper.id)
        unsavePaper(paper.id)
        setPapers((prev) => prev.filter((p) => p.id !== paper.id))
      }},
    ])
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    setCreating(true)
    try {
      const playlist = await libraryAPI.createPlaylist(newPlaylistName.trim())
      setPlaylists((prev) => [playlist, ...prev])
      setNewPlaylistName('')
      setShowNewPlaylist(false)
    } catch {
      Alert.alert('Error', 'Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!paperToAdd) return
    setAddingTo(String(playlist.id))
    try {
      await libraryAPI.addPaperToPlaylist(playlist.id, paperToAdd.id)
      Alert.alert('Added', `"${paperToAdd.title?.slice(0, 40)}..." added to ${playlist.name}`)
      setPaperToAdd(null)
    } catch {
      Alert.alert('Error', 'Failed to add paper to playlist')
    } finally {
      setAddingTo(null)
    }
  }

  const handleRenamePlaylist = async () => {
    if (!playlistToRename || !renameValue.trim()) return
    setRenaming(true)
    try {
      await libraryAPI.updatePlaylistName(playlistToRename.id, renameValue.trim())
      setPlaylists((prev) =>
        prev.map((p) => p.id === playlistToRename.id ? { ...p, name: renameValue.trim() } : p)
      )
      setPlaylistToRename(null)
      setRenameValue('')
    } catch {
      Alert.alert('Error', 'Failed to rename playlist')
    } finally {
      setRenaming(false)
    }
  }

  const handleDeletePlaylist = (playlist: Playlist) => {
  Alert.alert('Delete Playlist', `Delete "${playlist.name}"? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await libraryAPI.deletePlaylist(playlist.id)
        setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
      } catch {
        Alert.alert('Error', 'Failed to delete playlist')
      }
    }},
  ])
}


  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        {activeTab === 'playlists' && (
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewPlaylist(true)}>
            <Text style={styles.newBtnText}>+ New Playlist</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['overview', 'saved', 'playlists'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview'
                : tab === 'saved' ? `Saved (${papers.length})`
                : `Playlists (${playlists.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>


          {/* Continue reading */}
          {readingProgressState ? (
            <View>
              <Text style={styles.sectionTitle}>Continue Reading</Text>
              <TouchableOpacity
                style={styles.continueCard}
                onPress={() => router.push(`/paper/read?id=${readingProgressState.paperId}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.continueIcon}>📖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueTitle} numberOfLines={2}>
                    {readingProgressState.paperTitle}
                  </Text>
                  <Text style={styles.continueMeta}>
                    {readingProgressState.mode === 'pdf' ? 'Full PDF' : 'Summary'} · {new Date(readingProgressState.lastReadAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Recent history */}
          {recentHistoryState.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Recent History</Text>
              {recentHistoryState.slice(0, 10).map((paper) => (
                <TouchableOpacity
                  key={paper.id}
                  style={styles.historyRow}
                  onPress={() => router.push(`/paper/${paper.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.historyDot}>◈</Text>
                  <Text style={styles.historyTitle} numberOfLines={1}>{safeString(paper.title)}</Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyNote}>Papers you open will appear here</Text>
          )}
        </ScrollView>
      )}

      {/* ── Saved ── */}
      {activeTab === 'saved' && (
        papers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>♡</Text>
            <Text style={styles.emptyTitle}>No saved papers yet</Text>
            <Text style={styles.emptySub}>Save papers from any screen to see them here</Text>
          </View>
        ) : (
          <FlatList
            data={papers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} tintColor={Colors.accent} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.paperCard}
                onPress={() => router.push(`/paper/${item.id}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.paperTitle} numberOfLines={2}>{safeString(item.title)}</Text>
                <Text style={styles.paperMeta}>
                  {item.year ? `${item.year}` : ''}
                  {item.venue ? ` · ${item.venue}` : ''}
                </Text>
                <View style={styles.cardRow}>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      if (playlists.length === 0) {
                        Alert.alert('No Playlists', 'Create a playlist first in the Playlists tab.')
                        return
                      }
                      setPaperToAdd(item)
                    }}
                  >
                    <Text style={styles.addBtnText}>+ Playlist</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.unsaveBtn} onPress={() => handleUnsave(item)}>
                    <Text style={styles.unsaveBtnText}>🔖 Saved</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* ── Playlists ── */}
      {activeTab === 'playlists' && (
        playlists.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>◈</Text>
            <Text style={styles.emptyTitle}>No playlists yet</Text>
            <Text style={styles.emptySub}>Tap + New Playlist to create a reading list</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewPlaylist(true)}>
              <Text style={styles.createBtnText}>+ Create Playlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} tintColor={Colors.accent} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playlistCard}
                onPress={() => router.push(`/playlist/${item.id}` as any)}
                onLongPress={() => {
                  Alert.alert(item.name, 'What would you like to do?', [
                    { text: 'Rename', onPress: () => { setPlaylistToRename(item); setRenameValue(item.name) } },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlaylist(item) },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }}
                activeOpacity={0.8}
              >
                <View style={styles.playlistIcon}>
                  <Text style={{ color: Colors.accent, fontSize: 20 }}>◈</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playlistName}>{safeString(item.name)}</Text>
                  <Text style={styles.playlistMeta}>Long press to rename or delete</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* ── Modal: New Playlist ── */}
      <Modal visible={showNewPlaylist} transparent animationType="slide" onRequestClose={() => setShowNewPlaylist(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name..."
              placeholderTextColor={Colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreatePlaylist}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowNewPlaylist(false); setNewPlaylistName('') }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !newPlaylistName.trim() && { opacity: 0.4 }]}
                onPress={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Create</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Rename Playlist ── */}
      <Modal visible={!!playlistToRename} transparent animationType="slide" onRequestClose={() => setPlaylistToRename(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New name..."
              placeholderTextColor={Colors.textMuted}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRenamePlaylist}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setPlaylistToRename(null); setRenameValue('') }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !renameValue.trim() && { opacity: 0.4 }]}
                onPress={handleRenamePlaylist}
                disabled={!renameValue.trim() || renaming}
              >
                {renaming
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalConfirmText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Add to Playlist ── */}
      <Modal visible={!!paperToAdd} transparent animationType="slide" onRequestClose={() => setPaperToAdd(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            <Text style={styles.modalSub} numberOfLines={2}>{safeString(paperToAdd?.title)}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {playlists.map((pl) => (
                <TouchableOpacity
                  key={String(pl.id)}
                  style={styles.playlistPickRow}
                  onPress={() => handleAddToPlaylist(pl)}
                  disabled={addingTo === String(pl.id)}
                >
                  <Text style={{ color: Colors.accent, fontSize: 18, marginRight: Spacing.sm }}>◈</Text>
                  <Text style={styles.playlistPickName}>{safeString(pl.name)}</Text>
                  {addingTo === String(pl.id)
                    ? <ActivityIndicator size="small" color={Colors.accent} />
                    : <Text style={styles.arrow}>+</Text>
                  }
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCancel, { marginTop: Spacing.sm }]} onPress={() => setPaperToAdd(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle:    { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold },
  newBtn:         { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnText:     { color: '#fff', fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  tabRow:         { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, gap: 8 },
  tab:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive:      { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText:        { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  tabTextActive:  { color: '#fff', fontWeight: Fonts.weights.semibold },
  sectionTitle:   { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  challengeCard:  { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  challengeTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  challengeTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, marginBottom: 2 },
  challengeSub:   { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  streakBadge:    { alignItems: 'center', backgroundColor: 'rgba(255,100,0,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,100,0,0.3)' },
  streakCount:    { color: '#FF6400', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  progressTrack:  { height: 6, backgroundColor: Colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },
  continueCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  continueIcon:   { fontSize: 24 },
  continueTitle:  { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, marginBottom: 2 },
  continueMeta:   { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  historyRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  historyDot:     { color: Colors.accent },
  historyTitle:   { flex: 1, color: Colors.textSecondary, fontSize: Fonts.sizes.sm },
  arrow:          { color: Colors.textMuted, fontSize: Fonts.sizes.lg },
  emptyNote:      { color: Colors.textMuted, fontSize: Fonts.sizes.sm, fontStyle: 'italic' },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
  emptyEmoji:     { fontSize: 48, color: Colors.textMuted },
  emptyTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  emptySub:       { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center' },
  createBtn:      { marginTop: Spacing.md, backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  createBtnText:  { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  paperCard:      { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  paperTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, marginBottom: 4 },
  paperMeta:      { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginBottom: Spacing.sm },
  cardRow:        { flexDirection: 'row', gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  addBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.accent, backgroundColor: 'rgba(79,142,247,0.1)' },
  addBtnText:     { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  unsaveBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.save, backgroundColor: Colors.save },
  unsaveBtnText:  { color: '#fff', fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  playlistCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  playlistIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accentDim, justifyContent: 'center', alignItems: 'center' },
  playlistName:   { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, marginBottom: 2 },
  playlistMeta:   { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.xl, gap: Spacing.md },
  modalTitle:     { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  modalSub:       { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  modalInput:     { backgroundColor: Colors.surfaceHigh, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: Fonts.sizes.md },
  modalActions:   { flexDirection: 'row', gap: Spacing.sm },
  modalCancel:    { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  modalCancelText:{ color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  modalConfirm:   { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.accent },
  modalConfirmText:{ color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  playlistPickRow:{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  playlistPickName:{ flex: 1, color: Colors.textPrimary, fontSize: Fonts.sizes.md },
})

