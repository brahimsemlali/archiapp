-- ============================================================
-- Invoice status events: audit trail for facture lifecycle
-- ============================================================

create table if not exists invoice_status_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  facture_id uuid not null references factures(id) on delete cascade,
  previous_status text,
  next_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  source text not null default 'app',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_status_events_workspace on invoice_status_events(workspace_id, created_at desc);
create index if not exists idx_invoice_status_events_facture on invoice_status_events(facture_id, created_at desc);

alter table invoice_status_events enable row level security;

create policy "invoice_status_events_select" on invoice_status_events for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy "invoice_status_events_insert" on invoice_status_events for insert with check (
  workspace_id in (
    select workspace_id
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  )
);
