-- P2 differentiation: WhatsApp-ready prospect communication and follow-up tracking.
-- Existing prospects remain valid; these columns are optional and additive.

alter table public.prospects
  add column if not exists whatsapp_number text,
  add column if not exists follow_up_status text not null default 'none',
  add column if not exists next_follow_up_date date,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists communication_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prospects_follow_up_status_check'
  ) then
    alter table public.prospects
      add constraint prospects_follow_up_status_check
      check (follow_up_status in ('none', 'to_follow_up', 'sent', 'waiting_reply', 'closed'));
  end if;
end $$;

create index if not exists idx_prospects_workspace_follow_up
  on public.prospects(workspace_id, next_follow_up_date)
  where archived_at is null;
