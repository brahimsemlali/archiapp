-- Worldwide foundation (worldwide.md W1): per-workspace localization on firm_profile.
-- All columns are defaulted to the Morocco pack so existing rows keep the
-- app's historical behavior with zero backfill.

alter table public.firm_profile
  add column if not exists country text not null default 'MA',
  add column if not exists currency text not null default 'MAD',
  add column if not exists timezone text not null default 'Africa/Casablanca',
  add column if not exists default_tax_rate numeric not null default 20;

comment on column public.firm_profile.country is 'ISO 3166-1 alpha-2 country pack code (see src/lib/country-packs.ts)';
comment on column public.firm_profile.currency is 'ISO 4217 workspace display currency';
comment on column public.firm_profile.timezone is 'IANA timezone for date display';
comment on column public.firm_profile.default_tax_rate is 'Default tax (TVA/VAT) percent pre-filled on new devis/factures';
