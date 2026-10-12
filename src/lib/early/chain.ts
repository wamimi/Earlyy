import { Contract, Interface, JsonRpcProvider, getAddress, toBeHex } from "ethers";
import { ensure, requireSetting } from "./errors";
import { escrowAbi, type Authorization } from "./escrow-interface";
import { db, one, type StoredRule } from "./store";
import { matchesBenefit } from "./benefit-terms";
import { escrowEvents } from "./receipt-events";

export function escrowAddress() { return getAddress(requireSetting("NEXT_PUBLIC_MONAD_ESCROW_ADDRESS")); }
export async function monad() {
  ensure(requireSetting("NEXT_PUBLIC_MONAD_CHAIN_ID") === "10143", "WRONG_NETWORK", "Monad testnet chain 10143 is required.", 503);
  const provider = new JsonRpcProvider(requireSetting("MONAD_RPC_URL"));
  ensure((await provider.getNetwork()).chainId === BigInt(10143), "WRONG_NETWORK", "RPC is not Monad testnet.", 503);
  const address = escrowAddress();
  ensure(await provider.getCode(address) !== "0x", "ESCROW_NOT_DEPLOYED", "No escrow contract exists at the configured address.", 503);
  return { provider, contract: new Contract(address, escrowAbi, provider), address };
}
export async function benefitSnapshot(id: string) {
  ensure(/^[1-9]\d{0,77}$/.test(id), "INVALID_BENEFIT", "Invalid benefit ID.");
  const { provider, contract, address } = await monad();
  const block = await provider.getBlock("latest");
  ensure(block, "RPC_UNAVAILABLE", "Latest block is unavailable.", 503);
  const [b, signer, epoch] = await Promise.all([contract.benefits(id, { blockTag: block.number }),
    contract.eligibilitySigner({ blockTag: block.number }), contract.signerEpoch({ blockTag: block.number })]);
  ensure(b.creator !== "0x0000000000000000000000000000000000000000", "BENEFIT_NOT_FOUND", "Benefit not found.", 404);
  return { provider, contract, address, block, b, signer: getAddress(signer), epoch: epoch.toString() };
}

export function transactionData(action: "create" | "fund" | "claim" | "refund", args: unknown[], value = "0") {
  const iface = new Interface(escrowAbi);
  return { chainId: "0x279f", to: escrowAddress(), data: iface.encodeFunctionData(
    { create: "createBenefit", fund: "fund", claim: "claim", refund: "close" }[action], args), value: toBeHex(BigInt(value)) };
}
export function claimTransaction(payload: Authorization, signature: string) {
  return transactionData("claim", [payload, signature]);
}

export async function reconcileReceipt(txHash: string, userId: string, wallet: string) {
  ensure(/^0x[a-fA-F0-9]{64}$/.test(txHash), "INVALID_TRANSACTION", "Invalid transaction hash.");
  const { provider, address } = await monad();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return { status: "submitted", txHash };
  ensure(receipt.status === 1, "TRANSACTION_REVERTED", "The transaction reverted.", 409);
  const direct = receipt.to?.toLowerCase() === address.toLowerCase() && receipt.from.toLowerCase() === wallet.toLowerCase();
  // Bundlers can include several users: only this wallet's escrow events belong to its receipt record.
  const events = escrowEvents(receipt.logs, address)
    .filter(event => event.wallet === wallet.toLowerCase() && (direct || event.name === "BenefitClaimed"))
    .map(({ name, benefitId, logIndex }) => ({ name, benefitId, logIndex }));
  ensure(events.length > 0, "TRANSACTION_MISMATCH", "No escrow event belongs to this wallet.");
  const block = await provider.getBlock(receipt.blockNumber);
  ensure(block?.hash === receipt.blockHash, "REORG_PENDING", "Transaction block changed; waiting for confirmation.", 409);
  const confirmations = (await provider.getBlockNumber()) - receipt.blockNumber + 1;
  if (confirmations < 2) return { status: "confirming", txHash, confirmations };
  await db("early_chain_receipts?on_conflict=chain_id,tx_hash,wallet", "POST", { chain_id: 10143, tx_hash: txHash.toLowerCase(),
    user_id: userId, wallet: wallet.toLowerCase(), block_number: receipt.blockNumber, block_hash: receipt.blockHash, events });
  for (const event of events.filter(e => e.name === "BenefitCreated")) {
    const snapshot = await benefitSnapshot(event.benefitId);
    const rule = await one<StoredRule>("early_rules", { commitment: snapshot.b.ruleHash, creator_wallet: getAddress(snapshot.b.creator) });
    if (rule && matchesBenefit(rule, snapshot.b)) {
      await db("early_benefit_links?on_conflict=chain_id,contract_address,benefit_id", "POST", {
        chain_id:10143, contract_address:address.toLowerCase(), benefit_id:event.benefitId,
        rule_id:rule.id, transaction_hash:txHash.toLowerCase(),
      });
    }
  }
  return { status: "confirmed", txHash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, events };
}
