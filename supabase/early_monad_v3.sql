begin;

create table public.early_rules (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  creator_wallet text not null,
  commitment text not null check (commitment ~ '^0x[0-9a-f]{64}$'),
  definition jsonb not null,
  created_at timestamptz not null default now(),
  unique(creator_wallet, commitment)
);
create table public.early_sessions (
  id text primary key,
  user_id text not null,
  wallet text not null,
  route text not null check (route in ('spotify_saved_track','youtube_subscription')),
  selection jsonb not null,
  context_message text not null,
  provider_id text not null,
  provider_version text not null,
  recipe_hash text not null,
  request_url text not null,
  callback_token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  proof_identifier text,
  evidence_id text,
  proof_ciphertext jsonb,
  raw_proof_expires_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  check (expires_at > created_at)
);
create table public.early_source_bindings (
  source_key text primary key,
  platform text not null check (platform in ('spotify','youtube')),
  user_id text not null,
  key_version integer not null check (key_version = 1),
  created_at timestamptz not null default now(),
  unique(user_id, platform)
);
create table public.early_evidence (
  id text primary key,
  user_id text not null,
  source_key text not null references public.early_source_bindings(source_key),
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.early_sessions add constraint early_session_evidence_fk foreign key(evidence_id) references public.early_evidence(id);
create index early_evidence_user on public.early_evidence(user_id);
create table public.early_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  rule_id uuid not null references public.early_rules(id),
  result jsonb not null,
  created_at timestamptz not null default now()
);
create table public.early_authorizations (
  benefit_key text not null,
  user_id text not null,
  source_key text not null references public.early_source_bindings(source_key),
  nullifier text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key(benefit_key, user_id),
  unique(benefit_key, source_key),
  unique(benefit_key, nullifier)
);
create table public.early_chain_receipts (
  chain_id integer not null check (chain_id = 10143),
  tx_hash text not null,
  user_id text not null,
  wallet text not null,
  block_number bigint not null,
  block_hash text not null,
  events jsonb not null,
  verified_at timestamptz not null default now(),
  primary key(chain_id, tx_hash)
);

-- Only the backend service role can read or mutate private records.
alter table public.early_rules enable row level security;
alter table public.early_sessions enable row level security;
alter table public.early_source_bindings enable row level security;
alter table public.early_evidence enable row level security;
alter table public.early_evaluations enable row level security;
alter table public.early_authorizations enable row level security;
alter table public.early_chain_receipts enable row level security;

create function public.early_complete_session(
  p_session text, p_user text, p_wallet text, p_identifier text, p_source text,
  p_evidence jsonb, p_ciphertext jsonb, p_retention_hours integer
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s early_sessions; b early_source_bindings; e early_evidence; eid text := p_evidence->>'id';
begin
  select * into s from early_sessions where id = p_session for update;
  if not found or s.user_id <> p_user or lower(s.wallet) <> lower(p_wallet) then raise exception 'SESSION_FORBIDDEN'; end if;
  if s.proof_identifier is not null then
    if s.proof_identifier <> p_identifier then raise exception 'SESSION_CONFLICT'; end if;
    select * into e from early_evidence where id = s.evidence_id;
    return e.evidence;
  end if;
  if s.expires_at <= now() then raise exception 'SESSION_EXPIRED'; end if;
  if p_evidence->>'route' <> s.route or p_evidence->>'providerId' <> s.provider_id
    or p_evidence->>'providerVersion' <> s.provider_version or p_evidence->>'recipeHash' <> s.recipe_hash
    or eid is null or p_retention_hours not between 1 and 168 then raise exception 'EVIDENCE_MISMATCH'; end if;
  -- Serializes both the same source on different users and different sources on the same user.
  perform pg_advisory_xact_lock(hashtextextended('source:' || p_source, 0));
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user, 0));
  select * into b from early_source_bindings where source_key = p_source;
  if found and b.user_id <> p_user then raise exception 'SOURCE_ALREADY_BOUND'; end if;
  if exists(select 1 from early_source_bindings where user_id=p_user and platform=p_evidence->>'platform' and source_key<>p_source) then raise exception 'SOURCE_RELINK_FORBIDDEN'; end if;
  insert into early_source_bindings(source_key,platform,user_id,key_version)
    values(p_source,p_evidence->>'platform',p_user,1) on conflict do nothing;
  insert into early_evidence(id,user_id,source_key,evidence) values(eid,p_user,p_source,p_evidence) on conflict do nothing;
  select * into e from early_evidence where id=eid;
  if e.user_id <> p_user or e.source_key <> p_source then raise exception 'EVENT_CONFLICT'; end if;
  update early_sessions set proof_identifier=p_identifier,evidence_id=eid,proof_ciphertext=p_ciphertext,
    raw_proof_expires_at=now()+make_interval(hours=>p_retention_hours),last_error_code=null,last_error_at=null where id=p_session;
  return e.evidence;
end $$;

create function public.early_reserve_authorization(p_benefit text,p_user text,p_source text,p_nullifier text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a early_authorizations;
begin
  perform pg_advisory_xact_lock(hashtextextended('issuance:' || p_benefit || ':' || p_user,0));
  if not exists(select 1 from early_source_bindings where source_key=p_source and user_id=p_user) then raise exception 'SOURCE_FORBIDDEN'; end if;
  select * into a from early_authorizations where benefit_key=p_benefit and user_id=p_user for update;
  if found then
    if a.payload->>'ruleHash' <> p_payload->>'ruleHash' or a.payload->>'amount' <> p_payload->>'amount'
      or a.payload->>'ruleVersion' <> p_payload->>'ruleVersion' then raise exception 'TERMS_CONFLICT'; end if;
    if (a.payload->>'expiry')::numeric > extract(epoch from now()) and a.payload->>'signerEpoch'=p_payload->>'signerEpoch' then
      if lower(a.payload->>'beneficiary') <> lower(p_payload->>'beneficiary') then raise exception 'WALLET_AUTHORIZATION_PENDING'; end if;
      return a.payload;
    end if;
    -- The first entitlement's source/nullifier stays stable across renewal and alternative routes.
    p_payload := jsonb_set(p_payload,'{sourceNullifier}',to_jsonb(a.nullifier));
    update early_authorizations set payload=p_payload where benefit_key=p_benefit and user_id=p_user;
    return p_payload;
  end if;
  if p_payload->>'sourceNullifier' <> p_nullifier then raise exception 'NULLIFIER_MISMATCH'; end if;
  insert into early_authorizations(benefit_key,user_id,source_key,nullifier,payload) values(p_benefit,p_user,p_source,p_nullifier,p_payload);
  return p_payload;
end $$;

create function public.early_purge_raw_proofs() returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare n bigint;
begin
  update early_sessions set proof_ciphertext=null where proof_ciphertext is not null and raw_proof_expires_at<=now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on public.early_rules, public.early_sessions, public.early_source_bindings, public.early_evidence, public.early_evaluations, public.early_authorizations, public.early_chain_receipts from anon, authenticated;
grant all on public.early_rules, public.early_sessions, public.early_source_bindings, public.early_evidence, public.early_evaluations, public.early_authorizations, public.early_chain_receipts to service_role;
revoke all on function public.early_complete_session(text,text,text,text,text,jsonb,jsonb,integer), public.early_reserve_authorization(text,text,text,text,jsonb), public.early_purge_raw_proofs() from public, anon, authenticated;
grant execute on function public.early_complete_session(text,text,text,text,text,jsonb,jsonb,integer), public.early_reserve_authorization(text,text,text,text,jsonb), public.early_purge_raw_proofs() to service_role;
commit;
