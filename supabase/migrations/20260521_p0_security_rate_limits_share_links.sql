-- P0 security hardening:
-- 1. Share tokens must not be listable through the Data API.
-- 2. Server-side rate limits need durable storage across serverless requests.

drop policy if exists "share_links_select_anon" on public.share_links;
drop policy if exists "share_links_select_owner" on public.share_links;
drop policy if exists "share_links_select_workspace_members" on public.share_links;

create policy "share_links_select_workspace_members"
  on public.share_links
  for select
  to authenticated
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_events_action_key_created
  on public.rate_limit_events(action, key, created_at desc);

alter table public.rate_limit_events enable row level security;

revoke all privileges on public.rate_limit_events from anon;
revoke all privileges on public.rate_limit_events from authenticated;
grant select, insert, delete on public.rate_limit_events to service_role;
