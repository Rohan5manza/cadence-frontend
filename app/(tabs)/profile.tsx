import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../../constants'
import { DETAILED_TOPICS, DIFFICULTY_OPTIONS } from '../../constants/index'
import { clearToken, userAPI } from '../../services/api'
import type { UserPreferences } from '../../store/useStore'
import useStore from '../../store/useStore'


export default function ProfileScreen() {
  const router = useRouter()

  const { preferences, setPreferences, savedPaperIds, logout } = useStore()
  const streak     = useStore((s) => s.streak)
  const loadStreak = useStore((s) => s.loadStreak)

  const [editingTopics, setEditingTopics]     = useState(false)
  const [localTopics, setLocalTopics]         = useState<string[]>(preferences.topics)
  const [localDifficulty, setLocalDifficulty] = useState(preferences.difficultyLevel)
  const [saving, setSaving]                   = useState(false)

  useEffect(() => {  SecureStore.getItemAsync('cadence_token').then((token) => {
    console.log('TOKEN:', token)
  })
 ,loadStreak() }, [])

  const toggleTopic = (id: string) => {
    setLocalTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    const updated: UserPreferences = {
      ...preferences,
      topics:          localTopics,
      difficultyLevel: localDifficulty,
      onboardingDone:  true,
    }

    try {
      // 1. Sync with your backend so the feed algorithm adjusts
      await userAPI.updatePreferences({
        topics: updated.topics,
        difficulty: updated.difficultyLevel
      })

      // 2. Update local Zustand store
      await setPreferences(updated)
      
      setEditingTopics(false)
      Alert.alert('Saved', 'Your preferences have been updated. Your feed will refresh with new recommendations.')
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences to the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          clearToken()
          router.replace('/auth' as any)
        },
      },
    ])
  }

  const handleResetOnboarding = () => {
    Alert.alert('Reset Preferences', 'This will clear your topic and difficulty preferences. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await setPreferences({ topics: [], difficultyLevel: 'any', onboardingDone: false })
          router.replace('/onboarding' as any)
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>◈</Text>
          </View>
          <Text style={styles.username}>Your Account</Text>
          <Text style={styles.savedCount}>
            <Text style={styles.savedNum}>{savedPaperIds.size}</Text>
            <Text style={styles.savedLabel}> saved papers</Text>
          </Text>
        </View>

        {/* ── Streak Section ── */}
        <View style={styles.streakSection}>
          <View style={styles.streakRing}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
            <Text style={styles.streakRingLabel}>day streak</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{streak.totalPapers}</Text>
              <Text style={styles.statLabel}>Papers Read</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{streak.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{streak.todayCount}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>

          <Text style={styles.streakStatus}>
            {streak.currentStreak === 0
              ? 'Read a paper for 60+ seconds to start your streak'
              : streak.todayCount > 0
              ? `✅ You've read ${streak.todayCount} paper${streak.todayCount > 1 ? 's' : ''} today`
              : `⚠️ Read today to keep your ${streak.currentStreak}-day streak alive`}
          </Text>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Preferences</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Topics</Text>
              <TouchableOpacity onPress={() => {
                if (editingTopics) {
                  // Revert if cancelling
                  setLocalTopics(preferences.topics)
                  setLocalDifficulty(preferences.difficultyLevel)
                }
                setEditingTopics(!editingTopics)
              }}>
                <Text style={styles.editBtn}>{editingTopics ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {!editingTopics ? (
              preferences.topics.length === 0 ? (
                <Text style={styles.emptyText}>No topics selected — tap Edit to add some</Text>
              ) : (
                <View style={styles.pillRow}>
                  {preferences.topics.map((tid) => {
                    const topic = DETAILED_TOPICS.find((t) => t.id === tid)
                    return topic ? (
                      <View key={tid} style={styles.pill}>
                        <Text style={styles.pillText}>{topic.emoji} {topic.label}</Text>
                      </View>
                    ) : null
                  })}
                </View>
              )
            ) : (
              <View style={styles.topicsEditor}>
                {DETAILED_TOPICS.map((topic) => {
                  const selected = localTopics.includes(topic.id)
                  return (
                    <TouchableOpacity
                      key={topic.id}
                      style={[styles.topicRow, selected && styles.topicRowSelected]}
                      onPress={() => toggleTopic(topic.id)}
                    >
                      <Text style={styles.topicRowEmoji}>{topic.emoji}</Text>
                      <View style={styles.topicRowTextContainer}>
                        <View style={styles.topicRowHeader}>
                          <Text style={[styles.topicRowLabel, selected && styles.textSelected]}>
                            {topic.label}
                          </Text>
                          <View style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{topic.abbrev}</Text>
                          </View>
                        </View>
                        <Text style={[styles.topicRowDesc, selected && styles.textSelectedDim]}>
                          {topic.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reading Level</Text>
            
            {editingTopics ? (
              <View style={{ marginTop: Spacing.sm }}>
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const selected = localDifficulty === opt.id
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.topicRow, selected && styles.topicRowSelected]}
                      onPress={() => setLocalDifficulty(opt.id as any)}
                    >
                      <Text style={styles.topicRowEmoji}>{opt.emoji}</Text>
                      <View style={styles.topicRowTextContainer}>
                        <Text style={[styles.topicRowLabel, selected && styles.textSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.topicRowDesc, selected && styles.textSelectedDim]}>
                          {opt.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <View style={styles.difficultyRow}>
                {DIFFICULTY_OPTIONS.filter(opt => opt.id === preferences.difficultyLevel).map((opt) => (
                  <View key={opt.id} style={[styles.difficultyChip, styles.difficultyChipSelected]}>
                    <Text style={styles.difficultyEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.difficultyLabel, styles.difficultyLabelSelected]}>
                      {opt.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {!editingTopics && (
              <Text style={styles.hintText}>Tap Edit on Topics above to change reading level</Text>
            )}
          </View>

          {editingTopics && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePreferences} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Preferences</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* ── Account Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
            <Text style={styles.menuItemText}>🔄  Redo Onboarding</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>↩  Sign Out</Text>
            <Text style={[styles.menuItemChevron, styles.menuItemTextDanger]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // ── Existing Styles (Untouched) ──
  container:               { flex: 1, backgroundColor: Colors.background },
  header:                  { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar:                  { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  avatarText:              { fontSize: 36, color: Colors.accent },
  username:                { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, marginBottom: 4 },
  savedCount:              { fontSize: Fonts.sizes.sm },
  savedNum:                { color: Colors.accent, fontWeight: Fonts.weights.bold },
  savedLabel:              { color: Colors.textMuted },
  streakSection:           { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  streakRing:              { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FF6400', backgroundColor: 'rgba(255,100,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  streakEmoji:             { fontSize: 28 },
  streakNumber:            { color: '#FF6400', fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold },
  streakRingLabel:         { color: '#FF6400', fontSize: Fonts.sizes.xs },
  statsRow:                { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, width: '100%' },
  statBox:                 { alignItems: 'center', flex: 1 },
  statNumber:              { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  statLabel:               { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginTop: 2 },
  statDivider:             { width: 1, height: 30, backgroundColor: Colors.border },
  streakStatus:            { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center' },
  section:                 { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle:            { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  card:                    { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardHeader:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle:               { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  editBtn:                 { color: Colors.accent, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  emptyText:               { color: Colors.textMuted, fontSize: Fonts.sizes.sm, fontStyle: 'italic' },
  pillRow:                 { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:                    { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText:                { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  difficultyRow:           { flexDirection: 'row', gap: 8, marginTop: Spacing.sm, flexWrap: 'wrap' },
  difficultyChip:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border },
  difficultyChipSelected:  { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  difficultyEmoji:         { fontSize: 14 },
  difficultyLabel:         { color: Colors.textSecondary, fontSize: Fonts.sizes.xs },
  difficultyLabelSelected: { color: Colors.accent },
  hintText:                { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontStyle: 'italic', marginTop: Spacing.sm },
  saveBtn:                 { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText:             { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  menuItem:                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  menuItemDanger:          { borderColor: 'rgba(247,79,79,0.3)', backgroundColor: 'rgba(247,79,79,0.05)' },
  menuItemText:            { color: Colors.textPrimary, fontSize: Fonts.sizes.md },
  menuItemTextDanger:      { color: Colors.skip },
  menuItemChevron:         { color: Colors.textMuted, fontSize: Fonts.sizes.lg },

  // ── New Styles Added for the Edit UI ──
  topicsEditor:            { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  topicRow:                { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  topicRowSelected:        { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  topicRowEmoji:           { fontSize: 24, marginRight: Spacing.md },
  topicRowTextContainer:   { flex: 1 },
  topicRowHeader:          { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 8 },
  topicRowLabel:           { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  tagBadge:                { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagBadgeText:            { fontSize: 10, color: Colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' },
  topicRowDesc:            { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 18 },
  textSelected:            { color: Colors.accent },
  textSelectedDim:         { color: Colors.accent, opacity: 0.8 },
})