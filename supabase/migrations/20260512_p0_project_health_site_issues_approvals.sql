-- P0 hardening and architecture-specific operations
-- Adds first-class site issues, file approval workflow fields, and removes broad anonymous token reads.

-- File/client approval workflow for drawings and shared documents.
alter table files
  add column if not exists approval_status text not null default 'not_required',
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists approval_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'files_approval_status_check'
  ) then
    alter table files
      add constraint files_approval_status_check
      check (approval_status in ('not_required', 'pending', 'approved', 'rejected'));
  end if;
end;
$$;

create index if not exists idx_files_approval_status on files(workspace_id, approval_status);

-- Punch list / site issue tracking.
create table if not exists site_issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  site_visit_id uuid references site_visits(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  zone text,
  status text not null default 'open',
  priority text not null default 'medium',
  due_date date,
  photo_url text,
  photo_path text,
  resolved_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_issues_status_check check (status in ('open', 'in_progress', 'resolved')),
  constraint site_issues_priority_check check (priority in ('low', 'medium', 'high'))
);

create index if not exists idx_site_issues_workspace on site_issues(workspace_id);
create index if not exists idx_site_issues_project on site_issues(project_id);
create index if not exists idx_site_issues_visit on site_issues(site_visit_id);
create index if not exists idx_site_issues_assigned_to on site_issues(assigned_to);
create index if not exists idx_site_issues_status on site_issues(workspace_id, status);

alter table site_issues enable row level security;

drop policy if exists "site_issues_select" on site_issues;
drop policy if exists "site_issues_insert" on site_issues;
drop policy if exists "site_issues_update" on site_issues;
drop policy if exists "site_issues_delete" on site_issues;

create policy "site_issues_select" on site_issues for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "site_issues_insert" on site_issues for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "site_issues_update" on site_issues for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "site_issues_delete" on site_issues for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

-- Token pages use server-side service-role validation. Avoid exposing all token rows via the Data API.
drop policy if exists "share_links_select_anon" on share_links;
drop policy if exists "wi_select_token" on workspace_invites;
