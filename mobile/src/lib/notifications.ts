/**
 * notifications.ts — Mobile (Expo)
 *
 * Gestione completa notifiche push:
 * - Registrazione token + salvataggio Supabase
 * - Handler foreground/background
 * - Navigazione da tap notifica
 * - Notifiche locali e schedulate
 * - Canali Android
 */

import { useEffect, useRef }  from 'react'
import * as Notifications     from 'expo-notifications'
import * as Device            from 'expo-device'
import { Platform }           from 'react-native'
import { router }             from 'expo-router'
import { supabase }           from './supabase'

// Comportamento notifiche in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { type } = notification.request.content.data ?? {}
    if (type === 'chat_message') {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: true }
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }
  },
})

// ── Canali Android ────────────────────────────────────────────────────────

export async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return
  await Promise.all([
    Notifications.setNotificationChannelAsync('default', {
      name: 'Notifiche generali', importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#6351F5', sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('orders', {
      name: 'Ordini e pagamenti', importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100], lightColor: '#22C55E', sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('chat', {
      name: 'Messaggi', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('marketing', {
      name: 'Promozioni', importance: Notifications.AndroidImportance.LOW, sound: undefined,
    }),
  ])
}

// ── Registrazione token ───────────────────────────────────────────────────

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Richiede dispositivo fisico')
    return null
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  const finalStatus = existing !== 'granted'
    ? (await Notifications.requestPermissionsAsync()).status
    : existing

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permesso negato')
    return null
  }

  await setupAndroidChannels()

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  })

  await supabase.from('profiles').update({ push_token: token }).eq('id', userId)
  return token
}

export async function unregisterPushNotifications(userId: string) {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId)
  await Notifications.setBadgeCountAsync(0)
}

// ── Navigazione da tap notifica ───────────────────────────────────────────

export function handleNotificationNavigation(notification: Notifications.Notification) {
  const data = notification.request.content.data ?? {}
  switch (data.type) {
    case 'order':   router.push({ pathname: '/(app)/orders/[id]',  params: { id: data.orderId } }); break
    case 'message': router.push({ pathname: '/(app)/chat/[roomId]', params: { roomId: data.roomId } }); break
    case 'payment': router.push('/(app)/payments'); break
    case 'promo':   if (data.url) router.push(data.url as string); break
    default:        router.push('/(tabs)/home')
  }
}

// ── Hook principale ───────────────────────────────────────────────────────

/**
 * usePushNotifications — usa nel root layout dopo il login.
 *
 *   const { expoPushToken } = usePushNotifications(user?.id)
 */
export function usePushNotifications(userId?: string) {
  const tokenRef         = useRef<string | null>(null)
  const foregroundSubRef = useRef<Notifications.Subscription>()
  const responseSubRef   = useRef<Notifications.Subscription>()

  useEffect(() => {
    if (!userId) return

    registerForPushNotifications(userId).then(t => { tokenRef.current = t })

    foregroundSubRef.current = Notifications.addNotificationReceivedListener(
      n => console.info('[Push] Foreground:', n.request.content.title)
    )

    responseSubRef.current = Notifications.addNotificationResponseReceivedListener(
      r => handleNotificationNavigation(r.notification)
    )

    return () => {
      foregroundSubRef.current?.remove()
      responseSubRef.current?.remove()
    }
  }, [userId])

  return { expoPushToken: tokenRef.current }
}

// ── Notifiche locali ──────────────────────────────────────────────────────

export async function showLocalNotification({
  title, body, data = {}, badge, channelId = 'default',
}: { title: string; body: string; data?: Record<string, unknown>; badge?: number; channelId?: string }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title, body, data, badge, sound: 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: null,
  })
}

export async function scheduleLocalNotification({
  title, body, data = {}, date, channelId = 'default',
}: { title: string; body: string; data?: Record<string, unknown>; date: Date; channelId?: string }) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default', ...(Platform.OS === 'android' && { channelId }) },
    trigger: { date },
  })
}

export async function cancelScheduledNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id)
}

export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync()
  await Notifications.setBadgeCountAsync(0)
}
