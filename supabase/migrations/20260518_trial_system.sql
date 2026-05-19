-- Trial system: add trial_ends_at to workspaces
-- New workspaces get 14 days of full (studio) features before reverting to their paid plan or solo

alter table workspaces
  add column if not exists trial_ends_at timestamptz;

-- Give existing solo workspaces a 14-day trial window so they can explore
update workspaces
set trial_ends_at = now() + interval '14 days'
where trial_ends_at is null
  and plan = 'solo';

-- Trigger: auto-set trial for every new workspace
create or replace function set_workspace_trial()
returns trigger language plpgsql as $$
begin
  if new.trial_ends_at is null then
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_set_trial on workspaces;
create trigger workspaces_set_trial
  before insert on workspaces
  for each row execute function set_workspace_trial();
