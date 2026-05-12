---
tags: [database, rls, sicurezza, supabase]
---

# Database — Row Level Security (RLS)

> File sorgente: `shared/sql/rls.sql` → vedi [[RLS SQL]]
> Eseguire **dopo** `schema.sql`

## Principio

RLS filtra automaticamente le righe in base all'utente autenticato (`auth.uid()`). Il client può fare query senza `WHERE user_id = ?` — ci pensa Postgres.

## Profili

```sql
alter table profiles enable row level security;

create policy "Profili pubblici in lettura"
  on profiles for select using (true);

create policy "Utente aggiorna il proprio profilo"
  on profiles for update using (auth.uid() = id);
```

## Posts

```sql
alter table posts enable row level security;

create policy "Post pubblicati visibili a tutti"
  on posts for select
  using (published = true OR auth.uid() = user_id);

create policy "Crea i propri post"
  on posts for insert
  with check (auth.uid() = user_id);

create policy "Modifica i propri post"
  on posts for update
  using (auth.uid() = user_id);

create policy "Elimina i propri post"
  on posts for delete
  using (auth.uid() = user_id);
```

## Stripe — Solo Lettura per l'Utente

```sql
alter table stripe_customers enable row level security;
alter table orders           enable row level security;
alter table subscriptions    enable row level security;

create policy "Utente vede i propri dati Stripe"
  on stripe_customers for select using (auth.uid() = user_id);

create policy "Utente vede i propri ordini"
  on orders for select using (auth.uid() = user_id);

create policy "Utente vede i propri abbonamenti"
  on subscriptions for select using (auth.uid() = user_id);
```

> **IMPORTANTE**: Non creare policy di INSERT/UPDATE/DELETE per le tabelle Stripe lato client.
> Tutte le scritture passano solo dal backend con `SERVICE_ROLE_KEY` o da Edge Functions.

## Storage — Bucket Avatars

```sql
create policy "Upload nella propria cartella"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

## Regola d'Oro

| Tabella | Client (ANON_KEY) | Backend (SERVICE_ROLE_KEY) |
|---|---|---|
| profiles | SELECT, UPDATE (own) | tutti |
| posts | SELECT (pub/own), INSERT/UPDATE/DELETE (own) | tutti |
| orders | SELECT (own) | tutti |
| subscriptions | SELECT (own) | tutti |
| stripe_customers | SELECT (own) | tutti |

## Note Correlate

- [[RLS SQL]] — codice sorgente completo
- [[Database - Schema]] — definizione delle tabelle
- [[Architettura]] — dove viene usata SERVICE_ROLE_KEY
- [[Backend - Auth Middleware]] — verifica JWT lato Express
