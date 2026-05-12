// src/workers/realtimeWorker.js
// Worker server-side che ascolta cambiamenti nel DB e triggera logica custom
import { createClient } from '@supabase/supabase-js'
import logger           from '../lib/logger.js'

// Per Realtime usare la ANON_KEY (non service role)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export function startOrdersListener(onNewOrder) {
  const channel = supabase.channel('orders-listener')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          logger.info('Nuovo ordine', { orderId: payload.new.id })
          try   { await onNewOrder(payload.new) }
          catch (err) { logger.error('Errore ordine', { error: err.message }) }
        })
    .subscribe((status) => logger.info('Realtime status:', status))

  // Restituisce funzione di cleanup
  return () => supabase.removeChannel(channel)
}
