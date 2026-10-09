export const authorizationTypes = {
  Authorization: [
    { name: "benefitId", type: "uint256" }, { name: "beneficiary", type: "address" },
    { name: "amount", type: "uint256" }, { name: "expiry", type: "uint256" },
    { name: "sourceNullifier", type: "bytes32" }, { name: "ruleHash", type: "bytes32" },
    { name: "ruleVersion", type: "uint256" }, { name: "signerEpoch", type: "uint256" },
  ],
};
export type Authorization = {
  benefitId: string; beneficiary: string; amount: string; expiry: string;
  sourceNullifier: string; ruleHash: string; ruleVersion: string; signerEpoch: string;
};
export const escrowAbi = [
  "function createBenefit(uint256 payout,uint256 capacity,uint256 expiry,bytes32 ruleHash,uint256 ruleVersion) payable returns(uint256)",
  "function fund(uint256 id) payable",
  "function close(uint256 id)",
  "function claim((uint256 benefitId,address beneficiary,uint256 amount,uint256 expiry,bytes32 sourceNullifier,bytes32 ruleHash,uint256 ruleVersion,uint256 signerEpoch) a,bytes signature)",
  "function benefits(uint256) view returns(address creator,uint256 payout,uint256 capacity,uint256 expiry,bytes32 ruleHash,uint256 ruleVersion,uint256 funded,uint256 paid,uint256 refunded,uint256 remaining,uint256 claims,bool closed)",
  "function consumed(uint256,bytes32) view returns(bool)",
  "function claimedWallet(uint256,address) view returns(bool)",
  "function eligibilitySigner() view returns(address)",
  "function signerEpoch() view returns(uint256)",
  "event BenefitCreated(uint256 indexed benefitId,address indexed creator,uint256 payout,uint256 capacity,uint256 expiry,bytes32 ruleHash,uint256 ruleVersion)",
  "event BenefitFunded(uint256 indexed benefitId,address indexed creator,uint256 amount,uint256 remaining)",
  "event BenefitClaimed(uint256 indexed benefitId,address indexed beneficiary,bytes32 indexed sourceNullifier,uint256 amount,uint256 remaining,uint256 claims)",
  "event BenefitClosed(uint256 indexed benefitId,address indexed creator,uint256 refund)",
] as const;
export function authorizationDomain(address: string) {
  return { name: "EarlyBenefitEscrow", version: "1", chainId: 10143, verifyingContract: address };
}
function publicEndpoint(value: string | undefined, official: string) {
  if (value && value !== official) throw new Error("Only the official public Monad testnet endpoint is allowed in browser configuration.");
  return value || official;
}
export const monadTestnet = {
  id: 10143, name: "Monad Testnet", nativeCurrency: { name: "Test MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [publicEndpoint(process.env.NEXT_PUBLIC_MONAD_RPC_URL, "https://testnet-rpc.monad.xyz")] } },
  blockExplorers: { default: { name: "MonadVision", url: publicEndpoint(process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL, "https://testnet.monadvision.com") } },
  testnet: true,
};
