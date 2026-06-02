-- Add 'client' to share_resource_type enum
alter type share_resource_type add value if not exists 'client';

-- Allow portal_messages to work at client-level (no project required)
alter table portal_messages alter column project_id drop not null;
alter table portal_messages
  add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_portal_messages_client_id on portal_messages(client_id);
