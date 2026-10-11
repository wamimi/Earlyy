import { hashProofClaimParams } from "@reclaimprotocol/js-sdk";
import { spotifyRecipeReference } from "./recipe-diagnostics";

/** Instantiate only the two reviewed body placeholders; never rewrite a signed proof. */
export function spotifyVerificationHashes(parameters: string, pinnedHash: string): string[] {
  const hashes = [pinnedHash];
  try {
    if (parameters.length > 1048576 || !hashProofClaimParams(spotifyRecipeReference).includes(pinnedHash)) return hashes;
    const actual = JSON.parse(parameters);
    if (typeof actual?.body !== "string") return hashes;
    const body = JSON.parse(actual.body);
    const uri = body?.variables?.uri, offset = body?.variables?.offset;
    if (typeof uri !== "string" || !/^spotify:playlist:[A-Za-z0-9]{22}$/.test(uri)
      || !Number.isSafeInteger(offset) || offset < 0) return hashes;
    const expectedBody = spotifyRecipeReference.body.replace("{{collection_uri}}", uri).replace("{{offset}}", String(offset));
    // Exact equality also rejects extra fields, duplicate JSON keys and changed query constants.
    if (actual.body !== expectedBody) return hashes;
    if (!Array.isArray(actual.responseMatches) || actual.responseMatches.length !== 4
      || actual.responseMatches.some((match: { isOptional?: unknown } | null) => !match || Boolean(match.isOptional))
      || !Array.isArray(actual.responseRedactions) || actual.responseRedactions.length !== 4) return hashes;
    // Hash the trusted recipe with validated substitutions, not caller-supplied selectors or URL.
    const instantiated = hashProofClaimParams({ ...spotifyRecipeReference, body: expectedBody });
    return Array.isArray(instantiated) ? instantiated : [instantiated];
  } catch { return hashes; }
}
