import { describe, expect, it } from "vitest";
import { applyEvent, type AccountingContext, type Event } from "../indexer/monad/src/accounting";
function store<T extends {id:string}>() {
  const data=new Map<string,T>();return {data,get:async(id:string)=>data.get(id),set:(v:T)=>{data.set(v.id,structuredClone(v));}};
}
function context() { return {Benefit:store(),Creator:store(),Claim:store(),IndexedEvent:store()} as AccountingContext; }
const base={chainId:10143,address:"0xABC",tx:"0xaaa",logIndex:0,block:100,blockHash:"block-a",benefitId:BigInt(1)};
const created:Event={...base,kind:"created",creator:"0xDEF",payout:BigInt(10),capacity:BigInt(3),expiry:BigInt(2000),ruleHash:"rule",ruleVersion:BigInt(1)};
describe("event accounting",()=>{
  it("indexes funding, claim history, refunds and creator totals idempotently",async()=>{
    const c=context();
    const events:Event[]=[created,{...base,logIndex:1,kind:"funded",amount:BigInt(20),remaining:BigInt(20)},
      {...base,logIndex:2,kind:"claimed",beneficiary:"0xFAN",amount:BigInt(10),remaining:BigInt(10),claims:BigInt(1)},
      {...base,logIndex:3,kind:"closed",refund:BigInt(10)}];
    for(const e of events){await applyEvent(e,c);await applyEvent(e,c);}
    const benefit=await c.Benefit.get("10143:0xabc:1");expect(benefit).toMatchObject({funded:BigInt(20),paid:BigInt(10),refunded:BigInt(10),remaining:BigInt(0),claims:BigInt(1),closed:true});
    expect(await c.Creator.get("10143:0xabc:0xdef")).toMatchObject({funded:BigInt(20),paid:BigInt(10),refunded:BigInt(10),benefits:BigInt(1),claims:BigInt(1)});
    expect(await c.Claim.get("10143:0xaaa:2")).toMatchObject({beneficiary:"0xfan",transactionHash:"0xaaa"});
  });
  it("rejects missing creation or inconsistent remaining balances",async()=>{
    const c=context();const funding:Event={...base,logIndex:1,kind:"funded",amount:BigInt(20),remaining:BigInt(19)};
    await expect(applyEvent(funding,c)).rejects.toThrow(/Missing/);await applyEvent(created,c);await expect(applyEvent(funding,c)).rejects.toThrow(/accounting/);
  });
  it("replays deterministically after restoring pre-reorg state",async()=>{
    const a=context(),b=context();await applyEvent(created,a);await applyEvent(created,b);
    const canonical:Event={...base,tx:"canonical",block:101,blockHash:"new-block",kind:"funded",amount:BigInt(10),remaining:BigInt(10)};
    await applyEvent(canonical,a);await applyEvent(canonical,b);
    expect(await a.Benefit.get("10143:0xabc:1")).toEqual(await b.Benefit.get("10143:0xabc:1"));
  });
});
