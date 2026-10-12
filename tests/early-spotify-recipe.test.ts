import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Wallet } from "ethers";
import { createSignDataForClaim, getIdentifierFromClaimInfo, verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { spotifyRecipeReference } from "../src/lib/early/recipe-diagnostics";
import { spotifyVerificationHashes } from "../src/lib/early/spotify-recipe";
import { providers } from "../src/lib/early/providers";
import { verifySession } from "../src/lib/early/verification";
import type { Session } from "../src/lib/early/store";

// Synthetic test attestor, trusted only by the stubbed discovery response in this file.
const attestor = Wallet.createRandom();
const pin = providers.spotify_saved_track.hash;
const target = `spotify:track:${"t".repeat(22)}`;
function recipe(offset = 7) {
  return { ...structuredClone(spotifyRecipeReference), body: spotifyRecipeReference.body
    .replace("{{collection_uri}}", `spotify:playlist:${"a".repeat(22)}`).replace("{{offset}}", String(offset)) };
}
async function signed(parameters: unknown, context = "{}", signer = attestor): Promise<Proof> {
  const claimData = { provider: "http", parameters: JSON.stringify(parameters), context, owner: attestor.address,
    timestampS: Math.floor(Date.now() / 1000), epoch: 1 };
  const identifier = getIdentifierFromClaimInfo(claimData);
  return { identifier, claimData: { ...claimData, identifier }, signatures: [await signer.signMessage(createSignDataForClaim(claimData))], witnesses: [], extractedParameterValues: {} };
}
function check(proof: Proof) {
  return verifyProof(proof, { hashes: spotifyVerificationHashes(proof.claimData.parameters, pin) });
}
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [{ address: attestor.address }] })));
  vi.stubEnv("RECLAIM_REQUIRE_TEE_ATTESTATION", "false");
  vi.stubEnv("EARLY_SOURCE_NULLIFIER_SECRET", Buffer.alloc(32, 3).toString("base64"));
  vi.stubEnv("EARLY_SOURCE_NULLIFIER_KEY_VERSION", "1");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it.each([0, 7, 1234])("verifies the original signed resolved body at offset %i using the real SDK", async offset => {
  const proof = await signed(recipe(offset)), before = JSON.stringify(proof);
  expect((await verifyProof(proof, { hashes: [pin] })).isVerified).toBe(false);
  expect((await check(proof)).isVerified).toBe(true);
  expect(JSON.stringify(proof)).toBe(before);
});
it("retains the reviewed template path and refuses stale pins or malformed input", async () => {
  expect((await check(await signed(spotifyRecipeReference))).isVerified).toBe(true);
  expect(spotifyVerificationHashes(JSON.stringify(recipe()), "stale-pin")).toEqual(["stale-pin"]);
  expect(spotifyVerificationHashes("invalid", pin)).toEqual([pin]);
});
it.each(["uri", "offset", "limit", "query", "extra", "duplicate"])("rejects an attestor-signed unapproved body change: %s", async field => {
  const r = recipe(), body = JSON.parse(r.body);
  if (field === "uri") body.variables.uri = "spotify:playlist:invalid";
  if (field === "offset") body.variables.offset = -1;
  if (field === "limit") body.variables.limit = 50;
  if (field === "query") body.extensions.persistedQuery.sha256Hash = "arbitrary-query";
  if (field === "extra") body.variables.extra = true;
  r.body = JSON.stringify(body);
  if (field === "duplicate") r.body = r.body.replace('"limit":1', '"limit":50,"limit":1');
  expect((await check(await signed(r))).isVerified).toBe(false);
});
it.each(["url", "method", "matcher", "redaction", "optional", "extra-selector"])("rejects an attestor-signed recipe change: %s", async field => {
  const r = recipe();
  if (field === "url") r.url = "https://example.com/forged";
  if (field === "method") Object.assign(r, { method: "GET" });
  if (field === "matcher") r.responseMatches[0].value = "anything";
  if (field === "redaction") r.responseRedactions[0].jsonPath = "$.unrelated";
  if (field === "optional") r.responseMatches[0].isOptional = true;
  if (field === "extra-selector") r.responseMatches.push({ ...r.responseMatches[0], isOptional: true });
  expect((await check(await signed(r))).isVerified).toBe(false);
});
it("rejects body tampering after signing and an untrusted signer", async () => {
  const proof = await signed(recipe());
  proof.claimData.parameters = JSON.stringify(recipe(8));
  expect((await check(proof)).isVerified).toBe(false);
  expect((await check(await signed(recipe(), "{}", Wallet.createRandom()))).isVerified).toBe(false);
});
it("keeps source-owner and target checks after real SDK verification", async () => {
  const p = providers.spotify_saved_track;
  const s: Session = { id: "spotify-test", user_id: "fan", wallet: attestor.address, route: "spotify_saved_track",
    selection: { route: "spotify_saved_track", targetId: target, cutoff: "2027-01-01T00:00:00Z" },
    context_message: "server-context", provider_id: p.id, provider_version: p.version, recipe_hash: pin,
    request_url: "https://example.com", created_at: new Date(Date.now() - 10000).toISOString(),
    expires_at: new Date(Date.now() + 60000).toISOString(), proof_identifier: null, evidence_id: null };
  const fields = { collection_owner: "spotify:user:sample", saved_item: JSON.stringify({
    addedAt: { isoString: "2025-01-01T00:00:00Z" }, addedBy: { data: { uri: "spotify:user:sample" } },
    itemV2: { data: { __typename: "Track", uri: target, artists: { items: [{ uri: `spotify:artist:${"b".repeat(22)}` }] } } }, uid: "sample",
  }) };
  const context = { contextAddress: s.wallet, contextMessage: s.context_message, reclaimSessionId: s.id, extractedParameters: fields };
  const proof = await signed(recipe(), JSON.stringify(context));
  expect((await verifySession([proof], s)).targetId).toBe(target);
  vi.stubEnv("RECLAIM_REQUIRE_TEE_ATTESTATION", "true");
  vi.stubEnv("RECLAIM_APP_SECRET", "synthetic-test-secret");
  await expect(verifySession([proof], s)).rejects.toMatchObject({ code: "INVALID_PROOF_ATTESTATION" });
  vi.stubEnv("RECLAIM_REQUIRE_TEE_ATTESTATION", "false");
  await expect(verifySession([proof], { ...s, selection: { ...s.selection, targetId: `spotify:track:${"z".repeat(22)}` } })).rejects.toThrow(/target/);
  fields.collection_owner = "spotify:user:other";
  await expect(verifySession([await signed(recipe(), JSON.stringify(context))], s)).rejects.toThrow(/owner/);
});
