import { resolve } from "node:path";

// Access is provisioned against an exact Privy user ID after an Early review.
const [operation, ...args] = process.argv.slice(2).filter(arg => arg !== "--apply");
const apply = process.argv.includes("--apply");
const usage = "Usage: node scripts/early-partner-access.mjs team <privy-user-id> | revoke-team <privy-user-id> | disable-partner <organization-uuid> | partner <artist|brand> <name> | member <organization-uuid> <privy-user-id> | revoke-member <organization-uuid> <privy-user-id> [--apply]";
const userId = value => {
  if (!/^did:privy:[a-zA-Z0-9_-]{1,128}$/.test(value ?? "")) throw new Error("Use the verified account's exact Privy user ID.");
  return value;
};
const organizationId = value => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value ?? "")) throw new Error("Use the organization UUID returned by partner setup.");
  return value;
};
async function main() {
  let path, method = "POST", body;
  if (["team","revoke-team"].includes(operation) && args.length === 1) {
    path = "early_team_members?on_conflict=user_id";body = {user_id:userId(args[0]),active:operation === "team"};
  } else if (operation === "disable-partner" && args.length === 1) {
    path = `early_organizations?${new URLSearchParams({id:`eq.${organizationId(args[0])}`})}`;method = "PATCH";body = {approved:false};
  } else if (operation === "partner" && args.length === 2 && ["artist","brand"].includes(args[0]) && args[1].trim().length > 0 && args[1].length <= 120) {
    path = "early_organizations";body = {kind:args[0],name:args[1].trim(),approved:true};
  } else if (["member","revoke-member"].includes(operation) && args.length === 2) {
    const org = organizationId(args[0]), user = userId(args[1]);
    if (operation === "member") {
      path = "early_organization_members?on_conflict=organization_id,user_id";body = {organization_id:org,user_id:user,active:true};
    } else {
      path = `early_organization_members?${new URLSearchParams({organization_id:`eq.${org}`,user_id:`eq.${user}`})}`;method = "PATCH";body = {active:false};
    }
  } else throw new Error(usage);
  if (!apply) { console.log("Validated dry run. No access changed. Add --apply only after reviewing the intended account and organization.");return; }
  process.loadEnvFile(resolve(".env.local"));
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY, base = process.env.SUPABASE_URL;
  if (!key || !base) throw new Error("Supabase server settings are required in .env.local.");
  const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,headers:{apikey:key,...(key.startsWith("sb_secret_")?{}:{Authorization:`Bearer ${key}`}),"Content-Type":"application/json",Prefer:"return=representation,resolution=merge-duplicates"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Access setup failed (${response.status}). Confirm the access migration was applied.`);
  const result = await response.json();
  if (!result.length) throw new Error("No membership changed. Confirm the account and organization.");
  console.log(operation === "partner" ? `Approved organization ID: ${result[0].id}` : "Access updated for the reviewed account.");
}
main().catch(error => { console.error(error.message);process.exitCode = 1; });
