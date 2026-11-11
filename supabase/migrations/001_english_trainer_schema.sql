-- English Trainer: Konten (Nutzername + Passwort) und Lernstand je Nutzer.
-- Konten legt nur die Edge Function "accounts" an (erstes Konto = Verwalter, danach nur durch Verwalter).
-- Angewendet auf das Supabase-Projekt am 2026-11-11.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,19}$'),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ein Dokument je Nutzer und Name (progress, vocab-A1-ed, …); body = { v, json, … } wie im claude.ai-Speicher.
create table public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[a-z][A-Za-z0-9-]{0,40}$'),
  body jsonb not null check (pg_column_size(body) < 4000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

-- Interner Merker (z. B. „erstes Konto angelegt“); nur die Edge Function (service role) greift zu.
create table public.app_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.docs enable row level security;
alter table public.app_meta enable row level security;

create or replace function public.docs_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger docs_touch before insert or update on public.docs
for each row execute function public.docs_touch();

-- Rechte: angemeldete Nutzer lesen ihr eigenes Profil und lesen/schreiben ihre eigenen Dokumente.
-- Schreiben nur mit Profil (ein Konto ohne Profil, z. B. über die offene Registrierung der Auth-API, kann nichts speichern).
revoke all on public.profiles, public.docs, public.app_meta from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.docs to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy docs_select_own on public.docs for select to authenticated
  using (user_id = (select auth.uid()));

create policy docs_insert_own on public.docs for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.user_id = (select auth.uid())));

create policy docs_update_own on public.docs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.user_id = (select auth.uid())));
