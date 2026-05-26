import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Fonts, Spacing } from '../constants'
import { authAPI, setToken } from '../services/api'
import useStore from '../store/useStore'

export default function AuthScreen() {
  const router              = useRouter()
  const { setUser, setToken: storeToken } = useStore()
  const [mode, setMode]     = useState<'login' | 'register'>('login')
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authAPI.login({ email, password })
        : await authAPI.register({ email, password })

      // Store token
      setToken(res.access_token)
      await storeToken(res.access_token)

      // Navigate to main app
      router.replace('/(tabs)/discover')

    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo / title */}
        <View style={styles.header}>
          <Text style={styles.logo}>◈</Text>
          <Text style={styles.appName}>Cadence</Text>
          <Text style={styles.tagline}>Discover research that moves you</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPass}
            secureTextEntry
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Text
            style={styles.footerLink}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </Text>
        </Text>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex:            1,
    justifyContent:  'center',
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems:   'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize:     64,
    color:        Colors.accent,
    marginBottom: Spacing.sm,
  },
  appName: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.sizes.hero,
    fontWeight:   Fonts.weights.bold,
    marginBottom: Spacing.xs,
  },
  tagline: {
    color:    Colors.textMuted,
    fontSize: Fonts.sizes.md,
  },
  modeToggle: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    12,
    padding:         4,
    marginBottom:    Spacing.lg,
  },
  modeBtn: {
    flex:           1,
    paddingVertical: 10,
    alignItems:     'center',
    borderRadius:   8,
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
  },
  modeBtnText: {
    color:      Colors.textMuted,
    fontSize:   Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    color:           Colors.textPrimary,
    fontSize:        Fonts.sizes.md,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius:    12,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    marginTop:       Spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color:      '#FFFFFF',
    fontSize:   Fonts.sizes.md,
    fontWeight: Fonts.weights.bold,
  },
  footer: {
    textAlign: 'center',
    color:     Colors.textMuted,
    fontSize:  Fonts.sizes.sm,
  },
  footerLink: {
    color:      Colors.accent,
    fontWeight: Fonts.weights.semibold,
  },
})