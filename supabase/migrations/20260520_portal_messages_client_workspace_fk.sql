-- Keep client-level portal messages tenant-safe at the database layer.
-- Project-level portal messages already have a workspace/project composite FK.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portal_messages_workspace_client_fk') then
    alter table portal_messages
      add constraint portal_messages_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;
end $$;
