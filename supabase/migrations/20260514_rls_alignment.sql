-- RLS alignment: fix workspace_members admin write access and portal_messages role gate
-- Gaps identified:
--   1. wm_update / wm_delete only allowed owner; app-level canManageTeam() allows admin too
--   2. portal_messages ws_insert had no role check — viewer could insert

-- ─── 1. Security-definer helper: workspace IDs where caller is owner or admin ───────
-- Security definer avoids infinite recursion when workspace_members policies call
-- back into workspace_members (same pattern as get_my_workspace_ids above).

create or replace function public.get_my_managed_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id
  from public.workspace_members
  where user_id = auth.uid()
    and role in ('owner', 'admin');
$$;

-- ─── 2. workspace_members: allow admin + owner to update/delete ───────────────────

drop policy if exists "wm_update" on workspace_members;
create policy "wm_update" on workspace_members
  for update
  using (
    workspace_id in (select public.get_my_managed_workspace_ids())
    and role <> 'owner'
  )
  with check (
    workspace_id in (select public.get_my_managed_workspace_ids())
    and role <> 'owner'
  );

drop policy if exists "wm_delete" on workspace_members;
create policy "wm_delete" on workspace_members for delete using (
  workspace_id in (select public.get_my_managed_workspace_ids())
  and role <> 'owner'
);

-- ─── 3. portal_messages: gate INSERT on write roles (owner/admin/member) ─────────

drop policy if exists "ws_insert" on portal_messages;
create policy "ws_insert" on portal_messages for insert with check (
  workspace_id in (
    select workspace_id
    from public.workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  )
);
