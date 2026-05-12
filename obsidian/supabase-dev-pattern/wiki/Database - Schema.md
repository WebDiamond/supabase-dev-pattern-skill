---
tags: [database, schema, supabase, sql]
---

# Database — Schema

> File sorgente: `shared/sql/schema.sql` → vedi [[Schema SQL]]

## Tabelle

### `profiles` — estende `auth.users`

```sql
create table profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique not null,
  bio        text,
  avatar_url text,
  push_token text,
  role       text default 'user' check (role in ('user', 'admin', 'moderator')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

- `id` è lo stesso UUID di `auth.users` — relazione 1:1
- `push_token` per notifiche push mobile
- `role` con 3 livelli: `user`, `admin`, `moderator`

### `posts`

```sql
create table posts (
  id        uuid default gen_random_uuid() primary key,
  user_id   uuid references profiles(id) on delete cascade not null,
  title     text not null check (char_length(title) between 3 and 200),
  content   text,
  published boolean default false,
  ...
);
```

### `stripe_customers` — relazione 1:1 utente ↔ customer Stripe

```sql
create table stripe_customers (
  user_id            uuid references profiles(id) on delete cascade not null unique,
  stripe_customer_id text not null unique,
  ...
);
```

### `orders` — pagamenti singoli

```sql
create table orders (
  stripe_payment_intent text unique,
  stripe_session_id     text unique,
  amount                integer not null,  -- in CENTESIMI
  currency              text default 'eur',
  status                text default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  metadata              jsonb default '{}',
  ...
);
```

### `subscriptions` — abbonamenti ricorrenti

```sql
create table subscriptions (
  stripe_subscription_id text unique not null,
  stripe_price_id        text not null,
  status                 text check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  ...
);
```

## Trigger `updated_at` automatico

Applicato su `posts`, `orders`, `subscriptions`. → Vedi [[Schema SQL]] per il codice completo.

## Realtime abilitato

```sql
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table subscriptions;
```

## Note Correlate

- [[Schema SQL]] — codice sorgente completo
- [[Database - RLS]] — politiche di sicurezza per queste tabelle
- [[Payments - Stripe Overview]] — come orders e subscriptions vengono usati
- [[Architettura]] — visione d'insieme
