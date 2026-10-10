import { getAddress, Interface, ZeroAddress } from "ethers";
import { escrowAbi } from "./escrow-interface";

export type ClaimTransaction = { to: string; data: string; value: string; chainId: string };
type SponsorSender = (transaction: { to: string; data: string; value: bigint; chainId: number }, options: { sponsor: true; address: string }) => Promise<{ hash: string }>;

export async function sendSponsoredClaim(transaction: ClaimTransaction, wallet: string, escrow: string | undefined, send: SponsorSender) {
  if (!escrow || getAddress(escrow) === ZeroAddress || getAddress(transaction.to) !== getAddress(escrow) || BigInt(transaction.chainId) !== BigInt(10143) || BigInt(transaction.value) !== BigInt(0)) {
    throw new Error("Sponsorship is only available for Early claims on Monad testnet.");
  }
  const claim = new Interface(escrowAbi).parseTransaction({ data: transaction.data });
  if (claim?.name !== "claim" || getAddress(claim.args.a.beneficiary) !== getAddress(wallet)) {
    throw new Error("The reward claim does not match your wallet.");
  }
  if (claim.args.a.expiry <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("Authorization expired. Click claim again to refresh it.");
  // No native-balance check or fallback: a sponsored request must never silently charge the fan.
  return send({ to: escrow, data: transaction.data, value: BigInt(0), chainId: 10143 }, { sponsor: true, address: wallet });
}
