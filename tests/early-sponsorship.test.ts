import { Interface } from "ethers";
import { expect, it, vi } from "vitest";
import { escrowAbi } from "../src/lib/early/escrow-interface";
import { sendSponsoredClaim } from "../src/lib/early/sponsored-claim";
import { escrowEvents } from "../src/lib/early/receipt-events";

const escrow = "0x0000000000000000000000000000000000000001";
const wallet = "0x0000000000000000000000000000000000000002";
const iface = new Interface(escrowAbi);
function transaction(beneficiary = wallet, expiry = Math.floor(Date.now() / 1000) + 600) {
  return { to: escrow, chainId: "0x279f", value: "0x0", data: iface.encodeFunctionData("claim", [
    [1, beneficiary, 10, expiry, `0x${"11".repeat(32)}`, `0x${"22".repeat(32)}`, 1, 1], "0x1234",
  ]) };
}
it("requests sponsorship for the exact embedded wallet without requiring a native balance", async () => {
  const send = vi.fn().mockResolvedValue({ hash: `0x${"ab".repeat(32)}` });
  const tx = transaction();
  await expect(sendSponsoredClaim(tx, wallet, escrow, send)).resolves.toHaveProperty("hash");
  expect(send).toHaveBeenCalledExactlyOnceWith({to:escrow,data:tx.data,value:BigInt(0),chainId:10143},{sponsor:true,address:wallet});
});
it("never retries a rejected sponsorship request as a user-paid transaction", async () => {
  const failure = new Error("insufficient sponsorship credits");
  const send = vi.fn().mockRejectedValue(failure);
  await expect(sendSponsoredClaim(transaction(), wallet, escrow, send)).rejects.toBe(failure);
  expect(send).toHaveBeenCalledOnce();
});
it("blocks other chains, contracts, methods, recipients, expired claims and value transfers", async () => {
  const tx = transaction();
  const send = vi.fn();
  for (const invalid of [{...tx,chainId:"143"},{...tx,to:wallet},{...tx,value:"1"},
    {...tx,data:iface.encodeFunctionData("fund",[1])}, transaction(escrow), transaction(wallet,1), {...tx,data:"0x1234"}]) {
    await expect(sendSponsoredClaim(invalid, wallet, escrow, send)).rejects.toThrow();
  }
  await expect(sendSponsoredClaim(tx, wallet, undefined, send)).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("extracts only authentic escrow events from a bundled transaction", () => {
  const event = iface.encodeEventLog(iface.getEvent("BenefitClaimed")!,[1,wallet,`0x${"11".repeat(32)}`,10,0,1]);
  expect(escrowEvents([{...event,address:wallet,index:0},{...event,address:escrow,index:1}],escrow))
    .toEqual([{name:"BenefitClaimed",benefitId:"1",wallet,logIndex:1}]);
});
