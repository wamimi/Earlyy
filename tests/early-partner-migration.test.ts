import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("keeps approvals service-owned and existing campaigns unpublished", async () => {
  const pg = new PGlite();
  try {
    await pg.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await pg.exec(readFileSync("supabase/early_monad_v3.sql","utf8"));
    await pg.exec(readFileSync("supabase/early_partner_access_v4.sql","utf8"));
    await pg.exec("insert into early_rules(user_id,creator_wallet,commitment,definition) values('u','w','0x' || repeat('1',64),'{}');");
    expect((await pg.query<{published_at:unknown}>("select published_at from early_rules")).rows[0].published_at).toBeNull();
    await pg.exec("set role authenticated");
    await expect(pg.exec("insert into early_team_members(user_id) values('attacker')")).rejects.toThrow(/permission denied/);
    await expect(pg.exec("select * from early_organization_members")).rejects.toThrow(/permission denied/);
    await pg.exec("reset role; set role service_role; insert into early_team_members(user_id) values('operator');");
  } finally { await pg.close(); }
},30000);
