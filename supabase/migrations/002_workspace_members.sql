-- ─── Workspace members + invites ─────────────────────────────────────────────

create type workspace_member_role as enum ('owner', 'admin', 'member', 'viewer');
create type invite_status as enum ('pending', 'accepted', 'revoked');

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_member_role not null default 'member',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_member_role not null default 'member',
  token text not null unique,
  invited_by uuid not null references auth.users(id),
  status invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index on workspace_members (workspace_id);
create index on workspace_members (user_id);
create index on workspace_invites (token);
create index on workspace_invites (workspace_id);
create index on workspace_invites (email);

-- ─── Backfill: insert all current workspace owners as members ─────────────────

insert into workspace_members (workspace_id, user_id, role, invited_by)
select id, owner_id, 'owner', owner_id
from workspaces
on conflict (workspace_id, user_id) do nothing;

-- ─── Update trigger to also insert owner as member on signup ─────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  returning id into v_workspace_id;

  insert into public.firm_profile (workspace_id)
  values (v_workspace_id);

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (v_workspace_id, new.id, 'owner', new.id);

  return new;
end;
$$;

-- ─── RLS on new tables ───────────────────────────────────────────────────────

alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;

-- Helper: bypasses RLS to avoid infinite recursion on workspace_members self-lookup
create or replace function public.get_my_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

-- workspace_members: visible to all members of that workspace
-- Uses security definer function to avoid infinite recursion
create policy "wm_select" on workspace_members for select using (
  workspace_id in (select public.get_my_workspace_ids())
);
create policy "wm_insert" on workspace_members for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "wm_update" on workspace_members for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "wm_delete" on workspace_members for delete using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- workspace_invites: workspace admins/owners manage, anyone can read by token
create policy "wi_select_member" on workspace_invites for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "wi_select_token" on workspace_invites for select using (true);
create policy "wi_insert" on workspace_invites for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);
create policy "wi_update" on workspace_invites for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
  or accepted_by = auth.uid()
);
create policy "wi_delete" on workspace_invites for delete using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- ─── Atomic RLS policy migration: owner_id → workspace_members ───────────────
-- Drop all old policies, replace with workspace_members lookup.
-- Keeping owner_id check via workspace_members (owner is always a member).

-- ── firm_profile ──
drop policy "firm_profile_select" on firm_profile;
drop policy "firm_profile_insert" on firm_profile;
drop policy "firm_profile_update" on firm_profile;

create policy "firm_profile_select" on firm_profile for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "firm_profile_insert" on firm_profile for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);
create policy "firm_profile_update" on firm_profile for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- ── workspaces ──
drop policy "workspaces_select" on workspaces;
drop policy "workspaces_insert" on workspaces;
drop policy "workspaces_update" on workspaces;

create policy "workspaces_select" on workspaces for select using (
  id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspaces_insert" on workspaces for insert with check (owner_id = auth.uid());
create policy "workspaces_update" on workspaces for update using (
  id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner')
);

-- ── clients ──
drop policy "clients_select" on clients;
drop policy "clients_insert" on clients;
drop policy "clients_update" on clients;
drop policy "clients_delete" on clients;

create policy "clients_select" on clients for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "clients_insert" on clients for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "clients_update" on clients for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "clients_delete" on clients for delete using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- ── projects ──
drop policy "projects_select" on projects;
drop policy "projects_insert" on projects;
drop policy "projects_update" on projects;
drop policy "projects_delete" on projects;

create policy "projects_select" on projects for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "projects_insert" on projects for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "projects_update" on projects for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "projects_delete" on projects for delete using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- ── contracts ──
drop policy "contracts_select" on contracts;
drop policy "contracts_insert" on contracts;
drop policy "contracts_update" on contracts;

create policy "contracts_select" on contracts for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "contracts_insert" on contracts for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "contracts_update" on contracts for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);

-- ── files ──
drop policy "files_select" on files;
drop policy "files_insert" on files;
drop policy "files_update" on files;
drop policy "files_delete" on files;

create policy "files_select" on files for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "files_insert" on files for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "files_update" on files for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "files_delete" on files for delete using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);

-- ── share_links ──
drop policy "share_links_select_owner" on share_links;
drop policy "share_links_insert" on share_links;
drop policy "share_links_update" on share_links;

create policy "share_links_select_owner" on share_links for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "share_links_insert" on share_links for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);
create policy "share_links_update" on share_links for update using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
);

-- ── activity_log ──
drop policy "activity_log_select" on activity_log;
drop policy "activity_log_insert" on activity_log;

create policy "activity_log_select" on activity_log for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "activity_log_insert" on activity_log for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ─── Storage policies: update to use workspace_members ───────────────────────

drop policy "storage_select" on storage.objects;
drop policy "storage_insert" on storage.objects;
drop policy "storage_delete" on storage.objects;

create policy "storage_select" on storage.objects for select
  using (
    bucket_id = 'project-files' and
    auth.uid() is not null and
    (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
    )
  );

create policy "storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'project-files' and
    auth.uid() is not null and
    (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
        and role in ('owner', 'admin', 'member')
    )
  );

create policy "storage_delete" on storage.objects for delete
  using (
    bucket_id = 'project-files' and
    auth.uid() is not null and
    (storage.foldername(name))[1] in (
      select workspace_id::text from workspace_members where user_id = auth.uid()
        and role in ('owner', 'admin', 'member')
    )
  );

-- ─── Additional tables (create if not already present from dashboard) ─────────

create table if not exists devis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid not null references clients(id),
  number text not null,
  title text not null,
  status text not null default 'brouillon',
  items jsonb not null default '[]',
  subtotal_centimes bigint not null default 0,
  tva_rate numeric not null default 20.00,
  tva_centimes bigint not null default 0,
  total_centimes bigint not null default 0,
  notes text,
  valid_until date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists factures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid not null references clients(id),
  devis_id uuid references devis(id) on delete set null,
  number text not null,
  title text not null,
  status text not null default 'brouillon',
  items jsonb not null default '[]',
  subtotal_centimes bigint not null default 0,
  tva_rate numeric not null default 20.00,
  tva_centimes bigint not null default 0,
  total_centimes bigint not null default 0,
  notes text,
  due_date date,
  paid_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  visit_date date not null,
  weather text,
  attendees text,
  observations jsonb not null default '[]',
  summary text,
  ai_generated boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'moyenne',
  status text not null default 'a_faire',
  metadata jsonb not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on new tables if not already enabled
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'devis'
  ) then
    alter table devis enable row level security;
    create policy "devis_select" on devis for select using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    );
    create policy "devis_insert" on devis for insert with check (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "devis_update" on devis for update using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "devis_delete" on devis for delete using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
    );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'factures'
  ) then
    alter table factures enable row level security;
    create policy "factures_select" on factures for select using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    );
    create policy "factures_insert" on factures for insert with check (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "factures_update" on factures for update using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "factures_delete" on factures for delete using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
    );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'site_visits'
  ) then
    alter table site_visits enable row level security;
    create policy "site_visits_select" on site_visits for select using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    );
    create policy "site_visits_insert" on site_visits for insert with check (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "site_visits_update" on site_visits for update using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "site_visits_delete" on site_visits for delete using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'tasks'
  ) then
    alter table tasks enable row level security;
    create policy "tasks_select" on tasks for select using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    );
    create policy "tasks_insert" on tasks for insert with check (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "tasks_update" on tasks for update using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
    create policy "tasks_delete" on tasks for delete using (
      workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin', 'member'))
    );
  end if;
end;
$$;

-- Indexes on new tables
create index if not exists idx_devis_workspace on devis (workspace_id);
create index if not exists idx_factures_workspace on factures (workspace_id);
create index if not exists idx_site_visits_workspace on site_visits (workspace_id);
create index if not exists idx_site_visits_project on site_visits (project_id);
create index if not exists idx_tasks_workspace on tasks (workspace_id);
create index if not exists idx_tasks_project on tasks (project_id);
create index if not exists idx_tasks_assigned_to on tasks (assigned_to);
