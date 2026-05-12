---
tags: [realtime, supabase, websocket, postgres]
---

# Realtime

> Codice sorgente: [[Realtime Worker]]

## Come Funziona

Supabase Realtime ascolta i cambiamenti PostgreSQL (WAL) e li trasmette via WebSocket. Funziona sia lato client che lato server.

## Prerequisito: Abilitare Tabelle

```sql
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table subscriptions;
```

## Worker Server-side (Node.js)

```javascript
// IMPORTANTE: usa ANON_KEY, non SERVICE_ROLE_KEY per Realtime
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export function startOrdersListener(onNewOrder) {
  const channel = supabase.channel('orders-listener')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          try   { await onNewOrder(payload.new) }
          catch (err) { logger.error('Errore', { error: err.message }) }
        })
    .subscribe()

  return () => supabase.removeChannel(channel) // cleanup
}
```

## Listener Client-side (React/Expo)

```typescript
useEffect(() => {
  const channel = supabase.channel('posts-changes')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') addPost(payload.new)
          if (payload.eventType === 'UPDATE') updatePost(payload.new)
          if (payload.eventType === 'DELETE') removePost(payload.old.id)
        })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [userId])
```

## Tipi di Evento

| Evento | Quando |
|---|---|
| `INSERT` | Nuova riga inserita |
| `UPDATE` | Riga modificata |
| `DELETE` | Riga eliminata |
| `*` | Tutti gli eventi |

## Note Correlate

- [[Realtime Worker]] — codice sorgente completo
- [[Database - Schema]] — tabelle con realtime abilitato
