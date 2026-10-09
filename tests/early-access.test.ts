import { beforeEach, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ one: vi.fn(), db: vi.fn(), ownedEvidence: vi.fn() }));
vi.mock("../src/lib/early/store", () => store);
import { action } from "../src/lib/early/actions";
import { requirePublished, visibleRule, workspaceAccess } from "../src/lib/early/access";
import type { StoredRule } from "../src/lib/early/store";
const user = {user_id:"fan",wallet:"0x0000000000000000000000000000000000000001"};
beforeEach(() => { vi.resetAllMocks();store.one.mockResolvedValue(null);store.db.mockResolvedValue([]); });
it.each(["rules", "publish-rule"])("rejects fan role forgery for %s", async operation => {
  await expect(action(operation,{team:true,role:"admin",organizationId:"fake"},user)).rejects.toMatchObject({code:"TEAM_REQUIRED"});
  expect(store.db).not.toHaveBeenCalled();
});
it("rejects unapproved creation before constructing transaction data", async () => {
  await expect(action("transaction",{action:"create",ruleId:"fake"},user)).rejects.toMatchObject({code:"TEAM_REQUIRED"});
});
it("keeps unpublished rules inaccessible to fans", async () => {
  store.one.mockImplementation(async table => table === "early_rules" ? {id:"draft"} : null);
  await expect(visibleRule("draft",user.user_id)).rejects.toMatchObject({code:"RULE_NOT_FOUND"});
});
it("revoked organizations cannot issue claims", async () => {
  await expect(requirePublished({published_at:"2026-10-09",organization_id:"revoked"} as StoredRule)).rejects.toMatchObject({code:"CAMPAIGN_UNAVAILABLE"});
});
it("returns only active memberships in approved organizations", async () => {
  store.db.mockImplementation(async (path:string) => path.startsWith("early_organizations?") ? [{id:"mine",name:"Mine",kind:"artist"},{id:"other",name:"Other",kind:"brand"}] : [{organization_id:"mine"}]);
  expect((await workspaceAccess(user.user_id)).organizations.map(o => o.id)).toEqual(["mine"]);
});
it("rejects return-session IDs from another campaign", async () => {
  store.one.mockResolvedValue({wallet:user.wallet,context_message:JSON.stringify({campaignId:"a"})});
  await expect(action("session-status",{sessionId:"s",ruleId:"b"},user)).rejects.toMatchObject({code:"SESSION_CAMPAIGN_MISMATCH"});
});
it("permits published campaigns only while their organization is approved", async () => {
  store.one.mockImplementation(async table => table === "early_rules" ? {id:"r",published_at:"date",organization_id:"o"} : table === "early_organizations" ? {id:"o"} : null);
  expect((await visibleRule("r",user.user_id)).id).toBe("r");
});
