-- Base time tracking table.
-- Must run before 20260508_task_features.sql, which adds/ensures task linkage.

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  date date not null,
  billable boolean not null default true,
  rate_centimes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_time_entries_workspace on time_entries(workspace_id);
create index if not exists idx_time_entries_project on time_entries(project_id);
create index if not exists idx_time_entries_user on time_entries(user_id);
create index if not exists idx_time_entries_date on time_entries(workspace_id, date desc);

alter table time_entries enable row level security;

drop policy if exists "time_entries_select" on time_entries;
drop policy if exists "time_entries_insert" on time_entries;
drop policy if exists "time_entries_update" on time_entries;
drop policy if exists "time_entries_delete" on time_entries;

create policy "time_entries_select" on time_entries for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy "time_entries_insert" on time_entries for insert with check (
  user_id = auth.uid()
  and workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create policy "time_entries_update" on time_entries for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and (
      time_entries.user_id = auth.uid()
      or role in ('owner', 'admin')
    )
  )
);

create policy "time_entries_delete" on time_entries for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and (
      time_entries.user_id = auth.uid()
      or role in ('owner', 'admin')
    )
  )
);
