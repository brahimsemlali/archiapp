-- ============================================================
-- Prospects / Sales pipeline
-- ============================================================
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  source text, -- referral | linkedin | portfolio | cold | other
  type text default 'particulier', -- particulier | societe
  stage text not null default 'nouveau', -- nouveau | rdv | proposition | negociation | gagne | perdu
  estimated_value_centimes bigint default 0,
  project_type text,
  notes text,
  lost_reason text,
  converted_client_id uuid references clients(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on prospects(workspace_id);
alter table prospects enable row level security;
create policy "ws_all" on prospects using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ============================================================
-- Supplier / Material catalog
-- ============================================================
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  category text, -- carrelage | sanitaire | menuiserie | peinture | electricite | plomberie | metal | verre | marbre | autre
  phone text,
  email text,
  address text,
  website text,
  notes text,
  rating smallint check (rating between 1 and 5),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index on suppliers(workspace_id);
alter table suppliers enable row level security;
create policy "ws_all" on suppliers using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  description text,
  unit text not null default 'm²', -- m² | ml | u | kg | forfait | heure
  unit_price_centimes bigint not null default 0,
  category text,
  reference text,
  last_updated date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index on catalog_items(workspace_id);
alter table catalog_items enable row level security;
create policy "ws_all" on catalog_items using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ============================================================
-- Templates (devis / checklist)
-- ============================================================
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null, -- devis | checklist | contract_clause
  name text not null,
  description text,
  content jsonb not null default '{}',
  is_global boolean default false, -- shared across workspace
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on templates(workspace_id);
alter table templates enable row level security;
create policy "ws_all" on templates using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ============================================================
-- Recurring invoices
-- ============================================================
create table if not exists recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  title text not null,
  items jsonb not null default '[]',
  subtotal_centimes bigint not null default 0,
  tva_rate numeric(5,2) not null default 20,
  tva_centimes bigint not null default 0,
  total_centimes bigint not null default 0,
  frequency text not null default 'monthly', -- monthly | quarterly | yearly
  next_date date not null,
  end_date date,
  auto_send boolean not null default false,
  active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now()
);
create index on recurring_invoices(workspace_id);
alter table recurring_invoices enable row level security;
create policy "ws_all" on recurring_invoices using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ============================================================
-- Payment reminders log
-- ============================================================
create table if not exists payment_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  facture_id uuid not null references factures(id) on delete cascade,
  sent_at timestamptz not null default now(),
  channel text not null default 'email', -- email | sms | whatsapp
  recipient text,
  message text,
  status text not null default 'sent' -- sent | failed
);
create index on payment_reminders(workspace_id);
create index on payment_reminders(facture_id);
alter table payment_reminders enable row level security;
create policy "ws_all" on payment_reminders using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
) with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- ============================================================
-- Portal messages (client <-> architect)
-- ============================================================
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  share_token text not null, -- links to share_links.token
  sender text not null, -- 'architect' | 'client'
  sender_name text,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on portal_messages(workspace_id);
create index on portal_messages(project_id);
alter table portal_messages enable row level security;
-- Architects read/write via workspace membership
create policy "ws_read" on portal_messages for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "ws_insert" on portal_messages for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
-- Portal (service role) inserts client messages — handled by API route with service client
