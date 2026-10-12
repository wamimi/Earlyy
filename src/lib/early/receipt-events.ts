import { Interface } from "ethers";
import { escrowAbi } from "./escrow-interface";

type ReceiptLog = { address: string; topics: readonly string[]; data: string; index: number };
const iface = new Interface(escrowAbi);

export function escrowEvents(logs: readonly ReceiptLog[], escrow: string) {
  return logs.filter(log => log.address.toLowerCase() === escrow.toLowerCase()).flatMap(log => {
    try {
      const event = iface.parseLog(log);
      if (!event || !["BenefitCreated", "BenefitFunded", "BenefitClaimed", "BenefitClosed"].includes(event.name)) return [];
      return [{ name: event.name, benefitId: event.args.benefitId.toString(), logIndex: log.index,
        wallet: String(event.name === "BenefitClaimed" ? event.args.beneficiary : event.args.creator).toLowerCase() }];
    } catch { return []; }
  });
}
