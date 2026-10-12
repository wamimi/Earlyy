import { hashProofClaimParams } from "@reclaimprotocol/js-sdk";

const item = '\\{"addedAt":\\{"isoString":"[^"\\\\]+"\\}[\\s\\S]*?"uid":"[^"\\\\]+"\\}';
/** Reviewed 1.0.5 reference; regression-tested against the provider authoring recipe. */
export const spotifyRecipeReference = {
  url: "https://api-partner.spotify.com/pathfinder/v2/query", method: "POST" as const,
  body: '{"variables":{"uri":"{{collection_uri}}","offset":{{offset}},"limit":1,"enableWatchFeedEntrypoint":true,"includeEpisodeContentRatingsV2":true},"operationName":"fetchPlaylist","extensions":{"persistedQuery":{"version":1,"sha256Hash":"8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a"}}}',
  responseMatches: [
    {type:"regex" as const,value:`(?<saved_item>${item})`},
    {type:"regex" as const,value:'"ownerV2":\\{"data":\\{[\\s\\S]*?"uri":"(?<collection_owner>spotify:user:[A-Za-z0-9]+)"'},
    {type:"contains" as const,value:'"format":"liked-songs"'},
    {type:"contains" as const,value:'"canEditItems":true'},
  ].map(match => ({...match,invert:false,isOptional:false})),
  responseRedactions: [
    {jsonPath:"$.data.playlistV2.content",regex:item},
    {jsonPath:"$.data.playlistV2.ownerV2"},
    {jsonPath:"$.data.playlistV2.format",regex:'"format":"liked-songs"'},
    {jsonPath:"$.data.playlistV2.currentUserCapabilities.canEditItems",regex:'"canEditItems":true'},
  ].map(redaction => ({...redaction,regex:redaction.regex ?? "",xPath:""})),
};
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function bodyKind(value: unknown) {
  if (value === spotifyRecipeReference.body) return "template";
  if (value === "" || value == null) return "empty";
  if (typeof value !== "string") return "invalid_type";
  try {
    const body = JSON.parse(value);
    if (!object(body) || !object(body.variables)) return "other";
    const {uri,offset} = body.variables;
    if (typeof uri !== "string" || !/^spotify:playlist:[a-zA-Z0-9]{22}$/.test(uri) || !Number.isSafeInteger(offset) || Number(offset)<0) return "other";
    const expected = spotifyRecipeReference.body.replace("{{collection_uri}}",uri).replace("{{offset}}",String(offset));
    return value === expected ? "resolved_template" : "other";
  } catch { return "other"; }
}

/** Returns fixed labels only; no request values, source identity, proof data or hashes. */
export function spotifyRecipeDiagnostics(parameters: unknown, expectedHash: string) {
  try {
    if (!hashProofClaimParams(spotifyRecipeReference).includes(expectedHash)) return {state:"reference_mismatch"};
    if (typeof parameters !== "string" || parameters.length > 1048576) return {state:"invalid_parameters"};
    const actual: unknown = JSON.parse(parameters);
    if (!object(actual)) return {state:"invalid_parameters"};
    // Bound SDK optional-subset expansion before passing untrusted arrays to its hasher.
    if (!Array.isArray(actual.responseMatches) || !Array.isArray(actual.responseRedactions) || actual.responseMatches.length > 8 || actual.responseRedactions.length > 8)
      return {state:"unexpected_selectors"};
    const fields = ["url","method","body","responseMatches","responseRedactions"] as const;
    const differences = fields.filter(field => {
      const variant = {...spotifyRecipeReference,[field]:actual[field]};
      try { return !hashProofClaimParams(variant).includes(expectedHash); } catch { return true; }
    });
    return {state:"compared",differences,bodyKind:bodyKind(actual.body),matchCount:actual.responseMatches.length,redactionCount:actual.responseRedactions.length};
  } catch { return {state:"invalid_parameters"}; }
}
