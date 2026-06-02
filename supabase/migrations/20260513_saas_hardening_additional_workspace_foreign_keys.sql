-- SaaS hardening: additional workspace consistency constraints for feature tables.
-- Safe to run after 20260513_saas_hardening_workspace_foreign_keys.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'permit_stages_workspace_project_fk') then
    alter table permit_stages
      add constraint permit_stages_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recurring_invoices_workspace_client_fk') then
    alter table recurring_invoices
      add constraint recurring_invoices_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recurring_invoices_workspace_project_fk') then
    alter table recurring_invoices
      add constraint recurring_invoices_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payment_reminders_workspace_facture_fk') then
    alter table payment_reminders
      add constraint payment_reminders_workspace_facture_fk
      foreign key (workspace_id, facture_id) references factures(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_items_workspace_supplier_fk') then
    alter table catalog_items
      add constraint catalog_items_workspace_supplier_fk
      foreign key (workspace_id, supplier_id) references suppliers(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'prospects_workspace_converted_client_fk') then
    alter table prospects
      add constraint prospects_workspace_converted_client_fk
      foreign key (workspace_id, converted_client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'moodboards_workspace_client_fk') then
    alter table moodboards
      add constraint moodboards_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'portal_messages_workspace_project_fk') then
    alter table portal_messages
      add constraint portal_messages_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;
end $$;
