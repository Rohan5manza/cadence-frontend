import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, DETAILED_TOPICS, DIFFICULTY_OPTIONS, Fonts, Spacing } from '../constants'
import { userAPI } from '../services/api'
import type { UserPreferences } from '../store/useStore'
import useStore from '../store/useStore'

type Step = 'topics' | 'difficulty'

export default function OnboardingScreen() {
  const router             = useRouter()
  const { setPreferences } = useStore()

  const [step, setStep]               = useState<Step>('topics')
  const [selectedTopics, setTopics]   = useState<string[]>([])
  const [difficulty, setDifficulty]   = useState<string>('any')
  const [saving, setSaving]           = useState(false)

  const toggleTopic = (id: string) => {
    setTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleFinish = async () => {
    setSaving(true)
    const prefs: UserPreferences = {
      topics:          selectedTopics,
      difficultyLevel: difficulty as any,
      onboardingDone:  true,
    }
    try {
      // Sync to backend so feed algorithm uses these immediately
      await userAPI.updatePreferences({
        topics:     selectedTopics,
        difficulty: difficulty,
      })
    } catch {}
    await setPreferences(prefs)
    router.replace('/(tabs)/home' as any)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: step === 'topics' ? '50%' : '100%' }]} />
      </View>

      {step === 'topics' ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 1 of 2</Text>
            <Text style={styles.title}>What are you interested in?</Text>
            <Text style={styles.subtitle}>
              Pick as many as you like. Cadence learns as you read — this is just a starting point.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.topicsList}>
            {DETAILED_TOPICS.map((topic) => {
              const selected = selectedTopics.includes(topic.id)
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicRow, selected && styles.topicRowSelected]}
                  onPress={() => toggleTopic(topic.id)}
                >
                  <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                  <View style={styles.topicText}>
                    <View style={styles.topicHeader}>
                      <Text style={[styles.topicLabel, selected && styles.topicLabelSelected]}>
                        {topic.label}
                      </Text>
                      <View style={styles.abbrevBadge}>
                        <Text style={styles.abbrevText}>{topic.abbrev}</Text>
                      </View>
                    </View>
                    <Text style={[styles.topicDesc, selected && styles.topicDescSelected]}>
                      {topic.desc}
                    </Text>
                  </View>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextBtn, selectedTopics.length === 0 && styles.nextBtnDisabled]}
              onPress={() => setStep('difficulty')}
              disabled={selectedTopics.length === 0}
            >
              <Text style={[styles.nextBtnText, selectedTopics.length === 0 && styles.nextBtnTextDisabled]}>
                {selectedTopics.length === 0
                  ? 'Select at least one topic'
                  : `Continue with ${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''} →`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 2 of 2</Text>
            <Text style={styles.title}>What reading level suits you?</Text>
            <Text style={styles.subtitle}>
              This helps filter papers that feel too dense or too basic for you.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.difficultyList}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const selected = difficulty === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.difficultyCard, selected && styles.difficultyCardSelected]}
                  onPress={() => setDifficulty(opt.id)}
                >
                  <View style={styles.difficultyLeft}>
                    <Text style={styles.difficultyEmoji}>{opt.emoji}</Text>
                    <View style={styles.difficultyText}>
                      <Text style={[styles.difficultyLabel, selected && styles.difficultyLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.difficultyDesc}>{opt.desc}</Text>
                    </View>
                  </View>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('topics')}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { flex: 1 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.nextBtnText}>Start Discovering ✦</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:               { flex: 1, backgroundColor: Colors.background },
  progressBar:             { height: 3, backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: 2 },
  progressFill:            { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  header:                  { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  stepLabel:               { color: Colors.accent, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, marginBottom: Spacing.xs },
  title:                   { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, marginBottom: Spacing.sm },
  subtitle:                { color: Colors.textMuted, fontSize: Fonts.sizes.md, lineHeight: 22 },
  topicsList:              { paddingHorizontal: Spacing.lg, gap: 10, paddingBottom: Spacing.xl },
  topicRow:                { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  topicRowSelected:        { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  topicEmoji:              { fontSize: 24, marginRight: Spacing.md },
  topicText:               { flex: 1 },
  topicHeader:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  topicLabel:              { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  topicLabelSelected:      { color: Colors.accent },
  abbrevBadge:             { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  abbrevText:              { color: Colors.textMuted, fontSize: 10, fontWeight: Fonts.weights.bold },
  topicDesc:               { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: 18 },
  topicDescSelected:       { color: Colors.accent, opacity: 0.8 },
  checkmark:               { color: Colors.accent, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, marginLeft: Spacing.sm },
  difficultyList:          { paddingHorizontal: Spacing.lg, gap: 12, paddingBottom: Spacing.xl },
  difficultyCard:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  difficultyCardSelected:  { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  difficultyLeft:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, flex: 1 },
  difficultyEmoji:         { fontSize: 24, marginTop: 2 },
  difficultyText:          { flex: 1 },
  difficultyLabel:         { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, marginBottom: 4 },
  difficultyLabelSelected: { color: Colors.accent },
  difficultyDesc:          { color: Colors.textMuted, fontSize: Fonts.sizes.sm, lineHeight: 18 },
  footer:                  { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn:                 { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  backBtnText:             { color: Colors.textSecondary, fontSize: Fonts.sizes.md },
  nextBtn:                 { flex: 1, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled:         { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  nextBtnText:             { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  nextBtnTextDisabled:     { color: Colors.textMuted },
})