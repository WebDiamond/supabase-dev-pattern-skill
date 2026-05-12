-- ============================================================
-- RLS POLICIES — Supabase Dev Pattern
-- Eseguire dopo schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
alter table profiles enable row level security;

create policy "Profili pubblici in lettura"
  on profiles for select using (true);

create policy "Utente aggiorna il proprio profilo"
  on profiles for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- POSTS
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- STRIPE — solo lettura per l'utente, scrittura solo via backend
-- ------------------------------------------------------------
alter table stripe_customers enable row level security;
alter table orders           enable row level security;
alter table subscriptions    enable row level security;

create policy "Utente vede i propri dati Stripe"
  on stripe_customers for select using (auth.uid() = user_id);

create policy "Utente vede i propri ordini"
  on orders for select using (auth.uid() = user_id);

create policy "Utente vede i propri abbonamenti"
  on subscriptions for select using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE su stripe_customers, orders, subscriptions
-- solo tramite backend con SERVICE_ROLE_KEY o Edge Function.
-- Non creare policy di scrittura per queste tabelle lato client.

-- ------------------------------------------------------------
-- STORAGE — bucket avatars
-- ------------------------------------------------------------
alter table storage.objects enable row level security;

create policy "Upload nella propria cartella"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar pubblici leggibili"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Elimina i propri file"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
