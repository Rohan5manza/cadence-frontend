import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Colors, DETAILED_TOPICS, DIFFICULTY_OPTIONS,
  EXPERIENCE_LEVELS, Fonts, READING_GOALS, ROLES, Spacing, WEEKLY_GOALS,
} from '../../constants'
import { clearToken, libraryAPI, userAPI } from '../../services/api'
import type { UserPreferences } from '../../store/useStore'
import useStore from '../../store/useStore'

type EditSection = 'name' | 'role' | 'primary_field' | 'topics' | 'experience' | 'reading_goal' | 'weekly_goal' | 'difficulty' | null

export default function ProfileScreen() {
  const router = useRouter()
  const { preferences, setPreferences, savedPaperIds, logout, savePaper } = useStore()
  const streak     = useStore((s) => s.streak)
  const loadStreak = useStore((s) => s.loadStreak)

  const [saving, setSaving]               = useState(false)
  const [editSection, setEditSection]     = useState<EditSection>(null)
  const [syncing, setSyncing]             = useState(false)

  // Local edit state
  const [localName, setLocalName]         = useState(preferences.displayName || '')
  const [localRole, setLocalRole]     = useState<string>(preferences.role || 'curious')
const [localExp, setLocalExp]       = useState<string>(preferences.experienceLevel || 'intermediate')
const [localGoal, setLocalGoal]     = useState<string>(preferences.readingGoal || 'broad')
const [localDifficulty, setLocalDiff] = useState<string>(preferences.difficultyLevel || 'any')

  const [localPrimary, setLocalPrimary]   = useState(preferences.primaryField || '')
  const [localTopics, setLocalTopics]     = useState<string[]>(preferences.topics || [])
  
  const [localWeekly, setLocalWeekly]     = useState(preferences.weeklyGoal || 5)
  

  useEffect(() => { loadStreak() }, [])

  useEffect(() => {
    libraryAPI.getSaved()
      .then(papers => papers.forEach(p => savePaper(p.id)))
      .catch(() => {})
  }, [])

  const openEdit = (section: EditSection) => {
    // Reset local state to current preferences
    setLocalName(preferences.displayName || '')
    setLocalRole(preferences.role || 'curious')
    setLocalPrimary(preferences.primaryField || '')
    setLocalTopics([...(preferences.topics || [])])
    setLocalExp(preferences.experienceLevel || 'intermediate')
    setLocalGoal(preferences.readingGoal || 'broad')
    setLocalWeekly(preferences.weeklyGoal || 5)
    setLocalDiff(preferences.difficultyLevel || 'any')
    setEditSection(section)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const updated: UserPreferences = {
        ...preferences,
        displayName:     localName,
        role:            localRole as any,
        primaryField:    localPrimary,
        topics:          localTopics,
        experienceLevel: localExp as any,
        readingGoal:     localGoal as any,
        weeklyGoal:      localWeekly,
        difficultyLevel: localDifficulty as any,
        onboardingDone:  true,
      }
      await userAPI.updateProfile({
        topics:           localTopics,
        difficulty:       localDifficulty,
        display_name:     localName,
        role:             localRole,
        institution:      preferences.institution || '',
        primary_field:    localPrimary,
        reading_goal:     localGoal,
        experience_level: localExp,
        weekly_goal:      localWeekly,
      })
      await setPreferences(updated)
      setEditSection(null)
      Alert.alert('✓ Saved', 'Your profile has been updated. Pull to refresh on Home to see new recommendations.')
    } catch {
      Alert.alert('Error', 'Failed to save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout()
        clearToken()
        router.replace('/auth' as any)
      }},
    ])
  }

  const handleResetOnboarding = () => {
    Alert.alert('Redo Onboarding', 'This will restart the setup flow.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redo', style: 'destructive', onPress: async () => {
        await setPreferences({ ...preferences, onboardingDone: false })
        router.replace('/onboarding' as any)
      }},
    ])
  }

  const roleObj   = ROLES.find(r => r.id === preferences.role)
  const goalObj   = READING_GOALS.find(g => g.id === preferences.readingGoal)
  const expObj    = EXPERIENCE_LEVELS.find(e => e.id === preferences.experienceLevel)
  const diffObj   = DIFFICULTY_OPTIONS.find(d => d.id === preferences.difficultyLevel)
  const primaryObj = DETAILED_TOPICS.find(t => t.id === preferences.primaryField)
  const weeklyObj = WEEKLY_GOALS.find(w => w.id === preferences.weeklyGoal)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {preferences.displayName ? preferences.displayName[0].toUpperCase() : '◈'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openEdit('name')}>
            <Text style={styles.username}>
              {preferences.displayName || 'Your Account'}
              <Text style={styles.editHint}> ✎</Text>
            </Text>
          </TouchableOpacity>
          {roleObj && (
            <Text style={styles.roleLabel}>{roleObj.emoji} {roleObj.label}</Text>
          )}
          <Text style={styles.savedCount}>
            <Text style={styles.savedNum}>{savedPaperIds.size}</Text>
            <Text style={styles.savedLabel}> saved papers</Text>
          </Text>
        </View>

        {/* ── Streak ── */}
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
              ? `✅ ${streak.todayCount} paper${streak.todayCount > 1 ? 's' : ''} read today`
              : `⚠️ Read today to keep your ${streak.currentStreak}-day streak`}
          </Text>
        </View>

        {/* ── Research Profile ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research Profile</Text>

          <ProfileRow
            label="Primary Field"
            value={primaryObj ? `${primaryObj.emoji} ${primaryObj.label}` : 'Not set'}
            onEdit={() => openEdit('primary_field')}
          />
          <ProfileRow
            label="Role"
            value={roleObj ? `${roleObj.emoji} ${roleObj.label}` : 'Not set'}
            onEdit={() => openEdit('role')}
          />
          <ProfileRow
            label="Reading Goal"
            value={goalObj ? `${goalObj.emoji} ${goalObj.label}` : 'Not set'}
            onEdit={() => openEdit('reading_goal')}
          />
          <ProfileRow
            label="Experience Level"
            value={expObj ? `${expObj.emoji} ${expObj.label}` : 'Not set'}
            onEdit={() => openEdit('experience')}
          />
          <ProfileRow
            label="Reading Difficulty"
            value={diffObj ? `${diffObj.emoji} ${diffObj.label}` : 'Any'}
            onEdit={() => openEdit('difficulty')}
          />
          <ProfileRow
            label="Weekly Goal"
            value={weeklyObj ? `${weeklyObj.emoji} ${weeklyObj.label}` : `${preferences.weeklyGoal} papers`}
            onEdit={() => openEdit('weekly_goal')}
          />
        </View>

        {/* ── Topics ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Topics</Text>
            <TouchableOpacity onPress={() => openEdit('topics')}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pillsWrap}>
            {primaryObj && (
              <View style={[styles.pill, styles.pillPrimary]}>
                <Text style={styles.pillTextPrimary}>{primaryObj.emoji} {primaryObj.label} ★</Text>
              </View>
            )}
            {(preferences.topics || []).map(tid => {
              const t = DETAILED_TOPICS.find(x => x.id === tid)
              return t ? (
                <View key={tid} style={styles.pill}>
                  <Text style={styles.pillText}>{t.emoji} {t.label}</Text>
                </View>
              ) : null
            })}
            {(!preferences.topics?.length && !primaryObj) && (
              <Text style={styles.emptyHint}>No topics selected — tap Edit to add some</Text>
            )}
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
            <Text style={styles.menuItemText}>🔄  Redo Onboarding</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
            <Text style={[styles.menuItemText, { color: Colors.skip }]}>↩  Sign Out</Text>
            <Text style={[styles.menuChevron, { color: Colors.skip }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Edit Modals ── */}
      <EditModal
        visible={editSection !== null}
        onClose={() => setEditSection(null)}
        onSave={saveEdit}
        saving={saving}
        title={
          editSection === 'name'         ? 'Edit Name' :
          editSection === 'role'         ? 'Your Role' :
          editSection === 'primary_field'? 'Primary Field' :
          editSection === 'topics'       ? 'Topics' :
          editSection === 'experience'   ? 'Experience Level' :
          editSection === 'reading_goal' ? 'Reading Goal' :
          editSection === 'weekly_goal'  ? 'Weekly Goal' :
          editSection === 'difficulty'   ? 'Reading Difficulty' : ''
        }
      >
        {/* Name */}
        {editSection === 'name' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TextInput
              style={styles.modalInput}
              placeholder="Your name..."
              placeholderTextColor={Colors.textMuted}
              value={localName}
              onChangeText={setLocalName}
              autoFocus
              autoCapitalize="words"
            />
          </KeyboardAvoidingView>
        )}

        {/* Role */}
        {editSection === 'role' && (
          <ScrollView style={styles.modalScroll}>
            {ROLES.map(r => (
              <OptionRow
                key={r.id}
                emoji={r.emoji}
                label={r.label}
                desc={r.desc}
                selected={localRole === r.id}
                onPress={() => setLocalRole(r.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Primary field */}
        {editSection === 'primary_field' && (
          <ScrollView style={styles.modalScroll}>
            {DETAILED_TOPICS.map(t => (
              <OptionRow
                key={t.id}
                emoji={t.emoji}
                label={t.label}
                desc={t.desc}
                badge={t.abbrev}
                selected={localPrimary === t.id}
                onPress={() => setLocalPrimary(t.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Topics */}
        {editSection === 'topics' && (
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalHint}>
              Your primary field ({primaryObj?.label}) is always included.
            </Text>
            {DETAILED_TOPICS.filter(t => t.id !== localPrimary).map(t => {
              const sel = localTopics.includes(t.id)
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.optionCard, sel && styles.optionCardSelected]}
                  onPress={() => setLocalTopics(prev =>
                    prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                  )}
                >
                  <Text style={styles.optionEmoji}>{t.emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, sel && styles.optionLabelSelected]}>
                      {t.label}
                    </Text>
                    <Text style={styles.optionDesc}>{t.desc}</Text>
                  </View>
                  {sel && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* Experience */}
        {editSection === 'experience' && (
          <ScrollView style={styles.modalScroll}>
            {EXPERIENCE_LEVELS.map(e => (
              <OptionRow
                key={e.id}
                emoji={e.emoji}
                label={e.label}
                desc={e.desc}
                selected={localExp === e.id}
                onPress={() => setLocalExp(e.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Reading goal */}
        {editSection === 'reading_goal' && (
          <ScrollView style={styles.modalScroll}>
            {READING_GOALS.map(g => (
              <OptionRow
                key={g.id}
                emoji={g.emoji}
                label={g.label}
                desc={g.desc}
                selected={localGoal === g.id}
                onPress={() => setLocalGoal(g.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Weekly goal */}
        {editSection === 'weekly_goal' && (
          <ScrollView style={styles.modalScroll}>
            {WEEKLY_GOALS.map(g => (
              <OptionRow
                key={String(g.id)}
                emoji={g.emoji}
                label={g.label}
                desc={g.desc}
                selected={localWeekly === g.id}
                onPress={() => setLocalWeekly(g.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Difficulty */}
        {editSection === 'difficulty' && (
          <ScrollView style={styles.modalScroll}>
            {DIFFICULTY_OPTIONS.map(d => (
              <OptionRow
                key={d.id}
                emoji={d.emoji}
                label={d.label}
                desc={d.desc}
                selected={localDifficulty === d.id}
                onPress={() => setLocalDiff(d.id)}
              />
            ))}
          </ScrollView>
        )}
      </EditModal>

    </SafeAreaView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileRow({ label, value, onEdit }: {
  label: string; value: string; onEdit: () => void
}) {
  return (
    <TouchableOpacity style={styles.profileRow} onPress={onEdit}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <View style={styles.profileRowRight}>
        <Text style={styles.profileRowValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.menuChevron}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

function OptionRow({ emoji, label, desc, badge, selected, onPress }: {
  emoji: string; label: string; desc: string; badge?: string
  selected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <View style={styles.optionText}>
        <View style={styles.optionRow}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {label}
          </Text>
          {badge && (
            <View style={styles.abbrevBadge}>
              <Text style={styles.abbrevText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.optionDesc, selected && styles.optionDescSelected]}>{desc}</Text>
      </View>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  )
}

function EditModal({ visible, onClose, onSave, saving, title, children }: {
  visible: boolean; onClose: () => void; onSave: () => void
  saving: boolean; title: string; children: React.ReactNode
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>{children}</View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalSaveText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: Colors.background },
  header:               { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar:               { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  avatarText:           { fontSize: 36, color: Colors.accent, fontWeight: Fonts.weights.bold },
  username:             { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, marginBottom: 4 },
  editHint:             { color: Colors.accent, fontSize: Fonts.sizes.md },
  roleLabel:            { color: Colors.textMuted, fontSize: Fonts.sizes.sm, marginBottom: 4 },
  savedCount:           { fontSize: Fonts.sizes.sm },
  savedNum:             { color: Colors.accent, fontWeight: Fonts.weights.bold },
  savedLabel:           { color: Colors.textMuted },
  streakSection:        { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  streakRing:           { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FF6400', backgroundColor: 'rgba(255,100,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  streakEmoji:          { fontSize: 28 },
  streakNumber:         { color: '#FF6400', fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold },
  streakRingLabel:      { color: '#FF6400', fontSize: Fonts.sizes.xs },
  statsRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, width: '100%' },
  statBox:              { alignItems: 'center', flex: 1 },
  statNumber:           { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  statLabel:            { color: Colors.textMuted, fontSize: Fonts.sizes.xs, marginTop: 2 },
  statDivider:          { width: 1, height: 30, backgroundColor: Colors.border },
  streakStatus:         { color: Colors.textMuted, fontSize: Fonts.sizes.sm, textAlign: 'center' },
  section:              { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle:         { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  editLink:             { color: Colors.accent, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  profileRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  profileRowLabel:      { color: Colors.textMuted, fontSize: Fonts.sizes.sm, flex: 1 },
  profileRowRight:      { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 2, justifyContent: 'flex-end' },
  profileRowValue:      { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, textAlign: 'right', flex: 1 },
  pillsWrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:                 { backgroundColor: Colors.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'transparent' },
  pillPrimary:          { borderColor: Colors.accent, backgroundColor: 'rgba(59,130,246,0.2)' },
  pillText:             { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  pillTextPrimary:      { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold },
  emptyHint:            { color: Colors.textMuted, fontSize: Fonts.sizes.sm, fontStyle: 'italic' },
  menuItem:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  menuItemDanger:       { borderColor: 'rgba(247,79,79,0.3)', backgroundColor: 'rgba(247,79,79,0.05)' },
  menuItemText:         { color: Colors.textPrimary, fontSize: Fonts.sizes.md },
  menuChevron:          { color: Colors.textMuted, fontSize: Fonts.sizes.lg },
  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:           { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  modalClose:           { color: Colors.textMuted, fontSize: Fonts.sizes.lg },
  modalBody:   { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
modalScroll: { flex: 1 },  // remove maxHeight: 400
modalCard:   { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%' },  // fixed height instead of maxHeight
  modalHint:            { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontStyle: 'italic', marginBottom: Spacing.md },
  modalInput:           { backgroundColor: Colors.surfaceHigh, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: Fonts.sizes.md },
  modalFooter:          { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  modalCancelBtn:       { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  modalCancelText:      { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  modalSaveBtn:         { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.accent },
  modalSaveText:        { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  // Shared option styles
  optionCard:           { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  optionCardSelected:   { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: Colors.accent },
  optionEmoji:          { fontSize: 26, marginRight: Spacing.md, width: 36, textAlign: 'center' },
  optionText:           { flex: 1 },
  optionRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  optionLabel:          { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  optionLabelSelected:  { color: Colors.accent },
  optionDesc:           { color: Colors.textMuted, fontSize: Fonts.sizes.sm, lineHeight: 18 },
  optionDescSelected:   { color: Colors.textSecondary },
  abbrevBadge:          { backgroundColor: Colors.surfaceHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  abbrevText:           { color: Colors.textMuted, fontSize: 9, fontWeight: Fonts.weights.bold },
  checkmark:            { color: Colors.accent, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, marginLeft: Spacing.sm },
})