import { ensure } from "./errors";
import { db, one, type StoredRule } from "./store";

type Organization = { id: string; name: string; kind: "artist" | "brand"; approved: boolean };
export async function isTeam(userId: string) {
  return Boolean(await one("early_team_members", { user_id: userId, active: "true" }));
}
export async function requireTeam(userId: string) {
  ensure(await isTeam(userId), "TEAM_REQUIRED", "Campaign creation and publication are managed by the Early team.", 403);
}
export async function workspaceAccess(userId: string) {
  const team = await isTeam(userId);
  const organizations = await db<Organization[]>("early_organizations?approved=eq.true&select=id,name,kind,approved");
  const memberships = await db<{ organization_id: string }[]>(`early_organization_members?${new URLSearchParams({user_id:`eq.${userId}`,active:"eq.true",select:"organization_id"})}`);
  return { userId, team, organizations: organizations.filter(o => team || memberships.some(m => m.organization_id === o.id)) };
}
export async function visibleRule(ruleId: string, userId: string) {
  const rule = await one<StoredRule>("early_rules", { id: ruleId });
  ensure(rule, "RULE_NOT_FOUND", "Campaign not found.", 404);
  if (await isTeam(userId)) return rule;
  ensure(rule.published_at && rule.organization_id && await one("early_organizations", {id:rule.organization_id,approved:"true"}), "RULE_NOT_FOUND", "Campaign not available.", 404);
  return rule;
}
export async function requirePublished(rule: StoredRule) {
  ensure(rule.published_at && rule.organization_id && await one("early_organizations", {id:rule.organization_id,approved:"true"}), "CAMPAIGN_UNAVAILABLE", "This campaign is not published by an approved partner.", 409);
}
