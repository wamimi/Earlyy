import { indexer } from "envio";
import { applyEvent } from "./accounting.js";
const fields = { transaction: ["hash"], block: ["hash"] } as const;
indexer.onEvent({ contract: "EarlyBenefitEscrow", event: "BenefitCreated", fields }, async ({ event, context }) => {
  await applyEvent({ kind: "created", chainId: event.chainId, address: event.srcAddress, tx: event.transaction.hash,
    logIndex: event.logIndex, block: event.block.number, blockHash: event.block.hash, ...event.params }, context);
});
indexer.onEvent({ contract: "EarlyBenefitEscrow", event: "BenefitFunded", fields }, async ({ event, context }) => {
  await applyEvent({ kind: "funded", chainId: event.chainId, address: event.srcAddress, tx: event.transaction.hash,
    logIndex: event.logIndex, block: event.block.number, blockHash: event.block.hash, ...event.params }, context);
});
indexer.onEvent({ contract: "EarlyBenefitEscrow", event: "BenefitClaimed", fields }, async ({ event, context }) => {
  await applyEvent({ kind: "claimed", chainId: event.chainId, address: event.srcAddress, tx: event.transaction.hash,
    logIndex: event.logIndex, block: event.block.number, blockHash: event.block.hash, ...event.params }, context);
});
indexer.onEvent({ contract: "EarlyBenefitEscrow", event: "BenefitClosed", fields }, async ({ event, context }) => {
  await applyEvent({ kind: "closed", chainId: event.chainId, address: event.srcAddress, tx: event.transaction.hash,
    logIndex: event.logIndex, block: event.block.number, blockHash: event.block.hash, ...event.params }, context);
});
