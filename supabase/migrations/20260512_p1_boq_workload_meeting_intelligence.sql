-- P1 architecture operations
-- Adds BOQ/material tracking, AI meeting notes, and voice-note task conversion structure.

create table if not exists boq_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  item_name text not null,
  category text,
  quantity numeric not null default 0,
  unit text not null default 'u',
  estimated_cost_centimes bigint not null default 0,
  actual_cost_centimes bigint not null default 0,
  procurement_status text not null default 'not_started',
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boq_items_procurement_status_check check (
    procurement_status in ('not_started', 'requested', 'ordered', 'delivered', 'installed', 'cancelled')
  )
);

create index if not exists idx_boq_items_workspace on boq_items(workspace_id);
create index if not exists idx_boq_items_project on boq_items(project_id);
create index if not exists idx_boq_items_supplier on boq_items(supplier_id);
create index if not exists idx_boq_items_status on boq_items(workspace_id, procurement_status);

alter table boq_items enable row level security;

drop policy if exists "boq_items_select" on boq_items;
drop policy if exists "boq_items_insert" on boq_items;
drop policy if exists "boq_items_update" on boq_items;
drop policy if exists "boq_items_delete" on boq_items;

create policy "boq_items_select" on boq_items for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "boq_items_insert" on boq_items for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "boq_items_update" on boq_items for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "boq_items_delete" on boq_items for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

create table if not exists meeting_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  meeting_date date not null default current_date,
  raw_notes text not null,
  summary text,
  decisions jsonb not null default '[]',
  risks jsonb not null default '[]',
  extracted_tasks jsonb not null default '[]',
  ai_generated boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meeting_notes_workspace on meeting_notes(workspace_id);
create index if not exists idx_meeting_notes_project on meeting_notes(project_id, meeting_date desc);

alter table meeting_notes enable row level security;

drop policy if exists "meeting_notes_select" on meeting_notes;
drop policy if exists "meeting_notes_insert" on meeting_notes;
drop policy if exists "meeting_notes_update" on meeting_notes;
drop policy if exists "meeting_notes_delete" on meeting_notes;

create policy "meeting_notes_select" on meeting_notes for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "meeting_notes_insert" on meeting_notes for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "meeting_notes_update" on meeting_notes for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "meeting_notes_delete" on meeting_notes for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

create table if not exists voice_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  audio_url text,
  audio_path text,
  transcript text,
  task_payload jsonb not null default '{}',
  status text not null default 'draft',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_notes_status_check check (status in ('draft', 'transcribed', 'converted', 'archived'))
);

create index if not exists idx_voice_notes_workspace on voice_notes(workspace_id);
create index if not exists idx_voice_notes_project on voice_notes(project_id);
create index if not exists idx_voice_notes_created_by on voice_notes(created_by);

alter table voice_notes enable row level security;

drop policy if exists "voice_notes_select" on voice_notes;
drop policy if exists "voice_notes_insert" on voice_notes;
drop policy if exists "voice_notes_update" on voice_notes;
drop policy if exists "voice_notes_delete" on voice_notes;

create policy "voice_notes_select" on voice_notes for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "voice_notes_insert" on voice_notes for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "voice_notes_update" on voice_notes for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);
create policy "voice_notes_delete" on voice_notes for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);
