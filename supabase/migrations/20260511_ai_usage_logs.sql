-- ============================================================
-- AI usage logs: plan enforcement and cost visibility
-- ============================================================

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_workspace_created on ai_usage_logs(workspace_id, created_at desc);

alter table ai_usage_logs enable row level security;

create policy "ai_usage_logs_select" on ai_usage_logs for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy "ai_usage_logs_insert" on ai_usage_logs for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
