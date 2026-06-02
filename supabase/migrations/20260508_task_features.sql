-- ============================================================
-- Phase 2 task features: subtasks + time_entries.task_id
-- Run this migration in Supabase SQL editor when ready.
-- ============================================================

-- Subtasks: self-referential FK on tasks
alter table tasks
  add column if not exists parent_task_id uuid references tasks(id) on delete cascade;

create index if not exists idx_tasks_parent_task_id on tasks(parent_task_id);

-- Link time entries to a specific task (optional, for time-per-task rollup)
alter table time_entries
  add column if not exists task_id uuid references tasks(id) on delete set null;

create index if not exists idx_time_entries_task_id on time_entries(task_id);
