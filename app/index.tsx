import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Colors } from '../constants'
import { setToken } from '../services/api'
import useStore from '../store/useStore'

export default function Index() {
  const [checking, setChecking] = useState(true)
  const { loadStoredToken, loadPreferences, loadHistory, loadReadingProgress, loadStreak } = useStore()

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadPreferences(),
        loadStoredToken(),
        loadHistory(),
        loadReadingProgress(),
        loadStreak(),
      ])
      const t = useStore.getState().token
      if (t) setToken(t)
      setChecking(false)
    }
    init()
  }, [])

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  const { token, preferences } = useStore.getState()
  if (!token) return <Redirect href={'/auth' as any} />
  if (!preferences.onboardingDone) return <Redirect href={'/onboarding' as any} />
  return <Redirect href="/(tabs)/home" />
}