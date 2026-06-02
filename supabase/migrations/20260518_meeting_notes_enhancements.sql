-- Meeting notes enhancements: type, attendees, duration, PV signature

alter table public.meeting_notes
  add column if not exists meeting_type       text    not null default 'reunion_client',
  add column if not exists attendees          jsonb   not null default '[]',
  add column if not exists duration_planned_minutes integer,
  add column if not exists duration_actual_minutes  integer,
  add column if not exists pv_signed_at       timestamptz,
  add column if not exists pv_signer_name     text,
  add column if not exists pv_svg_data        text;

-- Grants for new columns (no-op since they inherit table-level grants, but explicit for clarity)
grant select, insert, update, delete on public.meeting_notes to authenticated;
grant select, insert, update, delete on public.meeting_notes to service_role;
