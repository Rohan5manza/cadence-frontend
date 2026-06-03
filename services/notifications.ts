import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Guard — expo-notifications not supported in Expo Go on Android SDK 53+
let Notifications: any = null
try {
  Notifications = require('expo-notifications')
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge:  false,
      }),
    })
  }
} catch (e) {
  console.log('[notifications] Not available in this environment')
}

// ── Helper ────────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerForPushNotifications(): Promise<boolean> {
  if (!Notifications) return false
  if (!Device.isDevice) return false
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return false
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cadence', {
        name:       'Cadence',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    return true
  } catch { return false }
}

// ── Daily reminder — 8pm + 9am ────────────────────────────────────────────────
export async function scheduleDailyReminder(): Promise<void> {
  if (!Notifications) return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()

    const eveningMessages = [
      { title: '📖 Still waiting.',               body: "Your daily paper has been sitting there since morning. Alone. Unread. Judging you." },
      { title: '😐 No paper today?',              body: "The researchers who wrote these papers had to do actual experiments. The least you can do is read one." },
      { title: '📚 The papers are getting cold.', body: "You had all day. It takes 60 seconds. We're not asking you to write one." },
      { title: '🙄 Oh, you were busy.',           body: "Sure. Completely understandable. The paper will be here when you find a free minute between scrolling." },
      { title: '👀 Cadence misses you.',          body: "Your recommended papers are piling up. They won't read themselves. Probably." },
      { title: '⏰ Last call.',                   body: "It's getting late. One paper. That's all. You've spent longer deciding what to watch on Netflix." },
      { title: '🔬 Science called.',              body: "It asked when you were coming back. We didn't know what to say." },
      { title: '📖 Friendly reminder.',           body: "You installed this app for a reason. That reason hasn't gone away." },
      { title: '😤 Fine. Be that way.',           body: "We'll just sit here with 2.28 million unread papers while you do whatever it is you're doing." },
      { title: '🧪 One paper.',                   body: "Not a textbook. Not a thesis. One abstract. Maybe two. You can do this." },
    ]

    const morningMessages = [
      { title: '☀️ Good morning.',         body: "New papers matched to your interests are ready. Coffee first, then enlightenment." },
      { title: '🌅 Rise and read.',        body: "Start your day smarter than yesterday. The bar is low. You can do it." },
      { title: '🧠 Brain empty?',          body: "We have millions of papers to fix that. Pick one." },
      { title: '📖 Morning, researcher.',  body: "Your personalized feed has been updated. Fresh papers, just for you. You're welcome." },
      { title: '⚗️ Today could be the day', body: "...that you read something that changes how you think. Or not. But probably yes." },
    ]

    const evening = pick(eveningMessages)
    const morning = pick(morningMessages)

    await Notifications.scheduleNotificationAsync({
      content: { ...evening, data: { screen: 'home' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
    })

    await Notifications.scheduleNotificationAsync({
      content: { ...morning, data: { screen: 'home' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
    })
  } catch (e) {
    console.log('[notifications] scheduleDailyReminder failed:', e)
  }
}

// ── Streak at risk — 9pm ──────────────────────────────────────────────────────
export async function scheduleStreakAtRiskReminder(currentStreak: number): Promise<void> {
  if (!Notifications) return
  if (currentStreak < 2) return
  try {
    const messages = [
      { title: `😰 Your ${currentStreak}-day streak is dying.`,  body: "It's not dead yet. But it's not looking good. Open Cadence. Read something. Save it." },
      { title: `⚠️ ${currentStreak} days. Gone tonight.`,       body: "You've come this far and you're going to throw it away? Really? Tonight? For what?" },
      { title: `🔥 Don't do this to yourself.`,                 body: `${currentStreak} days of reading. One lazy evening can erase all of it. Don't be that person.` },
      { title: `😤 Your streak will not survive tonight.`,      body: "Unless you open Cadence in the next few hours. Just saying." },
      { title: `💔 ${currentStreak}-day streak: critical.`,     body: "We've been through a lot together. Don't end it like this. Read one paper." },
      { title: `🫵 You. Yes, you.`,                             body: `${currentStreak} days. Right now, before midnight, open Cadence and read something.` },
    ]
    const msg = pick(messages)
    await Notifications.scheduleNotificationAsync({
      content: { ...msg, data: { screen: 'home' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 },
    })
  } catch (e) {
    console.log('[notifications] scheduleStreakAtRiskReminder failed:', e)
  }
}

// ── Streak broken ─────────────────────────────────────────────────────────────
export async function sendStreakBrokenNotification(lostStreak: number): Promise<void> {
  if (!Notifications) return
  try {
    const messages = [
      { title: '💀 Streak lost.',               body: `${lostStreak} days. Gone. We're not mad. We're just... disappointed.` },
      { title: '😶 Well.',                      body: `That ${lostStreak}-day streak is gone. Nothing to do now but start again. Which you should. Today.` },
      { title: `${lostStreak} days. Poof.`,     body: "It's fine. Streaks are just numbers. Numbers that represented your discipline. But fine." },
      { title: '🪦 RIP your streak.',           body: `${lostStreak} days. Gone too soon. Start a new one today and don't let it happen again.` },
      { title: '😮‍💨 We had to reset it.',       body: `Your ${lostStreak}-day streak didn't survive the night. Fresh start. No pressure. Lots of pressure.` },
    ]
    const msg = pick(messages)
    await Notifications.scheduleNotificationAsync({
      content: { ...msg, data: { screen: 'profile' } },
      trigger: null,
    })
  } catch (e) {
    console.log('[notifications] sendStreakBrokenNotification failed:', e)
  }
}

// ── Streak milestones ─────────────────────────────────────────────────────────
export async function sendStreakNotification(streak: number): Promise<void> {
  if (!Notifications) return
  try {
    const milestoneMessages: Record<number, { title: string; body: string }[]> = {
      3:   [
        { title: '🔥 3-day streak!',     body: "Three days in a row. You might actually be becoming a reader. Don't ruin it." },
        { title: '🔥 Day 3.',            body: "This is how habits form. Keep going before your brain convinces you to stop." },
      ],
      7:   [
        { title: '🔥 One week!',         body: "Seven days straight. You've officially read more papers this week than most people read all year." },
        { title: '📅 7-day streak.',     body: "One full week of reading. We're genuinely impressed. Don't tell anyone we said that." },
      ],
      14:  [
        { title: '🔥 Two weeks!',        body: "Fourteen days. You've earned the right to casually mention 'a paper I was reading recently' in conversation." },
        { title: '💪 14-day streak.',    body: "Two weeks of daily reading. Your past self would be shocked. Your future self is grateful." },
      ],
      30:  [
        { title: '🏆 30 days!',          body: "A full month. You're no longer trying to build a habit — you have one. This is who you are now." },
        { title: '🎓 One month streak.', body: "30 days of reading. You've consumed more research this month than most PhD students do in a semester." },
      ],
      100: [
        { title: '🏆 100-day streak!',   body: "One hundred days. We don't have words. You are the person this app was built for." },
        { title: '🌟 100 days.',         body: "Three digits. You've read more papers than we expected anyone to. You're an actual researcher now." },
      ],
    }
    const msgs = milestoneMessages[streak]
    const msg  = msgs
      ? pick(msgs)
      : { title: `🔥 ${streak}-day streak!`, body: `${streak} consecutive days of reading. You're in rare company.` }
    await Notifications.scheduleNotificationAsync({
      content: { ...msg, data: { screen: 'profile' } },
      trigger: null,
    })
  } catch (e) {
    console.log('[notifications] sendStreakNotification failed:', e)
  }
}

// ── First genuine read of day ─────────────────────────────────────────────────
export async function sendFirstReadOfDayNotification(): Promise<void> {
  if (!Notifications) return
  try {
    const messages = [
      { title: '✅ Paper read!',         body: "That's today sorted. Streak intact. You may return to your regularly scheduled scrolling." },
      { title: '📖 Done for today.',     body: "Streak alive. Brain fed. You did the thing. Good job." },
      { title: '✅ One down.',           body: "You read an actual paper today. This is not nothing. This is something." },
      { title: '🧠 Fed.',               body: "Your brain has been nourished with peer-reviewed content. You're welcome." },
      { title: '✅ Streak kept alive.',  body: "Today's reading: complete. Come back tomorrow or the streak gets it." },
    ]
    const msg = pick(messages)
    await Notifications.scheduleNotificationAsync({
      content: { ...msg, data: { screen: 'profile' } },
      trigger: null,
    })
  } catch (e) {
    console.log('[notifications] sendFirstReadOfDayNotification failed:', e)
  }
}

// ── Weekly digest — Monday 10am ───────────────────────────────────────────────
export async function scheduleWeeklyDigest(): Promise<void> {
  if (!Notifications) return
  try {
    const messages = [
      { title: '📊 Weekly digest.',       body: "See what you discovered this week. Or didn't. We're not here to judge. (We're a little here to judge.)" },
      { title: '📅 Monday. Fresh start.', body: "New week, new papers. What will you learn this week? Hopefully more than last week." },
      { title: '🗓️ Week recap.',          body: "Your reading activity from last week is in. Whether it's good news or not depends entirely on you." },
    ]
    const msg = pick(messages)
    await Notifications.scheduleNotificationAsync({
      content: { ...msg, data: { screen: 'library' } },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour:    10,
        minute:  0,
      },
    })
  } catch (e) {
    console.log('[notifications] scheduleWeeklyDigest failed:', e)
  }
}