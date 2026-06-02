create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  event_type text not null,
  recipient_email text not null,
  subject text not null,
  resource_type text,
  resource_id uuid,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_workspace_id_idx on public.email_log(workspace_id);
create index if not exists email_log_event_type_idx on public.email_log(event_type);
create index if not exists email_log_created_at_idx on public.email_log(created_at desc);

alter table public.email_log enable row level security;

create policy "ws_select_email_log" on public.email_log
  for select using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

grant select, insert, update, delete on public.email_log to authenticated;
grant select, insert, update, delete on public.email_log to service_role;
