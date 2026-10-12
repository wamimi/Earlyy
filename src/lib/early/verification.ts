import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { ReclaimProofRequest, verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { getAddress } from "ethers";
import { proofFailure } from "./proof-failure";
import { spotifyRecipeDiagnostics } from "./recipe-diagnostics";
import { spotifyVerificationHashes } from "./spotify-recipe";
import { spotifySavedTrackEvidence, youtubeSubscriptionEvidence, youtubeLikeEvidence } from "../activity-evidence";
import { encryptRawProof } from "../proof-encryption";
import { applicationUrl } from "../origins";
import { EarlyError, ensure, requireSetting } from "./errors";
import { eventKey, sourceKey } from "./nullifiers";
import { providers, providerFor } from "./providers";
import { db, type Session } from "./store";
import { type Evidence, type RuleRoute, record } from "./model";

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function matchesToken(token: string, expected: string) {
  return /^[a-f0-9]{64}$/.test(expected) && timingSafeEqual(Buffer.from(tokenHash(token), "hex"), Buffer.from(expected, "hex"));
}

export async function startSession(userId: string, wallet: string, selection: RuleRoute, campaignId?: string) {
  const p = providerFor(selection.route);
  const request = await ReclaimProofRequest.init(requireSetting("RECLAIM_APP_ID"), requireSetting("RECLAIM_APP_SECRET"), p.id,
    { providerVersion: p.version, log: false, acceptTeeAttestation: process.env.RECLAIM_REQUIRE_TEE_ATTESTATION === "true" });
  ensure(request.getProviderVersion().providerVersion === p.version, "PROVIDER_VERSION_MISMATCH", "Unexpected provider version.");
  const id = request.getSessionId(), callbackToken = randomBytes(32).toString("hex");
  const created_at = new Date().toISOString(), expires_at = new Date(Date.now() + 15 * 60000).toISOString();
  // The nonce is a session capability. It contains no private platform identity.
  const context_message = JSON.stringify({ schema: "early.session/3", sessionId: id, ...(campaignId ? { campaignId } : {}), wallet: getAddress(wallet),
    nonce: randomBytes(32).toString("hex"), route: selection.route, providerId: p.id, providerVersion: p.version,
    recipeHash: p.hash, selection, expiresAt: expires_at });
  request.setContext(getAddress(wallet), context_message);
  request.setParams(selection.route === "youtube_subscription" ? { channel_id: selection.targetId, cutoff: selection.cutoff }
    : selection.route === "youtube_like" ? { video_id: selection.targetId, cutoff: selection.cutoff }
    : { [selection.targetId.startsWith("spotify:track:") ? "track_id" : "artist_id"]: selection.targetId.split(":")[2], cutoff: selection.cutoff });
  request.setAppCallbackUrl(`${applicationUrl()}/api/early/callback?session=${encodeURIComponent(id)}&token=${callbackToken}`, true);
  const returnPath = campaignId ? `/dashboard/campaigns/${encodeURIComponent(campaignId)}` : "/rewards";
  const returnUrl = `${applicationUrl()}${returnPath}?session=${encodeURIComponent(id)}`;
  request.setRedirectUrl(returnUrl);
  request.setCancelRedirectUrl(returnUrl);
  const request_url = await request.getRequestUrl({ verificationMode: "app", canUseDeferredDeepLinksFlow: true });
  await db("early_sessions", "POST", { id, user_id: userId, wallet, route: selection.route, selection,
    context_message, provider_id: p.id, provider_version: p.version, recipe_hash: p.hash, request_url,
    callback_token_hash: tokenHash(callbackToken), created_at, expires_at });
  return { sessionId: id, requestUrl: request_url, expiresAt: expires_at, rewardReady: false };
}

export function assertSessionBinding(proof: Proof, session: Session, now = Date.now()) {
  const p = providers[session.route];
  ensure(p && session.provider_id === p.id && session.provider_version === p.version && session.recipe_hash === p.hash,
    "PROVIDER_VERSION_MISMATCH", "Session provider is no longer accepted.");
  ensure(!session.proof_identifier || session.proof_identifier === proof.identifier, "SESSION_CONFLICT", "This session already contains another proof.", 409);
  ensure(session.proof_identifier || Date.parse(session.expires_at) > now, "SESSION_EXPIRED", "Start a new proof session.", 409);
  const context = record(JSON.parse(proof.claimData.context));
  ensure(context.reclaimSessionId === session.id && context.contextMessage === session.context_message
    && typeof context.contextAddress === "string" && getAddress(context.contextAddress) === getAddress(session.wallet),
  "SESSION_BINDING_MISMATCH", "Signed proof context does not match the server session.");
  // The Verifier owns its proof key. Possession does not establish source-account ownership.
  getAddress(proof.claimData.owner);
  const provedMs = proof.claimData.timestampS * 1000;
  ensure(Number.isSafeInteger(provedMs) && provedMs >= Date.parse(session.created_at) - 30000
    && provedMs < Date.parse(session.expires_at) && provedMs <= now + 30000,
  "PROOF_TIME_MISMATCH", "Proof was not produced in this session window.");
}

export async function verifySession(proofs: Proof[], session: Session): Promise<Evidence> {
  ensure(proofs.length === 1, "PROOF_COUNT_MISMATCH", "This route requires exactly one complete activity proof.");
  assertSessionBinding(proofs[0], session);
  const hashes = session.route === "spotify_saved_track"
    ? spotifyVerificationHashes(proofs[0].claimData.parameters, session.recipe_hash) : [session.recipe_hash];
  const result = await verifyProof(proofs, { hashes,
    ...(process.env.RECLAIM_REQUIRE_TEE_ATTESTATION === "true" ? { teeAttestation: { appSecret: requireSetting("RECLAIM_APP_SECRET") } } : {}) });
  if (!result.isVerified) {
    const failure = proofFailure(result.error);
    console.warn("early.proof_verification_failed", { sessionId: session.id, route: session.route,
      providerVersion: session.provider_version, code: failure.code,
      ...(failure.code === "INVALID_PROOF_RECIPE" && session.route === "spotify_saved_track"
        ? { recipe: spotifyRecipeDiagnostics(proofs[0].claimData.parameters, session.recipe_hash) } : {}) });
    throw new EarlyError(failure.code, failure.message, failure.status);
  }
  ensure(result.data.length === 1, "PROOF_COUNT_MISMATCH", "Unexpected number of verified records.");
  const fields = result.data[0].extractedParameters;
  const activity = session.route === "spotify_saved_track" ? spotifySavedTrackEvidence(fields)
    : session.route === "youtube_like" ? youtubeLikeEvidence(fields) : youtubeSubscriptionEvidence(fields);
  ensure(activity.targetId === session.selection.targetId || activity.artistIds.includes(session.selection.targetId), "WRONG_TARGET", "Proof does not match the selected target.");
  const provedAt = new Date(proofs[0].claimData.timestampS * 1000).toISOString();
  ensure(BigInt(activity.occurredAtMicros) <= BigInt(proofs[0].claimData.timestampS) * BigInt(1000000), "FUTURE_ACTIVITY", "Activity cannot occur after its proof.");
  return { ...activity, id: eventKey(activity.eventId), route: session.route, providerId: session.provider_id,
    providerVersion: session.provider_version, recipeHash: session.recipe_hash, provedAt, observedAt: new Date().toISOString(),
    coverage: providers[session.route].coverage };
}

export async function completeSession(proofs: Proof[], session: Session) {
  try {
    const evidence = await verifySession(proofs, session);
    const hours = Number(process.env.RAW_PROOF_RETENTION_HOURS ?? 24);
    ensure(Number.isInteger(hours) && hours >= 1 && hours <= 168, "INVALID_RETENTION", "Proof retention must be 1–168 hours.", 503);
    return await db<Evidence>("rpc/early_complete_session", "POST", { p_session: session.id, p_user: session.user_id, p_wallet: session.wallet,
      p_identifier: proofs[0].identifier, p_source: sourceKey(evidence.platform, evidence.sourceSubject), p_evidence: evidence,
      p_ciphertext: encryptRawProof(proofs), p_retention_hours: hours });
  } catch (error) {
    const code = error instanceof EarlyError ? error.code : "INVALID_EVIDENCE";
    await db(`early_sessions?${new URLSearchParams({id:`eq.${session.id}`,proof_identifier:"is.null"})}`, "PATCH", {
      last_error_code: code, last_error_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}
