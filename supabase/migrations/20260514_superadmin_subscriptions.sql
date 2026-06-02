alter table workspaces
  add column if not exists account_status text not null default 'active',
  add column if not exists subscription_status text not null default 'manual',
  add column if not exists subscription_source text not null default 'manual',
  add column if not exists lemon_squeezy_customer_id text,
  add column if not exists lemon_squeezy_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workspaces_account_status_check') then
    alter table workspaces
      add constraint workspaces_account_status_check
      check (account_status in ('active', 'suspended', 'cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'workspaces_subscription_status_check') then
    alter table workspaces
      add constraint workspaces_subscription_status_check
      check (subscription_status in ('manual', 'trialing', 'active', 'past_due', 'paused', 'cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'workspaces_subscription_source_check') then
    alter table workspaces
      add constraint workspaces_subscription_source_check
      check (subscription_source in ('manual', 'lemonsqueezy'));
  end if;
end $$;

create index if not exists idx_workspaces_account_status on workspaces(account_status);
create index if not exists idx_workspaces_subscription_status on workspaces(subscription_status);
create index if not exists idx_workspaces_lemon_subscription on workspaces(lemon_squeezy_subscription_id);
