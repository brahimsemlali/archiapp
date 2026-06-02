-- SaaS hardening: portfolio/public site fields expected by firm settings and /p/[slug].

alter table firm_profile
  add column if not exists slug text,
  add column if not exists portfolio_enabled boolean not null default false,
  add column if not exists portfolio_tagline text,
  add column if not exists portfolio_specialties jsonb,
  add column if not exists portfolio_featured_project_ids jsonb;

create unique index if not exists firm_profile_slug_unique
  on firm_profile(slug)
  where slug is not null;
