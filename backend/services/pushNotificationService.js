/**
 * pushNotificationService.js — Backend Node.js
 *
 * Invia notifiche push tramite Expo Push API (per app Expo)
 * e Firebase Cloud Messaging (FCM) per app native.
 *
 * Setup Expo Push:
 *   npm install expo-server-sdk
 *
 * Setup FCM (opzionale, per app bare/native):
 *   npm install firebase-admin
 *
 * Come funziona:
 *   1. Il dispositivo mobile registra il push token (vedi mobile/src/lib/notifications.ts)
 *   2. Il token viene salvato in profiles.push_token su Supabase
 *   3. Il backend recupera il token e lo usa per inviare notifiche
 *
 * Esempi d'uso:
 *   // Nuovo ordine
 *   await pushService.sendToUser(userId, {
 *     title: '📦 Ordine confermato',
 *     body:  'Il tuo ordine #123 è stato confermato',
 *     data:  { type: 'order', orderId: '123' }
 *   })
 *
 *   // Notifica broadcast a tutti gli utenti premium
 *   await pushService.sendToUsers(premiumUserIds, {
 *     title: '🎉 Nuova funzionalità disponibile',
 *     body:  'Scopri le novità nella tua dashboard'
 *   })
 */

import { Expo }    from 'expo-server-sdk'
import supabase    from '../lib/supabase.js'
import logger      from '../lib/logger.js'

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })

// ── Tipi notifica ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} PushMessage
 * @property {string} title           - Titolo della notifica
 * @property {string} body            - Corpo del messaggio
 * @property {Object} [data]          - Payload dati per il client
 * @property {string} [sound]         - Suono ('default' o nome file)
 * @property {number} [badge]         - Numero badge iOS
 * @property {string} [channelId]     - Android notification channel
 * @property {number} [ttl]           - Time-to-live in secondi
 * @property {string} [priority]      - 'default' | 'normal' | 'high'
 */

// ── Recupero token da Supabase ────────────────────────────────────────────

/**
 * Recupera il push token di un singolo utente.
 */
async function getUserToken(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single()

  if (error || !data?.push_token) return null
  return data.push_token
}

/**
 * Recupera i push token di più utenti (filtra null e token non validi).
 */
async function getUserTokens(userIds) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null)

  if (error) throw new Error(error.message)

  return data
    .filter(p => p.push_token && Expo.isExpoPushToken(p.push_token))
    .map(p => ({ userId: p.id, token: p.push_token }))
}

// ── Invio notifiche ───────────────────────────────────────────────────────

/**
 * Invia una notifica push a un singolo utente.
 *
 * @param {string} userId
 * @param {PushMessage} message
 * @returns {Promise<{sent: boolean, ticketId?: string, error?: string}>}
 */
export async function sendToUser(userId, message) {
  const token = await getUserToken(userId)

  if (!token) {
    logger.warn('Push token non trovato', { userId })
    return { sent: false, error: 'Token non trovato' }
  }

  if (!Expo.isExpoPushToken(token)) {
    logger.warn('Token non valido', { userId, token: token.slice(0, 20) })
    return { sent: false, error: 'Token non valido' }
  }

  const messages = [{
    to:        token,
    sound:     message.sound     ?? 'default',
    title:     message.title,
    body:      message.body,
    data:      message.data      ?? {},
    badge:     message.badge,
    channelId: message.channelId ?? 'default',
    priority:  message.priority  ?? 'high',
    ttl:       message.ttl       ?? 3600,
  }]

  const chunks = expo.chunkPushNotifications(messages)

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk)
      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          logger.info('Push inviata', { userId, ticketId: ticket.id })
          return { sent: true, ticketId: ticket.id }
        } else {
          logger.error('Push fallita', { userId, error: ticket.message })
          return { sent: false, error: ticket.message }
        }
      }
    } catch (err) {
      logger.error('Expo push error', { userId, error: err.message })
      return { sent: false, error: err.message }
    }
  }

  return { sent: false, error: 'Nessun chunk inviato' }
}

/**
 * Invia notifiche push a più utenti (batch, max 100 per chunk).
 * Gestisce token non validi e rimozione automatica da DB.
 *
 * @param {string[]} userIds
 * @param {PushMessage} message
 * @returns {Promise<{sent: number, failed: number, invalid: number}>}
 */
export async function sendToUsers(userIds, message) {
  const tokens = await getUserTokens(userIds)

  if (tokens.length === 0) {
    logger.warn('Nessun token valido per batch push', { count: userIds.length })
    return { sent: 0, failed: 0, invalid: userIds.length }
  }

  const messages = tokens.map(({ token }) => ({
    to:        token,
    sound:     message.sound     ?? 'default',
    title:     message.title,
    body:      message.body,
    data:      message.data      ?? {},
    channelId: message.channelId ?? 'default',
    priority:  message.priority  ?? 'high',
    ttl:       message.ttl       ?? 3600,
  }))

  const chunks  = expo.chunkPushNotifications(messages)
  let sent = 0, failed = 0, invalid = 0
  const tokensToRemove = []

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk)

      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent++
        } else {
          failed++
          // DeviceNotRegistered → token scaduto, rimuovilo dal DB
          if (ticket.details?.error === 'DeviceNotRegistered') {
            tokensToRemove.push(tokens[i].token)
            invalid++
          }
          logger.warn('Push ticket fallito', { error: ticket.message })
        }
      })
    } catch (err) {
      logger.error('Chunk push fallito', { error: err.message })
      failed += chunk.length
    }
  }

  // Rimuovi token non validi per mantenere il DB pulito
  if (tokensToRemove.length > 0) {
    await supabase
      .from('profiles')
      .update({ push_token: null })
      .in('push_token', tokensToRemove)

    logger.info('Token scaduti rimossi', { count: tokensToRemove.length })
  }

  logger.info('Batch push completato', { sent, failed, invalid, total: tokens.length })
  return { sent, failed, invalid }
}

/**
 * Invia notifica push a TUTTI gli utenti con token valido.
 * Usa solo per comunicazioni importanti (es. manutenzione, emergenze).
 */
export async function sendToAll(message) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .not('push_token', 'is', null)

  if (error) throw new Error(error.message)

  const userIds = data.map(p => p.id)
  logger.info('Invio push broadcast', { recipients: userIds.length })

  return sendToUsers(userIds, message)
}

// ── Route Express per notifiche ───────────────────────────────────────────

import express from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const notificationsRouter = express.Router()

/**
 * POST /notifications/send
 * Invia notifica a un utente specifico (solo admin).
 */
notificationsRouter.post('/send', requireAuth, requireRole('admin'), async (req, res) => {
  const { userId, title, body, data: payload } = req.body

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title e body obbligatori' })
  }

  try {
    const result = await sendToUser(userId, { title, body, data: payload })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /notifications/broadcast
 * Broadcast a tutti gli utenti (solo admin).
 */
notificationsRouter.post('/broadcast', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, body, data: payload } = req.body

  if (!title || !body) {
    return res.status(400).json({ error: 'title e body obbligatori' })
  }

  try {
    const result = await sendToAll({ title, body, data: payload })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
