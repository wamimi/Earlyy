import { Wallet } from "ethers";
import { authorizationDomain, authorizationTypes, type Authorization } from "./escrow-interface";
import { ensure, requireSetting } from "./errors";

export interface EligibilitySigner {
  address: string;
  sign(address: string, authorization: Authorization): Promise<string>;
}
export function localTestnetSigner(): EligibilitySigner {
  ensure(requireSetting("EARLY_ELIGIBILITY_SIGNER_MODE") === "local-testnet" && requireSetting("NEXT_PUBLIC_MONAD_CHAIN_ID") === "10143",
    "SIGNER_MODE_UNAVAILABLE", "Only the explicit local testnet signer is implemented.", 503);
  const signer = new Wallet(requireSetting("EARLY_ELIGIBILITY_PRIVATE_KEY"));
  return { address: signer.address, sign: (address, a) => signer.signTypedData(authorizationDomain(address), authorizationTypes, a) };
}
