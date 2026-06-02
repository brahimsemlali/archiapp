-- Fix infinite recursion in workspace_members RLS policy
-- Paste this in Supabase Dashboard → SQL Editor → New query, then click Run.

create or replace function public.get_my_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

drop policy if exists "wm_select" on workspace_members;

create policy "wm_select" on workspace_members for select using (
  workspace_id in (select public.get_my_workspace_ids())
);
