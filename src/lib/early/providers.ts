import { ensure } from "./errors";
import type { RouteId } from "./model";

// Hashes derived from the reviewed provider recipes, not Early session commitments.
export const providers = {
  spotify_saved_track: {
    id: "486e7100-ea6e-4b82-b2ee-48933a05abc6", version: "1.0.5",
    hash: "0xdf3b424a388e54867e88d4363567eec332c10e77708d3a42c960f2c1eaa60c93",
    prefix: "RECLAIM_SPOTIFY_SAVED_TRACK", coverage: "selected_saved_item",
    deviceAccepted: false, ownershipAccepted: false,
  },
  youtube_subscription: {
    id: "0e7046f2-4a43-448c-9b6f-7d1423525513", version: "1.0.4",
    hash: "0x2697f9aa44ed19900aac732a90a403f35a08f9ac0e6dee3277d507f0fb47a0d9",
    prefix: "RECLAIM_YOUTUBE_SUBSCRIPTION", coverage: "loaded_english_activity_page",
    deviceAccepted: false, ownershipAccepted: false,
  },
} as const;

export function providerFor(route: RouteId) {
  const p = providers[route];
  ensure(p, "UNSUPPORTED_ROUTE", "Unsupported activity route.");
  ensure(process.env[`${p.prefix}_PROVIDER_ID`] === p.id && process.env[`${p.prefix}_PROVIDER_VERSION`] === p.version,
    "PROVIDER_CONFIGURATION_MISMATCH", "Provider configuration must match the reviewed version allowlist.", 503);
  return p;
}
export function requireRewardAcceptance(route: RouteId) {
  const p = providers[route];
  ensure(p.deviceAccepted && p.ownershipAccepted, "PROVIDER_ACCEPTANCE_PENDING",
    "Reward authorization awaits device and second-account ownership acceptance for this activity.", 409);
}

export function capabilities() {
  return [
    ...Object.entries(providers).map(([route, p]) => ({ route, state: "experimental_proof", rewardReady: p.deviceAccepted && p.ownershipAccepted,
      coverage: p.coverage, selection: "campaign_or_public_link", reason: "Device and account-ownership acceptance pending." })),
    ...["spotify_artist_library", "spotify_album_save", "spotify_presave", "spotify_listening", "youtube_like", "youtube_comment", "youtube_watch"].map(route => ({
      route, state: "unsupported", rewardReady: false, coverage: "not_accepted", selection: "unavailable",
      reason: "This route has not completed reusable proof and ownership validation.",
    })),
  ];
}
