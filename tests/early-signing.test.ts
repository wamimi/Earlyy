import { Wallet, verifyTypedData, Interface } from "ethers";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { localTestnetSigner } from "../src/lib/early/signing";
import { authorizationDomain, authorizationTypes, escrowAbi, type Authorization } from "../src/lib/early/escrow-interface";
it("signs the exact escrow authorization domain and every field",async()=>{
  const key=Wallet.createRandom();vi.stubEnv("EARLY_ELIGIBILITY_PRIVATE_KEY",key.privateKey);vi.stubEnv("EARLY_ELIGIBILITY_SIGNER_MODE","local-testnet");vi.stubEnv("NEXT_PUBLIC_MONAD_CHAIN_ID","10143");
  const address="0x0000000000000000000000000000000000000123";
  const a:Authorization={benefitId:"1",beneficiary:key.address,amount:"10",expiry:"2000000000",sourceNullifier:`0x${"11".repeat(32)}`,ruleHash:`0x${"22".repeat(32)}`,ruleVersion:"1",signerEpoch:"1"};
  const signature=await localTestnetSigner().sign(address,a);
  expect(verifyTypedData(authorizationDomain(address),authorizationTypes,a,signature)).toBe(key.address);
  for(const field of Object.keys(a) as (keyof Authorization)[]) {
    const value=field==="beneficiary"?address:field==="sourceNullifier"||field==="ruleHash"?`0x${"33".repeat(32)}`:(BigInt(a[field])+BigInt(1)).toString();
    expect(verifyTypedData(authorizationDomain(address),authorizationTypes,{...a,[field]:value},signature)).not.toBe(key.address);
  }
  expect(verifyTypedData({...authorizationDomain(address),chainId:1},authorizationTypes,a,signature)).not.toBe(key.address);
  vi.stubEnv("NEXT_PUBLIC_MONAD_CHAIN_ID","1");expect(()=>localTestnetSigner()).toThrow(/testnet/);
});
it("matches every application function/event selector to the compiled Solidity ABI",()=>{
  const compiled=new Interface(JSON.parse(readFileSync("indexer/monad/abis/EarlyBenefitEscrow.json","utf8")));
  const app=new Interface(escrowAbi);
  app.forEachFunction(f=>expect(compiled.getFunction(f.format("sighash"))?.selector).toBe(f.selector));
  app.forEachEvent(e=>expect(compiled.getEvent(e.format("sighash"))?.topicHash).toBe(e.topicHash));
});
