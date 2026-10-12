begin;
create table public.early_team_members (
  user_id text primary key,
  active boolean not null default true
);
create table public.early_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  kind text not null check (kind in ('artist', 'brand')),
  approved boolean not null default false
);
create table public.early_organization_members (
  organization_id uuid not null references public.early_organizations(id),
  user_id text not null,
  active boolean not null default true,
  primary key (organization_id, user_id)
);
alter table public.early_rules add column organization_id uuid references public.early_organizations(id);
alter table public.early_rules add column published_at timestamptz;
create table public.early_benefit_links (
  chain_id integer not null check (chain_id = 10143),
  contract_address text not null,
  benefit_id text not null check (benefit_id ~ '^[1-9][0-9]{0,77}$'),
  rule_id uuid not null references public.early_rules(id),
  transaction_hash text not null,
  primary key (chain_id, contract_address, benefit_id)
);
alter table public.early_team_members enable row level security;
alter table public.early_organizations enable row level security;
alter table public.early_organization_members enable row level security;
alter table public.early_benefit_links enable row level security;
revoke all on public.early_team_members, public.early_organizations, public.early_organization_members, public.early_benefit_links from anon, authenticated;
grant all on public.early_team_members, public.early_organizations, public.early_organization_members, public.early_benefit_links to service_role;
commit;
