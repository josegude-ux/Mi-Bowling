-- MI BOWLING · PROPUESTA SQL A1 · NO APLICADA A NINGUNA BASE DE DATOS.
-- Requiere un proyecto privado nuevo y autorización expresa antes de ejecución.
-- Public schema is API-exposed: keep RLS + grants in the same reviewed migration.
-- No automatic import or deletion of local legacy data.
create table if not exists public.bowling_player_documents (
  user_id uuid not null references auth.users(id),
  doc_type text not null check (doc_type in ('personal','league')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_type)
);
alter table public.bowling_player_documents enable row level security;
revoke all on table public.bowling_player_documents from public, anon, authenticated;
grant select, insert, update on table public.bowling_player_documents to authenticated;

-- No public or anon policies. Client-side profile IDs NEVER grant data access.
create policy "bowling_select_own"
on public.bowling_player_documents for select to authenticated
using ((select auth.uid()) = user_id and
  (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "bowling_insert_own"
on public.bowling_player_documents for insert to authenticated
with check ((select auth.uid()) = user_id and
  (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "bowling_update_own"
on public.bowling_player_documents for update to authenticated
using ((select auth.uid()) = user_id and
  (select auth.jwt()->>'is_anonymous') is distinct from 'true')
with check ((select auth.uid()) = user_id and
  (select auth.jwt()->>'is_anonymous') is distinct from 'true');

-- No DELETE policy or grant in A1. No accounts or records are created by this file.
-- Separate document kinds:
-- "personal": personal games, balls, pin statistics input and preferences.
-- "league": Liga Nacional actas/rosters held privately until a team ACL
-- is explicitly designed. It never modifies personal scoring automatically.
-- Never allow direct clients to set a different user_id or use a service key.
-- Before deployment: pgTAP/SQL policies allow and deny tests against
-- anon, authenticated owner A, and authenticated user B (all 3 operations).
-- This file is a review-only contract, not executed or added to migrations.
