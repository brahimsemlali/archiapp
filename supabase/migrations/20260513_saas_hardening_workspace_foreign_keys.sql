-- SaaS hardening: enforce workspace consistency on cross-table references.
-- Constraints are NOT VALID so existing data does not block deployment; new writes are enforced.

create unique index if not exists clients_workspace_id_id_unique on clients(workspace_id, id);
create unique index if not exists projects_workspace_id_id_unique on projects(workspace_id, id);
create unique index if not exists devis_workspace_id_id_unique on devis(workspace_id, id);
create unique index if not exists factures_workspace_id_id_unique on factures(workspace_id, id);
create unique index if not exists suppliers_workspace_id_id_unique on suppliers(workspace_id, id);
create unique index if not exists tasks_workspace_id_id_unique on tasks(workspace_id, id);
create unique index if not exists site_visits_workspace_id_id_unique on site_visits(workspace_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_workspace_client_fk') then
    alter table projects
      add constraint projects_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contracts_workspace_client_fk') then
    alter table contracts
      add constraint contracts_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contracts_workspace_project_fk') then
    alter table contracts
      add constraint contracts_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'files_workspace_project_fk') then
    alter table files
      add constraint files_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'devis_workspace_client_fk') then
    alter table devis
      add constraint devis_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'devis_workspace_project_fk') then
    alter table devis
      add constraint devis_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'factures_workspace_client_fk') then
    alter table factures
      add constraint factures_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'factures_workspace_project_fk') then
    alter table factures
      add constraint factures_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'factures_workspace_devis_fk') then
    alter table factures
      add constraint factures_workspace_devis_fk
      foreign key (workspace_id, devis_id) references devis(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'site_visits_workspace_project_fk') then
    alter table site_visits
      add constraint site_visits_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'site_issues_workspace_project_fk') then
    alter table site_issues
      add constraint site_issues_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'site_issues_workspace_visit_fk') then
    alter table site_issues
      add constraint site_issues_workspace_visit_fk
      foreign key (workspace_id, site_visit_id) references site_visits(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_workspace_project_fk') then
    alter table tasks
      add constraint tasks_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_workspace_client_fk') then
    alter table tasks
      add constraint tasks_workspace_client_fk
      foreign key (workspace_id, client_id) references clients(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_workspace_parent_fk') then
    alter table tasks
      add constraint tasks_workspace_parent_fk
      foreign key (workspace_id, parent_task_id) references tasks(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'time_entries_workspace_project_fk') then
    alter table time_entries
      add constraint time_entries_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'time_entries_workspace_task_fk') then
    alter table time_entries
      add constraint time_entries_workspace_task_fk
      foreign key (workspace_id, task_id) references tasks(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'boq_items_workspace_project_fk') then
    alter table boq_items
      add constraint boq_items_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'boq_items_workspace_supplier_fk') then
    alter table boq_items
      add constraint boq_items_workspace_supplier_fk
      foreign key (workspace_id, supplier_id) references suppliers(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'meeting_notes_workspace_project_fk') then
    alter table meeting_notes
      add constraint meeting_notes_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'voice_notes_workspace_project_fk') then
    alter table voice_notes
      add constraint voice_notes_workspace_project_fk
      foreign key (workspace_id, project_id) references projects(workspace_id, id)
      not valid;
  end if;
end $$;
