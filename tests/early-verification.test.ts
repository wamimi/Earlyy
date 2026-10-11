import { beforeEach, expect, it, vi } from "vitest";
import type { Proof } from "@reclaimprotocol/js-sdk";
const sdk = vi.hoisted(()=>({verifyProof:vi.fn(),init:vi.fn()}));
vi.mock("@reclaimprotocol/js-sdk",()=>({verifyProof:sdk.verifyProof,ReclaimProofRequest:{init:sdk.init}}));
import { assertSessionBinding, verifySession, matchesToken, tokenHash } from "../src/lib/early/verification";
import { providers } from "../src/lib/early/providers";
import type { Session } from "../src/lib/early/store";
const wallet="0x0000000000000000000000000000000000000011";
const target=`UC${"a".repeat(22)}`;
function fixture() {
  const p=providers.youtube_subscription;
  const s: Session={id:"request-one",user_id:"privy-a",wallet,route:"youtube_subscription",selection:{route:"youtube_subscription",targetId:target,cutoff:"2025-01-01T00:00:00Z"},
    context_message:'{"nonce":"server-owned"}',provider_id:p.id,provider_version:p.version,recipe_hash:p.hash,request_url:"https://example.com",
    created_at:new Date(Date.now()-10000).toISOString(),expires_at:new Date(Date.now()+30000).toISOString(),proof_identifier:null,evidence_id:null};
  const proof={identifier:"claim-one",claimData:{owner:"0x0000000000000000000000000000000000000022",timestampS:Math.floor(Date.now()/1000),context:JSON.stringify({contextAddress:wallet,contextMessage:s.context_message,reclaimSessionId:s.id})},signatures:["fixture"]} as unknown as Proof;
  return {s,proof};
}
beforeEach(()=>{vi.stubEnv("EARLY_SOURCE_NULLIFIER_SECRET",Buffer.alloc(32,3).toString("base64"));vi.stubEnv("EARLY_SOURCE_NULLIFIER_KEY_VERSION","1");
  sdk.verifyProof.mockReset();sdk.verifyProof.mockResolvedValue({isVerified:true,data:[{extractedParameters:{source_account_id:"12345",channel_id:target,activity_timestamp:"1700000000000000"}}]});});
it("binds signed context while allowing a distinct Verifier proof-owner key",async()=>{
  const {s,proof}=fixture();expect(()=>assertSessionBinding(proof,s)).not.toThrow();
  const e=await verifySession([proof],s);expect(e.targetId).toBe(target);
  expect(sdk.verifyProof).toHaveBeenCalledWith([proof],{hashes:[providers.youtube_subscription.hash]});
});
it.each(["contextAddress","contextMessage","reclaimSessionId"])("rejects altered signed %s",key=>{
  const {s,proof}=fixture();const c=JSON.parse(proof.claimData.context);c[key]=key==="contextAddress"?"0x0000000000000000000000000000000000000033":"attacker";
  proof.claimData.context=JSON.stringify(c);expect(()=>assertSessionBinding(proof,s)).toThrow();
});
it("rejects expired, conflicting, stale and wrong-version sessions",()=>{
  const {s,proof}=fixture();expect(()=>assertSessionBinding(proof,{...s,expires_at:new Date(Date.now()-1000).toISOString()})).toThrow();
  expect(()=>assertSessionBinding(proof,{...s,proof_identifier:"other"})).toThrow();
  expect(()=>assertSessionBinding(proof,{...s,provider_version:"1.0.2"})).toThrow();
  proof.claimData.timestampS-=3600;expect(()=>assertSessionBinding(proof,s)).toThrow();
});
it("rejects invalid cryptography, mixed proof sets, wrong targets and ignores unsigned extracted fields",async()=>{
  const {s,proof}=fixture();await expect(verifySession([proof,proof],s)).rejects.toThrow();
  proof.extractedParameterValues={channel_id:"attacker"};expect((await verifySession([proof],s)).targetId).toBe(target);
  await expect(verifySession([proof],{...s,selection:{...s.selection,targetId:`UC${"z".repeat(22)}`}})).rejects.toThrow(/target/);
  sdk.verifyProof.mockResolvedValue({isVerified:false,error:{message:"altered date"}});await expect(verifySession([proof],s)).rejects.toThrow(/Signature/);
});
it("rejects mixed-account Spotify records after signature verification",async()=>{
  const {s,proof}=fixture();const p=providers.spotify_saved_track;
  Object.assign(s,{route:"spotify_saved_track",provider_id:p.id,provider_version:p.version,recipe_hash:p.hash});
  sdk.verifyProof.mockResolvedValue({isVerified:true,data:[{extractedParameters:{collection_owner:"spotify:user:a",saved_item:JSON.stringify({addedBy:{data:{uri:"spotify:user:b"}}})}}]});
  await expect(verifySession([proof],s)).rejects.toThrow(/belong/);
});
it("compares callback capabilities without accepting malformed tokens",()=>{
  expect(matchesToken("secret",tokenHash("secret"))).toBe(true);expect(matchesToken("other",tokenHash("secret"))).toBe(false);expect(matchesToken("secret","bad")).toBe(false);
});
it.each([
  ["ProofNotValidatedError", "INVALID_PROOF_RECIPE"],
  ["UnknownProofsNotValidatedError", "INVALID_PROOF_RECIPE"],
  ["ProofNotVerifiedError", "INVALID_PROOF_SIGNATURE"],
  ["TeeVerificationError", "INVALID_PROOF_ATTESTATION"],
  ["BackendServerError", "PROOF_VERIFICATION_UNAVAILABLE"],
])("reports %s without exposing private SDK diagnostics", async (name, code) => {
  const { s, proof } = fixture();
  const error = Object.assign(new Error("private source history and callback token"), { name });
  sdk.verifyProof.mockResolvedValue({ isVerified: false, error });
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await expect(verifySession([proof], s)).rejects.toMatchObject({ code });
    expect(JSON.stringify(warning.mock.calls)).not.toContain(error.message);
    expect(warning).toHaveBeenCalledWith("early.proof_verification_failed", {
      sessionId: s.id, route: s.route, providerVersion: s.provider_version, code,
    });
  } finally { warning.mockRestore(); }
});
