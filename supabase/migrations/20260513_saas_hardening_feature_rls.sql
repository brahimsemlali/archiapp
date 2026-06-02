-- SaaS hardening: split broad ws_all policies so viewers cannot mutate operational data.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'prospects',
    'suppliers',
    'catalog_items',
    'templates',
    'recurring_invoices',
    'payment_reminders'
  ]
  loop
    execute format('drop policy if exists "ws_all" on %I', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_select', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_insert', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_update', table_name);
    execute format('drop policy if exists %I on %I', table_name || '_delete', table_name);

    execute format(
      'create policy %I on %I for select using (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid()
        )
      )',
      table_name || '_select',
      table_name
    );

    execute format(
      'create policy %I on %I for insert with check (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'', ''member'')
        )
      )',
      table_name || '_insert',
      table_name
    );

    execute format(
      'create policy %I on %I for update using (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'', ''member'')
        )
      )',
      table_name || '_update',
      table_name
    );

    execute format(
      'create policy %I on %I for delete using (
        workspace_id in (
          select workspace_id from workspace_members
          where user_id = auth.uid() and role in (''owner'', ''admin'')
        )
      )',
      table_name || '_delete',
      table_name
    );
  end loop;
end $$;

-- Public share links must point to records in the same workspace.
create or replace function public.validate_share_link_resource_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.resource_type = 'project' then
    if not exists (
      select 1 from projects
      where id = new.resource_id
        and workspace_id = new.workspace_id
    ) then
      raise exception 'Project share link resource does not belong to workspace';
    end if;
  elsif new.resource_type = 'file' then
    if not exists (
      select 1 from files
      where id = new.resource_id
        and workspace_id = new.workspace_id
    ) then
      raise exception 'File share link resource does not belong to workspace';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_share_link_resource_workspace on share_links;
create trigger validate_share_link_resource_workspace
before insert or update of workspace_id, resource_type, resource_id on share_links
for each row execute function public.validate_share_link_resource_workspace();
