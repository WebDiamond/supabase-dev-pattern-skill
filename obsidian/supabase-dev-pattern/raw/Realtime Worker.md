---
tags: [raw, backend, realtime]
source: backend/workers/realtimeWorker.js
---

```javascript
import { createClient } from '@supabase/supabase-js'
import logger           from '../lib/logger.js'

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

  return () => supabase.removeChannel(channel)
}
```

→ [[Realtime]] per la spiegazione
