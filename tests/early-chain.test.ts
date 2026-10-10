import { beforeEach, expect, it, vi } from "vitest";
import { Interface } from "ethers";
const mocks=vi.hoisted(()=>({receipt:vi.fn(),network:vi.fn(),block:vi.fn(),blockNumber:vi.fn(),code:vi.fn(),db:vi.fn()}));
vi.mock("../src/lib/early/store",()=>({db:mocks.db}));
vi.mock("ethers",async importOriginal=>{
  const original=await importOriginal<typeof import("ethers")>();
  return {...original,JsonRpcProvider:class {
    getNetwork=mocks.network;getCode=mocks.code;getTransactionReceipt=mocks.receipt;getBlock=mocks.block;getBlockNumber=mocks.blockNumber;
  }};
});
import { reconcileReceipt } from "../src/lib/early/chain";
import { escrowAbi } from "../src/lib/early/escrow-interface";
const address="0x0000000000000000000000000000000000000001",wallet="0x0000000000000000000000000000000000000002",tx=`0x${"ab".repeat(32)}`;
beforeEach(()=>{
  vi.stubEnv("MONAD_RPC_URL","https://example.invalid");vi.stubEnv("NEXT_PUBLIC_MONAD_CHAIN_ID","10143");vi.stubEnv("NEXT_PUBLIC_MONAD_ESCROW_ADDRESS",address);
  mocks.db.mockReset();mocks.db.mockResolvedValue([]);mocks.network.mockResolvedValue({chainId:BigInt(10143)});mocks.code.mockResolvedValue("0x6000");mocks.block.mockResolvedValue({hash:"canonical"});mocks.blockNumber.mockResolvedValue(11);
  const iface=new Interface(escrowAbi);const event=iface.encodeEventLog(iface.getEvent("BenefitFunded")!,[1,wallet,100,100]);
  mocks.receipt.mockResolvedValue({to:address,from:wallet,status:1,blockNumber:10,blockHash:"canonical",logs:[{address,index:0,...event}]});
});
it("does not equate a submitted hash with confirmation",async()=>{
  mocks.receipt.mockResolvedValue(null);expect(await reconcileReceipt(tx,"user",wallet)).toMatchObject({status:"submitted"});expect(mocks.db).not.toHaveBeenCalled();
});
it("requires two confirmations and verifies final event content server-side",async()=>{
  mocks.blockNumber.mockResolvedValue(10);expect(await reconcileReceipt(tx,"user",wallet)).toMatchObject({status:"confirming"});expect(mocks.db).not.toHaveBeenCalled();
  mocks.blockNumber.mockResolvedValue(11);expect(await reconcileReceipt(tx,"user",wallet)).toMatchObject({status:"confirmed",events:[{name:"BenefitFunded",benefitId:"1",logIndex:0}]});expect(mocks.db).toHaveBeenCalledOnce();
});
it("rejects reverted payments without recording success",async()=>{
  mocks.receipt.mockResolvedValue({to:address,from:wallet,status:0});await expect(reconcileReceipt(tx,"user",wallet)).rejects.toMatchObject({code:"TRANSACTION_REVERTED"});expect(mocks.db).not.toHaveBeenCalled();
});
it("rejects unrelated transactions and reorged blocks",async()=>{
  await expect(reconcileReceipt(tx,"user",address)).rejects.toMatchObject({code:"TRANSACTION_MISMATCH"});
  mocks.block.mockResolvedValue({hash:"changed"});await expect(reconcileReceipt(tx,"user",wallet)).rejects.toMatchObject({code:"REORG_PENDING"});expect(mocks.db).not.toHaveBeenCalled();
});
it("rejects mainnet and an undeployed escrow",async()=>{
  mocks.network.mockResolvedValue({chainId:BigInt(143)});await expect(reconcileReceipt(tx,"user",wallet)).rejects.toMatchObject({code:"WRONG_NETWORK"});
  mocks.network.mockResolvedValue({chainId:BigInt(10143)});mocks.code.mockResolvedValue("0x");await expect(reconcileReceipt(tx,"user",wallet)).rejects.toMatchObject({code:"ESCROW_NOT_DEPLOYED"});
});
it("confirms a bundled claim by its beneficiary and isolates other users' events",async()=>{
  const other="0x0000000000000000000000000000000000000003";
  const iface=new Interface(escrowAbi);
  const log=(beneficiary:string,index:number)=>({address,index,...iface.encodeEventLog(iface.getEvent("BenefitClaimed")!,[index+1,beneficiary,`0x${"11".repeat(32)}`,10,0,1])});
  mocks.receipt.mockResolvedValue({to:other,from:other,status:1,blockNumber:10,blockHash:"canonical",logs:[log(wallet,0),log(other,1)]});
  expect(await reconcileReceipt(tx,"user",wallet)).toMatchObject({status:"confirmed",events:[{name:"BenefitClaimed",benefitId:"1",logIndex:0}]});
  expect(mocks.db.mock.calls[0][0]).toContain("on_conflict=chain_id,tx_hash,wallet");
  await expect(reconcileReceipt(tx,"intruder",address)).rejects.toMatchObject({code:"TRANSACTION_MISMATCH"});
  mocks.receipt.mockResolvedValue({to:other,from:other,status:1,blockNumber:10,blockHash:"canonical",logs:[{...log(wallet,0),address:other}]});
  await expect(reconcileReceipt(tx,"user",wallet)).rejects.toMatchObject({code:"TRANSACTION_MISMATCH"});
});
