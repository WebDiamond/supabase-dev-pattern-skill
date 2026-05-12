// src/lib/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device        from 'expo-device'
import { supabase }       from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
})

export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.warn('Push notification richiedono dispositivo fisico')
    return null
  }

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') throw new Error('Permesso notifiche negato')

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  })).data

  // Salva token nel profilo — il backend lo usa per notifiche targetizzate
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId)

  return token
}
