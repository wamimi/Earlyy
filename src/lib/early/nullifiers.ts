import { createHmac } from "node:crypto";
import { ensure, requireSetting } from "./errors";

function keyed(domain: string, parts: string[]) {
  ensure(requireSetting("EARLY_SOURCE_NULLIFIER_KEY_VERSION") === "1", "KEY_ROTATION_REQUIRES_MIGRATION", "Nullifier key rotation requires a durable binding migration.", 503);
  const key = Buffer.from(requireSetting("EARLY_SOURCE_NULLIFIER_SECRET"), "base64");
  ensure(key.length === 32, "INVALID_NULLIFIER_KEY", "Nullifier key must be 32 bytes.", 503);
  return `0x${createHmac("sha256", key).update(JSON.stringify([domain, 1, ...parts])).digest("hex")}`;
}
export const sourceKey = (platform: string, subject: string) => keyed("early.source/v3", [platform, subject]);
export const eventKey = (identity: string) => keyed("early.event/v3", [identity]);
export const sourceNullifier = (benefitKey: string, source: string) => keyed("early.entitlement/v3", [benefitKey, source]);
