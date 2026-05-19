-- Performance indexes for high-traffic queries
-- H-6: Filtering invoices/tasks by status and due date
create index if not exists idx_factures_workspace_status on factures(workspace_id, status);
create index if not exists idx_factures_workspace_due_date on factures(workspace_id, due_date);
create index if not exists idx_tasks_workspace_due_date on tasks(workspace_id, due_date);
create index if not exists idx_devis_workspace_status on devis(workspace_id, status);

-- M-6: Rate-limit lookups on activity_log
create index if not exists idx_activity_log_rate_limit on activity_log(workspace_id, project_id, action, created_at desc);

-- Partial index: unpaid invoices only (most common dashboard filter)
create index if not exists idx_factures_unpaid on factures(workspace_id, due_date)
  where status = 'envoyee';

-- Partial index: active tasks only
create index if not exists idx_tasks_active on tasks(workspace_id, due_date, status)
  where archived_at is null and status != 'termine';
