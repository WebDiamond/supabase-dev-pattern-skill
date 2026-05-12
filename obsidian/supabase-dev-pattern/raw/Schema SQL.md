---
tags: [raw, sql, schema]
source: shared/sql/schema.sql
---

```sql
-- ============================================================
-- SCHEMA CONDIVISO — Supabase Dev Pattern
-- Eseguire in ordine su: Supabase Dashboard → SQL Editor
-- ============================================================

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

create table posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  title      text not null check (char_length(title) between 3 and 200),
  content    text,
  published  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table stripe_customers (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references profiles(id) on delete cascade not null unique,
  stripe_customer_id text not null unique,
  created_at         timestamptz default now()
);

create table orders (
  id                    uuid default gen_random_uuid() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  stripe_payment_intent text unique,
  stripe_session_id     text unique,
  amount                integer not null,
  currency              text default 'eur',
  status                text default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  metadata              jsonb default '{}',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table subscriptions (
  id                         uuid default gen_random_uuid() primary key,
  user_id                    uuid references profiles(id) on delete cascade not null,
  stripe_subscription_id     text unique not null,
  stripe_price_id            text not null,
  status                     text not null
    check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start       timestamptz,
  current_period_end         timestamptz,
  cancel_at_period_end       boolean default false,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table subscriptions;
```

→ [[Database - Schema]] per la spiegazione
