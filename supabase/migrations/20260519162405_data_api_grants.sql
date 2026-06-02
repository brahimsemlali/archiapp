-- Explicit Data API grants for Supabase's public-schema exposure change.
--
-- RLS still controls row-level access. These grants only make tables visible to
-- PostgREST/supabase-js for authenticated app users and trusted server service
-- clients. Public portal/share pages in this app validate tokens server-side
-- with the service role, so do not grant broad table access to anon.

grant usage on schema public to authenticated, service_role;

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select
  on all sequences in schema public
  to authenticated, service_role;

alter default privileges in schema public
  revoke all on tables from anon;

alter default privileges in schema public
  revoke all on sequences from anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
