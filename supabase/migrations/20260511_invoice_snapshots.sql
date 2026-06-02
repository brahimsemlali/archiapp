-- ============================================================
-- Invoice snapshots: immutable legal payload for sent factures
-- ============================================================

create table if not exists invoice_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  facture_id uuid not null references factures(id) on delete cascade,
  snapshot_type text not null default 'sent',
  number text not null,
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (facture_id, snapshot_type)
);

create index if not exists idx_invoice_snapshots_workspace on invoice_snapshots(workspace_id);
create index if not exists idx_invoice_snapshots_facture on invoice_snapshots(facture_id);

alter table invoice_snapshots enable row level security;

create policy "invoice_snapshots_select" on invoice_snapshots for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create policy "invoice_snapshots_insert" on invoice_snapshots for insert with check (
  workspace_id in (
    select workspace_id
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  )
);
