-- Backfill older auth accounts that were created before workspace membership
-- creation was reliable. This keeps the app's invariant true:
-- every workspace has an owner membership and a firm profile, and every auth
-- user without any membership gets a default owned workspace.

insert into public.workspace_members (workspace_id, user_id, role, invited_by)
select w.id, w.owner_id, 'owner', w.owner_id
from public.workspaces w
where not exists (
  select 1
  from public.workspace_members wm
  where wm.workspace_id = w.id
    and wm.user_id = w.owner_id
)
on conflict (workspace_id, user_id) do nothing;

insert into public.firm_profile (workspace_id, firm_name)
select w.id, w.name
from public.workspaces w
where not exists (
  select 1
  from public.firm_profile fp
  where fp.workspace_id = w.id
)
on conflict (workspace_id) do nothing;

with orphan_auth_users as (
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(u.email, '@', 1), ''),
      'Cabinet'
    ) as workspace_name
  from auth.users u
  where not exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = u.id
  )
    and not exists (
      select 1
      from public.workspaces w
      where w.owner_id = u.id
    )
),
created_workspaces as (
  insert into public.workspaces (owner_id, name)
  select id, workspace_name
  from orphan_auth_users
  returning id, owner_id, name
)
insert into public.workspace_members (workspace_id, user_id, role, invited_by)
select id, owner_id, 'owner', owner_id
from created_workspaces
on conflict (workspace_id, user_id) do nothing;

insert into public.firm_profile (workspace_id, firm_name)
select w.id, w.name
from public.workspaces w
where not exists (
  select 1
  from public.firm_profile fp
  where fp.workspace_id = w.id
)
on conflict (workspace_id) do nothing;
