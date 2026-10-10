import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Interface } from "ethers";
import { escrowAbi } from "../src/lib/early/escrow-interface";
const mocks = vi.hoisted(() => ({receipt:vi.fn(),block:vi.fn()}));
const escrow="0x0000000000000000000000000000000000000001";
vi.mock("../src/lib/early/chain",()=>({escrowAddress:()=>"0x0000000000000000000000000000000000000001",monad:async()=>({address:"0x0000000000000000000000000000000000000001",provider:{getTransactionReceipt:mocks.receipt,getBlock:mocks.block}})}));
import { indexedBenefit } from "../src/lib/early/indexed";
const hash=`0x${"ab".repeat(32)}`;
beforeEach(()=>{
  vi.stubEnv("ENVIO_GRAPHQL_URL","https://indexer.invalid/graphql");
  vi.stubGlobal("fetch",vi.fn(async(_url,init)=>{
    const {query}=JSON.parse(init.body);
    return {ok:true,json:async()=>({data:query.includes("BenefitProgress") ? {Benefit:[{creator:escrow}],Claim:[]} : query.includes("Progress") ? {IndexedEvent:[{blockHash:"canonical"}]} : {Creator:[]}})};
  }));
  const event=new Interface(escrowAbi).encodeEventLog(new Interface(escrowAbi).getEvent("BenefitClaimed")!,[1,escrow,`0x${"11".repeat(32)}`,10,0,1]);
  mocks.receipt.mockResolvedValue({to:"bundler-entrypoint",status:1,blockNumber:10,blockHash:"canonical",logs:[{address:escrow,index:0,...event}]});
  mocks.block.mockResolvedValue({hash:"canonical"});
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it("reconciles indexed bundled claims using canonical escrow logs",async()=>{
  expect(await indexedBenefit("1",hash)).toMatchObject({status:"indexed"});
});
it("rejects a different benefit even when the indexer reports that transaction",async()=>{
  expect(await indexedBenefit("2",hash)).toMatchObject({status:"confirmation_pending"});
});
it("does not treat a reorged bundled claim as indexed",async()=>{
  mocks.block.mockResolvedValue({hash:"reorg"});
  expect(await indexedBenefit("1",hash)).toMatchObject({status:"confirmation_pending"});
});
