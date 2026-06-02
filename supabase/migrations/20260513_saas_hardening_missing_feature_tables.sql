-- SaaS hardening: create feature tables that the app/schema already references.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  mentions jsonb not null default '[]'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_workspace_resource on comments(workspace_id, resource_type, resource_id, created_at);

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade unique,
  signer_name text not null,
  signer_email text,
  signed_at timestamptz not null default now(),
  svg_data text not null,
  ip_address text
);

create index if not exists idx_signatures_contract on signatures(contract_id);

create table if not exists permit_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  stage text not null,
  status text not null default 'a_faire',
  deadline date,
  docs jsonb not null default '[]'::jsonb,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, project_id, stage)
);

create index if not exists idx_permit_stages_workspace_project on permit_stages(workspace_id, project_id);

create table if not exists subcontractors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  trade text,
  phone text,
  email text,
  address text,
  cnss text,
  rib text,
  rating integer,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subcontractors_workspace on subcontractors(workspace_id);

create table if not exists moodboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  description text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_moodboards_workspace on moodboards(workspace_id);
create index if not exists idx_moodboards_client on moodboards(client_id);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_workspace_user on push_subscriptions(workspace_id, user_id);

alter table comments enable row level security;
alter table signatures enable row level security;
alter table permit_stages enable row level security;
alter table subcontractors enable row level security;
alter table moodboards enable row level security;
alter table push_subscriptions enable row level security;

-- Comments: all workspace members can read/create, authors/admins can delete.
drop policy if exists "comments_select" on comments;
drop policy if exists "comments_insert" on comments;
drop policy if exists "comments_delete" on comments;

create policy "comments_select" on comments for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy "comments_insert" on comments for insert with check (
  author_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create policy "comments_delete" on comments for delete using (
  author_id = auth.uid()
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

-- Signatures are readable through the linked contract. Public portal writes use service role.
drop policy if exists "signatures_select" on signatures;
create policy "signatures_select" on signatures for select using (
  exists (
    select 1
    from contracts c
    join workspace_members wm on wm.workspace_id = c.workspace_id
    where c.id = signatures.contract_id
      and wm.user_id = auth.uid()
  )
);

-- Standard workspace-scoped role policies for operational feature tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['permit_stages', 'subcontractors', 'moodboards', 'push_subscriptions']
  loop
    execute format('drop policy if exists %I on %I', table_name || '_select', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_insert', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_update', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_delete', table_name);

    execute format(
      'create policy %I on %I for select using (
        workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
      )',
      table_name || '_select',
      table_name
    );

    execute format(
      'create policy %I on %I for insert with check (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'', ''member'')
        )
      )',
      table_name || '_insert',
      table_name
    );

    execute format(
      'create policy %I on %I for update using (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'', ''member'')
        )
      )',
      table_name || '_update',
      table_name
    );

    execute format(
      'create policy %I on %I for delete using (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'')
        )
      )',
      table_name || '_delete',
      table_name
    );
  end loop;
end $$;

-- Push subscriptions are device credentials. Users can only manage their own.
drop policy if exists push_subscriptions_select on push_subscriptions;
drop policy if exists push_subscriptions_insert on push_subscriptions;
drop policy if exists push_subscriptions_update on push_subscriptions;
drop policy if exists push_subscriptions_delete on push_subscriptions;

create policy push_subscriptions_select on push_subscriptions for select using (
  user_id = auth.uid()
  and workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy push_subscriptions_insert on push_subscriptions for insert with check (
  user_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create policy push_subscriptions_update on push_subscriptions for update using (
  user_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
) with check (
  user_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create policy push_subscriptions_delete on push_subscriptions for delete using (
  user_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
