import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
let pg:PGlite;
beforeAll(async()=>{
  pg=new PGlite();await pg.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await pg.exec(readFileSync("supabase/early_monad_v3.sql","utf8"));
  await pg.exec(readFileSync("supabase/early_youtube_like_v6.sql","utf8"));
},30000);
beforeEach(async()=>{await pg.exec("truncate early_sessions,early_evidence,early_source_bindings,early_authorizations,early_evaluations,early_rules,early_chain_receipts cascade");});
afterAll(async()=>{await pg.close();});
it("allows independent creators to use identical terms without sharing rule ownership",async()=>{
  const hash=`0x${"a".repeat(64)}`;
  await pg.query("insert into early_rules(user_id,creator_wallet,commitment,definition) values('a','wallet-a',$1,'{}'),('b','wallet-b',$1,'{}')",[hash]);
  expect((await pg.query("select * from early_rules")).rows).toHaveLength(2);
  await expect(pg.query("insert into early_rules(user_id,creator_wallet,commitment,definition) values('a','wallet-a',$1,'{}')",[hash])).rejects.toThrow(/duplicate/);
});
async function session(id="s1",user="user-a",platform="spotify") {
  await pg.query(`insert into early_sessions(id,user_id,wallet,route,selection,context_message,provider_id,provider_version,recipe_hash,request_url,callback_token_hash,expires_at)
    values($1,$2,'wallet', $3,'{}','context','provider','1','hash','request','token',now()+interval '10 minutes')`,[id,user,platform==="spotify"?"spotify_saved_track":"youtube_subscription"]);
}
async function complete(id="s1",user="user-a",source="source-a",event="event-a",identifier="proof-a",platform="spotify") {
  const e={id:event,route:platform==="spotify"?"spotify_saved_track":"youtube_subscription",platform,providerId:"provider",providerVersion:"1",recipeHash:"hash"};
  return pg.query("select early_complete_session($1,$2,'wallet',$3,$4,$5::jsonb,'{}',24) as result",[id,user,identifier,source,JSON.stringify(e)]);
}
const payload=(wallet="wallet",expiry=Math.floor(Date.now()/1000)+300,epoch="1")=>({benefitId:"1",beneficiary:wallet,amount:"100",expiry:String(expiry),sourceNullifier:"nullifier-a",ruleHash:"rule",ruleVersion:"1",signerEpoch:epoch});
async function reserve(user="user-a",source="source-a",a=payload()) {
  return pg.query<{result: ReturnType<typeof payload>}>("select early_reserve_authorization('benefit',$1,$2,$3,$4::jsonb) as result",[user,source,a.sourceNullifier,JSON.stringify(a)]);
}
it("commits a session idempotently and rejects conflicting reuse",async()=>{
  await session();await complete();await complete();expect((await pg.query("select * from early_evidence")).rows).toHaveLength(1);
  await expect(complete("s1","user-a","source-a","event-a","proof-b")).rejects.toThrow(/SESSION_CONFLICT/);
});
it("rejects expired sessions, wrong users and provider mismatches",async()=>{
  await session();await expect(complete("s1","user-b")).rejects.toThrow(/SESSION_FORBIDDEN/);
  await pg.query("update early_sessions set provider_version='2' where id='s1'");await expect(complete()).rejects.toThrow(/EVIDENCE_MISMATCH/);
  await pg.query("update early_sessions set created_at=now()-interval '1 day',expires_at=now()-interval '1 second' where id='s1'");await expect(complete()).rejects.toThrow(/SESSION_EXPIRED/);
});
it("binds a source to one user and forbids silent source relinking",async()=>{
  await session();await complete();await session("s2","user-b");await expect(complete("s2","user-b")).rejects.toThrow(/SOURCE_ALREADY_BOUND/);
  await session("s3");await expect(complete("s3","user-a","source-other","event-b")).rejects.toThrow(/SOURCE_RELINK_FORBIDDEN/);
});
it("handles concurrent identical callbacks as one durable event",async()=>{
  await session();const results=await Promise.all([complete(),complete(),complete()]);expect(results).toHaveLength(3);
  expect((await pg.query("select * from early_evidence")).rows).toHaveLength(1);
});
it("reserves one entitlement across concurrent routes and keeps its nullifier on renewal",async()=>{
  await session();await complete();await session("s2","user-a","youtube");await complete("s2","user-a","source-y","event-y","proof-y","youtube");
  const a=payload();const b={...a,sourceNullifier:"nullifier-y"};
  const results=await Promise.all([reserve(),reserve("user-a","source-y",b)]);
  expect(results[0].rows[0].result.sourceNullifier).toBe(results[1].rows[0].result.sourceNullifier);
  expect((await pg.query("select * from early_authorizations")).rows).toHaveLength(1);
  await expect(reserve("user-a","source-a",payload("new-wallet"))).rejects.toThrow(/WALLET_AUTHORIZATION_PENDING/);
  const changed=await reserve("user-a","source-y",{...payload("new-wallet",undefined,"2"),sourceNullifier:"nullifier-y"});
  expect(changed.rows[0].result.sourceNullifier).toBe(results[0].rows[0].result.sourceNullifier);
});
it("rejects foreign sources and mutated terms",async()=>{
  await session();await complete();await reserve();
  await expect(reserve("user-b")).rejects.toThrow(/SOURCE_FORBIDDEN/);
  await expect(reserve("user-a","source-a",{...payload(),amount:"200"})).rejects.toThrow(/TERMS_CONFLICT/);
});
it("removes expired raw proofs without deleting durable support or nullifiers",async()=>{
  await session();await complete();await reserve();await pg.exec("update early_sessions set raw_proof_expires_at=now()-interval '1 hour'");
  await pg.exec("select early_purge_raw_proofs()");expect((await pg.query("select proof_ciphertext from early_sessions")).rows[0]).toEqual({proof_ciphertext:null});
  expect((await pg.query("select * from early_evidence")).rows).toHaveLength(1);expect((await pg.query("select * from early_authorizations")).rows).toHaveLength(1);
});
it("denies browser roles both private table access and security-definer RPC execution",async()=>{
  await pg.exec("set role authenticated");
  try { await expect(pg.query("select * from early_evidence")).rejects.toThrow(/permission denied/);await expect(pg.query("select early_purge_raw_proofs()")).rejects.toThrow(/permission denied/); }
  finally {await pg.exec("reset role");}
});

it("shares YouTube source ownership across subscription and video-like routes and deduplicates likes",async()=>{
 await session('subscription','user-a','youtube');await complete('subscription','user-a','google-source','subscription-event','proof-sub','youtube');
 for (const [id,user] of [['like-a','user-a'],['like-b','user-b'],['like-repeat','user-a']]) {
   await session(id,user,'youtube');await pg.query("update early_sessions set route='youtube_like' where id=$1",[id]);
 }
 const like=(id:string,user:string,identifier:string)=>pg.query("select early_complete_session($1,$2,'wallet',$3,'google-source',$4::jsonb,'{}',24)",[id,user,identifier,JSON.stringify({id:'like-event',route:'youtube_like',platform:'youtube',providerId:'provider',providerVersion:'1',recipeHash:'hash'})]);
 await expect(like('like-b','user-b','proof-b')).rejects.toThrow(/SOURCE_ALREADY_BOUND/);
 await like('like-a','user-a','proof-a');await like('like-repeat','user-a','proof-repeat');
 expect((await pg.query("select * from early_evidence where user_id='user-b'")).rows).toHaveLength(0);
 expect((await pg.query("select * from early_evidence")).rows).toHaveLength(2);
 expect((await pg.query("select * from early_source_bindings")).rows).toHaveLength(1);
});
