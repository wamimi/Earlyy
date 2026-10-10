begin;

create or replace function public.early_publish_campaign(p_user text, p_rule uuid, p_organization uuid)
returns public.early_rules language plpgsql security definer set search_path=public,pg_temp as $$
declare r early_rules;
begin
  if not exists(select 1 from early_team_members where user_id=p_user and active) then
    raise exception 'TEAM_REQUIRED';
  end if;
  perform 1 from early_organizations where id=p_organization and approved for share;
  if not found then raise exception 'PARTNER_NOT_APPROVED'; end if;
  select * into r from early_rules where id=p_rule and user_id=p_user for update;
  if not found then raise exception 'RULE_NOT_FOUND'; end if;
  if r.published_at is not null and r.organization_id is distinct from p_organization then
    raise exception 'PARTNER_CONFLICT';
  end if;
  if (r.definition->>'claimExpiry')::bigint <= extract(epoch from now()) then
    raise exception 'INVALID_EXPIRY';
  end if;
  update early_rules set organization_id=p_organization, published_at=coalesce(published_at,now())
    where id=p_rule returning * into r;
  return r;
end $$;
revoke all on function public.early_publish_campaign(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.early_publish_campaign(text,uuid,uuid) to service_role;

commit;
