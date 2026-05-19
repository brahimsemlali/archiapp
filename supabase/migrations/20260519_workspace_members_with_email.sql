-- RPC to fetch workspace members with email/name from auth.users in one query
-- Replaces N individual admin.getUserById calls in the settings page.
create or replace function get_workspace_members_with_email(p_workspace_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  full_name text
)
language sql security definer stable
as $$
  select
    wm.id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    au.email,
    (au.raw_user_meta_data->>'full_name')::text as full_name
  from workspace_members wm
  join auth.users au on au.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.joined_at asc;
$$;

-- Only workspace owners/admins should call this (RLS is enforced by the caller check)
revoke execute on function get_workspace_members_with_email(uuid) from public;
grant execute on function get_workspace_members_with_email(uuid) to service_role;
