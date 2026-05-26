import { useRef } from 'react'
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { Colors, Fonts, Spacing, Swipe } from '../constants'
import type { Paper } from '../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH  = SCREEN_WIDTH - Spacing.lg * 2
const CARD_HEIGHT = 480

interface PaperCardProps {
  paper:   Paper
  onSave:  (paper: Paper) => void
  onSkip:  (paper: Paper) => void
  isTop:   boolean
}

export default function PaperCard({ paper, onSave, onSkip, isTop }: PaperCardProps) {
  const position = useRef(new Animated.ValueXY()).current
  // Use a ref to track isTop so PanResponder always reads the latest value
  const isTopRef = useRef(isTop)
  isTopRef.current = isTop

  const rotate = position.x.interpolate({
    inputRange:  [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  })

  const saveOpacity = position.x.interpolate({
    inputRange:  [0, Swipe.threshold / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const skipOpacity = position.x.interpolate({
    inputRange:  [-Swipe.threshold / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const panResponder = useRef(
    PanResponder.create({
      // Always read from ref so latest isTop value is used
      onStartShouldSetPanResponder: () => isTopRef.current,
      onMoveShouldSetPanResponder:  () => isTopRef.current,

      onPanResponderMove: (_, gesture) => {
        if (!isTopRef.current) return
        position.setValue({ x: gesture.dx, y: gesture.dy })
      },

      onPanResponderRelease: (_, gesture) => {
        if (!isTopRef.current) return
        if (gesture.dx > Swipe.threshold) {
          Animated.spring(position, {
            toValue:         { x: Swipe.outOfScreenX, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => onSave(paper))
        } else if (gesture.dx < -Swipe.threshold) {
          Animated.spring(position, {
            toValue:         { x: -Swipe.outOfScreenX, y: gesture.dy },
            useNativeDriver: true,
          }).start(() => onSkip(paper))
        } else {
          Animated.spring(position, {
            toValue:         { x: 0, y: 0 },
            useNativeDriver: true,
            friction:        5,
          }).start()
        }
      },
    })
  ).current

  const cardTransform = isTop
    ? [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ]
    : []

  return (
    <Animated.View
      style={[styles.card, { transform: cardTransform }]}
      {...panResponder.panHandlers}
    >
      {/* Save indicator */}
      <Animated.View style={[styles.actionLabel, styles.saveLabel, { opacity: saveOpacity }]}>
        <Text style={styles.saveLabelText}>SAVE</Text>
      </Animated.View>

      {/* Skip indicator */}
      <Animated.View style={[styles.actionLabel, styles.skipLabel, { opacity: skipOpacity }]}>
        <Text style={styles.skipLabelText}>SKIP</Text>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.categories}>
          {paper.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={styles.categoryPill}>
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.title} numberOfLines={4}>
          {paper.title}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {paper.authors.slice(0, 2).join(', ')}
          {paper.authors.length > 2 ? ' et al.' : ''}
          {' · '}{paper.year}
        </Text>

        {paper.venue ? (
          <Text style={styles.venue}>{paper.venue}</Text>
        ) : null}

        <Text style={styles.abstract} numberOfLines={7}>
          {paper.abstract}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => onSkip(paper)}
          >
            <Text style={styles.skipButtonText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => onSave(paper)}
          >
            <Text style={styles.saveButtonText}>♥</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    width:           CARD_WIDTH,
    height:          CARD_HEIGHT,
    borderRadius:    20,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.4,
    shadowRadius:    16,
    elevation:       8,
  },

  content: {
    flex:    1,
    padding: Spacing.lg,
  },

  categories: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  Spacing.sm,
  },

  categoryPill: {
    backgroundColor:   Colors.accentDim,
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },

  categoryText: {
    color:      Colors.accent,
    fontSize:   Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
  },

  title: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.sizes.xl,
    fontWeight:   Fonts.weights.bold,
    lineHeight:   26,
    marginBottom: Spacing.sm,
  },

  meta: {
    color:        Colors.textSecondary,
    fontSize:     Fonts.sizes.sm,
    marginBottom: 4,
  },

  venue: {
    color:        Colors.accent,
    fontSize:     Fonts.sizes.sm,
    fontWeight:   Fonts.weights.medium,
    marginBottom: Spacing.md,
  },

  abstract: {
    color:      Colors.textSecondary,
    fontSize:   Fonts.sizes.sm,
    lineHeight: 20,
    flex:       1,
  },

  actions: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      Spacing.md,
    paddingTop:     Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  actionButton: {
    width:          56,
    height:         56,
    borderRadius:   28,
    justifyContent: 'center',
    alignItems:     'center',
  },

  skipButton: {
    backgroundColor: 'rgba(247, 79, 79, 0.15)',
    borderWidth:     1,
    borderColor:     Colors.skip,
  },

  saveButton: {
    backgroundColor: 'rgba(79, 142, 247, 0.15)',
    borderWidth:     1,
    borderColor:     Colors.save,
  },

  skipButtonText: {
    color:      Colors.skip,
    fontSize:   Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
  },

  saveButtonText: {
    color:    Colors.save,
    fontSize: Fonts.sizes.xl,
  },

  actionLabel: {
    position:          'absolute',
    top:               40,
    zIndex:            10,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      8,
    borderWidth:       2,
  },

  saveLabel: {
    left:            20,
    borderColor:     Colors.save,
    backgroundColor: 'rgba(79, 142, 247, 0.15)',
  },

  skipLabel: {
    right:           20,
    borderColor:     Colors.skip,
    backgroundColor: 'rgba(247, 79, 79, 0.15)',
  },

  saveLabelText: {
    color:      Colors.save,
    fontSize:   Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
  },

  skipLabelText: {
    color:      Colors.skip,
    fontSize:   Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
  },
})