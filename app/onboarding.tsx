import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Colors, DETAILED_TOPICS,
  EXPERIENCE_LEVELS, Fonts, READING_GOALS, ROLES, Spacing, WEEKLY_GOALS
} from '../constants'
import { userAPI } from '../services/api'
import type { UserPreferences } from '../store/useStore'
import useStore from '../store/useStore'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const TOTAL_STEPS = 8

type Step =
  | 'welcome'
  | 'name'
  | 'role'
  | 'primary_field'
  | 'topics'
  | 'experience'
  | 'reading_goal'
  | 'weekly_goal'

const STEPS: Step[] = [
  'welcome', 'name', 'role', 'primary_field',
  'topics', 'experience', 'reading_goal', 'weekly_goal',
]

export default function OnboardingScreen() {
  const router             = useRouter()
  const { setPreferences } = useStore()

  const [stepIndex, setStepIndex]         = useState(0)
  const [saving, setSaving]               = useState(false)
  const progressAnim                      = useRef(new Animated.Value(0)).current

  // Form state
  const [displayName, setDisplayName]     = useState('')
  const [role, setRole]                   = useState('')
  const [primaryField, setPrimaryField]   = useState('')
  const [topics, setTopics]               = useState<string[]>([])
  const [experienceLevel, setExperience]  = useState('')
  const [readingGoal, setReadingGoal]     = useState('')
  const [weeklyGoal, setWeeklyGoal]       = useState(5)
  const [difficulty, setDifficulty]       = useState('any')

  const currentStep = STEPS[stepIndex]

  const animateProgress = (toStep: number) => {
    Animated.timing(progressAnim, {
      toValue:         toStep / (TOTAL_STEPS - 1),
      duration:        300,
      useNativeDriver: false,
    }).start()
  }

  const goNext = () => {
    const next = stepIndex + 1
    if (next < STEPS.length) {
      setStepIndex(next)
      animateProgress(next)
    } else {
      handleFinish()
    }
  }

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
      animateProgress(stepIndex - 1)
    }
  }

  const toggleTopic = (id: string) => {
    setTopics(prev => prev.includes(id)
      ? prev.filter(t => t !== id)
      : [...prev, id]
    )
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'welcome':      return true
      case 'name':         return displayName.trim().length >= 2
      case 'role':         return role !== ''
      case 'primary_field':return primaryField !== ''
      case 'topics':       return topics.length >= 1
      case 'experience':   return experienceLevel !== ''
      case 'reading_goal': return readingGoal !== ''
      case 'weekly_goal':  return true
      default:             return true
    }
  }

  const handleFinish = async () => {
    setSaving(true)

    // Map experience level to difficulty if not overridden
    const effectiveDifficulty = difficulty !== 'any' ? difficulty :
      experienceLevel === 'beginner'    ? 'accessible' :
      experienceLevel === 'expert'      ? 'expert'     : 'any'

    const prefs: UserPreferences = {
      topics,
      difficultyLevel:  effectiveDifficulty as any,
      onboardingDone:   true,
      displayName:      displayName.trim(),
      role:             role as any,
      institution:      '',
      primaryField,
      readingGoal:      readingGoal as any,
      experienceLevel:  experienceLevel as any,
      weeklyGoal,
    }

    try {
      await userAPI.updateProfile({
        topics,
        difficulty:       effectiveDifficulty,
        display_name:     displayName.trim(),
        role,
        institution:      '',
        primary_field:    primaryField,
        reading_goal:     readingGoal,
        experience_level: experienceLevel,
        weekly_goal:      weeklyGoal,
      })
    } catch (e) {
      console.error('Profile sync failed:', e)
    }

    await setPreferences(prefs)
    router.replace('/(tabs)/home' as any)
  }

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Step counter */}
      <View style={styles.stepCounter}>
        {currentStep !== 'welcome' && (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        {currentStep !== 'welcome' && (
          <Text style={styles.stepLabel}>
            {stepIndex} of {TOTAL_STEPS - 1}
          </Text>
        )}
      </View>

      {/* ── WELCOME ────────────────────────────────────────────────────────── */}
      {currentStep === 'welcome' && (
        <View style={styles.centered}>
          <Image
  source={require('../assets/images/cadence-icon.png')}
  style={styles.welcomeIcon}
  resizeMode="contain"
/>
          <Text style={styles.welcomeTitle}>Welcome to Cadence</Text>
          <Text style={styles.welcomeSubtitle}>
            Discover research that moves you.
          </Text>
          <Text style={styles.welcomeBody}>
            We'll ask you a few questions to build your research profile.
            This takes about 2 minutes and makes your feed dramatically more useful.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── NAME ───────────────────────────────────────────────────────────── */}
      {currentStep === 'name' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.stepContainer}
        >
          <Text style={styles.stepTitle}>What should we call you?</Text>
          <Text style={styles.stepSubtitle}>
            Your name helps personalize your experience.
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Your name or display name..."
            placeholderTextColor={Colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => canProceed() && goNext()}
          />
          <Text style={styles.hint}>This won't be shown to other users.</Text>
        </KeyboardAvoidingView>
      )}

      {/* ── ROLE ───────────────────────────────────────────────────────────── */}
      {currentStep === 'role' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What describes you best?</Text>
          <Text style={styles.stepSubtitle}>
            This helps us understand how you use research.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.optionCard, role === r.id && styles.optionCardSelected]}
                onPress={() => setRole(r.id)}
              >
                <Text style={styles.optionEmoji}>{r.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, role === r.id && styles.optionLabelSelected]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.optionDesc, role === r.id && styles.optionDescSelected]}>
                    {r.desc}
                  </Text>
                </View>
                {role === r.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── PRIMARY FIELD ──────────────────────────────────────────────────── */}
      {currentStep === 'primary_field' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What's your main field?</Text>
          <Text style={styles.stepSubtitle}>
            Pick the ONE area you care about most.
            This gets extra weight in your recommendations.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {DETAILED_TOPICS.map(topic => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.optionCard, primaryField === topic.id && styles.optionCardSelected]}
                onPress={() => setPrimaryField(topic.id)}
              >
                <Text style={styles.optionEmoji}>{topic.emoji}</Text>
                <View style={styles.optionText}>
                  <View style={styles.optionRow}>
                    <Text style={[styles.optionLabel, primaryField === topic.id && styles.optionLabelSelected]}>
                      {topic.label}
                    </Text>
                    <View style={styles.abbrevBadge}>
                      <Text style={styles.abbrevText}>{topic.abbrev}</Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDesc, primaryField === topic.id && styles.optionDescSelected]}>
                    {topic.desc}
                  </Text>
                </View>
                {primaryField === topic.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── TOPICS ─────────────────────────────────────────────────────────── */}
      {currentStep === 'topics' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What else interests you?</Text>
          <Text style={styles.stepSubtitle}>
            Select all topics you want in your feed.
            {primaryField && ` "${DETAILED_TOPICS.find(t => t.id === primaryField)?.label}" is already included.`}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.topicsGrid}>
              {DETAILED_TOPICS.filter(t => t.id !== primaryField).map(topic => {
                const selected = topics.includes(topic.id)
                return (
                  <TouchableOpacity
                    key={topic.id}
                    style={[styles.topicPill, selected && styles.topicPillSelected]}
                    onPress={() => toggleTopic(topic.id)}
                  >
                    <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicLabel, selected && styles.topicLabelSelected]}>
                        {topic.label}
                      </Text>
                      <Text style={styles.topicDesc} numberOfLines={1}>{topic.desc}</Text>
                    </View>
                    {selected && <Text style={[styles.checkmark, { fontSize: 14 }]}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
          <Text style={styles.selectionCount}>
            {topics.length} selected{primaryField ? ' + your primary field' : ''}
          </Text>
        </View>
      )}

      {/* ── EXPERIENCE ─────────────────────────────────────────────────────── */}
      {currentStep === 'experience' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>How familiar are you with research papers?</Text>
          <Text style={styles.stepSubtitle}>
            We'll calibrate the complexity of your recommendations.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {EXPERIENCE_LEVELS.map(exp => (
              <TouchableOpacity
                key={exp.id}
                style={[styles.optionCard, experienceLevel === exp.id && styles.optionCardSelected]}
                onPress={() => setExperience(exp.id)}
              >
                <Text style={styles.optionEmoji}>{exp.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, experienceLevel === exp.id && styles.optionLabelSelected]}>
                    {exp.label}
                  </Text>
                  <Text style={[styles.optionDesc, experienceLevel === exp.id && styles.optionDescSelected]}>
                    {exp.desc}
                  </Text>
                </View>
                {experienceLevel === exp.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── READING GOAL ───────────────────────────────────────────────────── */}
      {currentStep === 'reading_goal' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>What are you here for?</Text>
          <Text style={styles.stepSubtitle}>
            This shapes how we rank and filter your recommendations.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {READING_GOALS.map(goal => (
              <TouchableOpacity
                key={goal.id}
                style={[styles.optionCard, readingGoal === goal.id && styles.optionCardSelected]}
                onPress={() => setReadingGoal(goal.id)}
              >
                <Text style={styles.optionEmoji}>{goal.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, readingGoal === goal.id && styles.optionLabelSelected]}>
                    {goal.label}
                  </Text>
                  <Text style={[styles.optionDesc, readingGoal === goal.id && styles.optionDescSelected]}>
                    {goal.desc}
                  </Text>
                </View>
                {readingGoal === goal.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── WEEKLY GOAL ────────────────────────────────────────────────────── */}
      {currentStep === 'weekly_goal' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>How many papers per week?</Text>
          <Text style={styles.stepSubtitle}>
            Set a realistic goal. You can change this anytime.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {WEEKLY_GOALS.map(goal => (
              <TouchableOpacity
                key={goal.id}
                style={[styles.optionCard, weeklyGoal === goal.id && styles.optionCardSelected]}
                onPress={() => setWeeklyGoal(goal.id)}
              >
                <Text style={styles.optionEmoji}>{goal.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, weeklyGoal === goal.id && styles.optionLabelSelected]}>
                    {goal.label}
                  </Text>
                  <Text style={[styles.optionDesc, weeklyGoal === goal.id && styles.optionDescSelected]}>
                    {goal.desc}
                  </Text>
                </View>
                {weeklyGoal === goal.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Footer buttons ──────────────────────────────────────────────────── */}
      {currentStep !== 'welcome' && (
  <View style={styles.footer}>
    <TouchableOpacity
  style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
  onPress={goNext}
  disabled={!canProceed() || saving}
>
  <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
    {stepIndex === STEPS.length - 1 ? 'Start Discovering' : 'Continue'}
  </Text>
</TouchableOpacity>
  </View>
)}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: Colors.background },
  progressTrack:          { height: 3, backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, borderRadius: 2 },
  progressFill:           { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  stepCounter:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtn:                { padding: 4 },
  backBtnText:            { color: Colors.accent, fontSize: Fonts.sizes.lg },
  stepLabel:              { color: Colors.textMuted, fontSize: Fonts.sizes.sm },
  centered:               { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  welcomeEmoji:           { fontSize: 64, marginBottom: Spacing.lg, color: Colors.accent },
  welcomeTitle:           { color: Colors.textPrimary, fontSize: Fonts.sizes.hero, fontWeight: Fonts.weights.bold, textAlign: 'center', marginBottom: Spacing.sm },
  welcomeSubtitle:        { color: Colors.accent, fontSize: Fonts.sizes.lg, textAlign: 'center', marginBottom: Spacing.lg },
  welcomeBody:            { color: Colors.textMuted, fontSize: Fonts.sizes.md, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  stepContainer:          { flex: 1, paddingHorizontal: Spacing.lg },
  stepTitle:              { color: Colors.textPrimary, fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  stepSubtitle:           { color: Colors.textMuted, fontSize: Fonts.sizes.md, lineHeight: 22, marginBottom: Spacing.lg },
  scrollArea:             { flex: 1 },
  optionCard:             { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  optionCardSelected:     { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: Colors.accent },
  optionEmoji:            { fontSize: 28, marginRight: Spacing.md, width: 40, textAlign: 'center' },
  optionText:             { flex: 1 },
  optionRow:              { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  optionLabel:            { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  optionLabelSelected:    { color: Colors.accent },
  optionDesc:             { color: Colors.textMuted, fontSize: Fonts.sizes.sm, lineHeight: 18 },
  optionDescSelected:     { color: Colors.textSecondary },
  abbrevBadge:            { backgroundColor: Colors.surfaceHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  abbrevText:             { color: Colors.textMuted, fontSize: 9, fontWeight: Fonts.weights.bold },
  checkmark:              { color: Colors.accent, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, marginLeft: Spacing.sm },
  topicsGrid:             { gap: Spacing.sm, paddingBottom: Spacing.xl },
  topicPill:              { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  topicPillSelected:      { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: Colors.accent },
  topicEmoji:             { fontSize: 22, width: 32, textAlign: 'center' },
  topicLabel:             { color: Colors.textPrimary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, marginBottom: 1 },
  topicLabelSelected:     { color: Colors.accent },
  topicDesc:              { color: Colors.textMuted, fontSize: Fonts.sizes.xs },
  selectionCount:         { color: Colors.textMuted, fontSize: Fonts.sizes.xs, textAlign: 'center', paddingVertical: Spacing.sm },
  textInput:              { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: Fonts.sizes.lg, marginBottom: Spacing.sm },
  hint:                   { color: Colors.textMuted, fontSize: Fonts.sizes.xs, fontStyle: 'italic' },
  footer:                 { padding: Spacing.lg, paddingBottom: Spacing.xl },
  primaryBtn:             { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText:         { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
  primaryBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
primaryBtnTextDisabled: { color: Colors.textMuted, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold },
welcomeIcon: { width: 120, height: 120, marginBottom: Spacing.lg, borderRadius: 26 },
})