-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type workspace_plan as enum ('solo', 'studio', 'agence');
create type profile_type as enum ('architect', 'decorator', 'studio', 'other');
create type client_type as enum ('particulier', 'societe');
create type project_type as enum ('villa', 'appartement', 'immeuble', 'commercial', 'renovation', 'amenagement', 'autre');
create type project_phase as enum ('esquisse', 'aps', 'apd', 'pc', 'dce', 'chantier', 'reception', 'termine');
create type project_status as enum ('actif', 'en_attente', 'suspendu', 'termine', 'archive');
create type contract_type as enum ('mission_complete', 'mission_partielle', 'etude_faisabilite', 'suivi_chantier', 'autre');
create type contract_status as enum ('brouillon', 'finalise', 'archive');
create type share_resource_type as enum ('file', 'folder');

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan workspace_plan not null default 'solo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table firm_profile (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  profile_type profile_type not null default 'architect',
  firm_name text,
  architect_name text,
  logo_url text,
  address text,
  phone text,
  email text,
  ice text,
  rc text,
  if_number text,
  cnss text,
  patente text,
  iban text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  type client_type not null,
  phone text,
  email text,
  address text,
  ice text,
  cin text,
  notes text,
  metadata jsonb not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id),
  title text not null,
  type project_type not null,
  address text,
  surface_m2 numeric,
  phase project_phase not null default 'esquisse',
  status project_status not null default 'actif',
  budget_estimate_centimes bigint,
  fees_centimes bigint,
  start_date date,
  target_end_date date,
  notes text,
  metadata jsonb not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id),
  client_id uuid not null references clients(id),
  type contract_type not null,
  title text not null,
  content_json jsonb,
  content_html text,
  ai_prompt text,
  ai_response_raw text,
  ai_model text,
  status contract_status not null default 'brouillon',
  version integer not null default 1,
  parent_contract_id uuid references contracts(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  folder text not null default 'Autre',
  filename text not null,
  storage_path text not null,
  size_bytes bigint not null,
  mime_type text not null,
  version integer not null default 1,
  parent_file_id uuid references files(id),
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  resource_type share_resource_type not null,
  resource_id uuid not null,
  token text not null unique,
  expires_at timestamptz,
  accessed_count integer not null default 0,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id),
  client_id uuid references clients(id),
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index on clients (workspace_id);
create index on projects (workspace_id);
create index on projects (client_id);
create index on contracts (workspace_id);
create index on contracts (project_id);
create index on files (workspace_id);
create index on files (project_id);
create index on share_links (token);
create index on activity_log (workspace_id, created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table workspaces enable row level security;
alter table firm_profile enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table contracts enable row level security;
alter table files enable row level security;
alter table share_links enable row level security;
alter table activity_log enable row level security;

-- Workspaces: owner only
create policy "workspaces_select" on workspaces for select using (owner_id = auth.uid());
create policy "workspaces_insert" on workspaces for insert with check (owner_id = auth.uid());
create policy "workspaces_update" on workspaces for update using (owner_id = auth.uid());

-- Generic workspace-scoped policy helper (for all business tables)
-- firm_profile
create policy "firm_profile_select" on firm_profile for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "firm_profile_insert" on firm_profile for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "firm_profile_update" on firm_profile for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- clients
create policy "clients_select" on clients for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "clients_insert" on clients for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "clients_update" on clients for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "clients_delete" on clients for delete using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- projects
create policy "projects_select" on projects for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "projects_insert" on projects for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "projects_update" on projects for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "projects_delete" on projects for delete using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- contracts
create policy "contracts_select" on contracts for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "contracts_insert" on contracts for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "contracts_update" on contracts for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- files
create policy "files_select" on files for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "files_insert" on files for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "files_update" on files for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "files_delete" on files for delete using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- share_links: workspace members + anonymous select by token
create policy "share_links_select_owner" on share_links for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "share_links_select_anon" on share_links for select using (true);
create policy "share_links_insert" on share_links for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "share_links_update" on share_links for update using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- activity_log
create policy "activity_log_select" on activity_log for select using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
create policy "activity_log_insert" on activity_log for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- ─── Auto-create workspace on signup ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.firm_profile (workspace_id)
  select id from public.workspaces where owner_id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
