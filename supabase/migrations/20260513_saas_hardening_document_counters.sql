-- SaaS hardening: tenant-safe document numbering for devis/factures.

create table if not exists document_counters (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_type text not null,
  year integer not null,
  next_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, document_type, year),
  constraint document_counters_type_check check (document_type in ('devis', 'facture')),
  constraint document_counters_next_number_check check (next_number > 0)
);

alter table document_counters enable row level security;

drop policy if exists "document_counters_select" on document_counters;
drop policy if exists "document_counters_insert" on document_counters;
drop policy if exists "document_counters_update" on document_counters;

create policy "document_counters_select" on document_counters for select using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  )
);

create policy "document_counters_insert" on document_counters for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create policy "document_counters_update" on document_counters for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  )
);

create unique index if not exists devis_workspace_number_unique on devis(workspace_id, number);
create unique index if not exists factures_workspace_number_unique on factures(workspace_id, number);

create or replace function public.next_workspace_document_number(
  p_workspace_id uuid,
  p_document_type text,
  p_prefix text
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_number integer;
begin
  if p_document_type not in ('devis', 'facture') then
    raise exception 'Unsupported document type: %', p_document_type;
  end if;

  if not exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  ) then
    raise exception 'Not allowed to create document numbers for this workspace';
  end if;

  insert into document_counters (workspace_id, document_type, year, next_number)
  values (p_workspace_id, p_document_type, v_year, 2)
  on conflict (workspace_id, document_type, year)
  do update set
    next_number = document_counters.next_number + 1,
    updated_at = now()
  returning next_number - 1 into v_number;

  return p_prefix || '-' || v_year || '-' || lpad(v_number::text, 3, '0');
end;
$$;

revoke all on function public.next_workspace_document_number(uuid, text, text) from public;
grant execute on function public.next_workspace_document_number(uuid, text, text) to authenticated;
