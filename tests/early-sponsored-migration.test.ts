import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("preserves separate claim receipts for two wallets in one bundled transaction", async () => {
  const pg = new PGlite();
  try {
    await pg.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await pg.exec(readFileSync("supabase/early_monad_v3.sql","utf8"));
    await pg.exec("insert into early_chain_receipts values(10143,'tx','u1','0xABC',1,'block','[]',now());");
    await pg.exec(readFileSync("supabase/early_sponsored_receipts_v6.sql","utf8"));
    await pg.exec("insert into early_chain_receipts values(10143,'tx','u2','0xdef',1,'block','[]',now()) on conflict(chain_id,tx_hash,wallet) do update set user_id=excluded.user_id;");
    expect((await pg.query("select user_id,wallet from early_chain_receipts order by user_id")).rows).toEqual([{user_id:"u1",wallet:"0xabc"},{user_id:"u2",wallet:"0xdef"}]);
    await pg.exec("set role authenticated");
    await expect(pg.exec("select * from early_chain_receipts")).rejects.toThrow(/permission denied/);
  } finally { await pg.close(); }
},30000);
