export type Benefit = {
  id: string; creator: string; payout: bigint; capacity: bigint; expiry: bigint;
  ruleHash: string; ruleVersion: bigint; funded: bigint; paid: bigint; refunded: bigint;
  remaining: bigint; claims: bigint; closed: boolean; lastBlock: number;
};
export type Creator = { id: string; funded: bigint; paid: bigint; refunded: bigint; benefits: bigint; claims: bigint };
export type Claim = { id: string; benefit: string; beneficiary: string; amount: bigint; transactionHash: string; block: number };
export type IndexedEvent = { id: string; benefit: string; transactionHash: string; block: number; blockHash: string };
export type Event = { chainId: number; address: string; tx: string; logIndex: number; block: number; blockHash: string; benefitId: bigint } & (
  | { kind: "created"; creator: string; payout: bigint; capacity: bigint; expiry: bigint; ruleHash: string; ruleVersion: bigint }
  | { kind: "funded"; amount: bigint; remaining: bigint }
  | { kind: "claimed"; beneficiary: string; amount: bigint; remaining: bigint; claims: bigint }
  | { kind: "closed"; refund: bigint }
);
type Entity<T> = { get(id: string): Promise<T | undefined>; set(value: T): void };
export type AccountingContext = { Benefit: Entity<Benefit>; Creator: Entity<Creator>; Claim: Entity<Claim>; IndexedEvent: Entity<IndexedEvent> };

export async function applyEvent(event: Event, context: AccountingContext) {
  const prefix = `${event.chainId}:${event.address.toLowerCase()}`;
  const id = `${prefix}:${event.benefitId}`;
  const eventId = `${event.chainId}:${event.tx.toLowerCase()}:${event.logIndex}`;
  if (await context.IndexedEvent.get(eventId)) return;
  const previous = await context.Benefit.get(id);
  let b: Benefit;
  if (event.kind === "created") {
    if (previous) throw new Error("Duplicate benefit creation");
    b = { id, creator: event.creator.toLowerCase(), payout: event.payout, capacity: event.capacity, expiry: event.expiry,
      ruleHash: event.ruleHash, ruleVersion: event.ruleVersion, funded: BigInt(0), paid: BigInt(0), refunded: BigInt(0), remaining: BigInt(0), claims: BigInt(0), closed: false, lastBlock: event.block };
  } else {
    if (!previous) throw new Error("Missing benefit creation; start at the deployment block");
    b = { ...previous, lastBlock: event.block };
    if (b.closed) throw new Error("Event after closure");
    if (event.kind === "funded") { b.funded += event.amount; b.remaining = event.remaining; }
    if (event.kind === "claimed") { b.paid += event.amount; b.remaining = event.remaining; b.claims = event.claims; }
    if (event.kind === "closed") { b.refunded += event.refund; b.remaining = BigInt(0); b.closed = true; }
  }
  if (b.funded !== b.paid + b.refunded + b.remaining || b.remaining < BigInt(0) || b.claims > b.capacity) throw new Error("Escrow accounting mismatch");
  const creatorId = `${prefix}:${b.creator}`;
  const c = { ...(await context.Creator.get(creatorId) ?? { id: creatorId, funded: BigInt(0), paid: BigInt(0), refunded: BigInt(0), benefits: BigInt(0), claims: BigInt(0) }) };
  if (event.kind === "created") c.benefits++;
  if (event.kind === "funded") c.funded += event.amount;
  if (event.kind === "claimed") {
    c.paid += event.amount; c.claims++;
    context.Claim.set({ id: eventId, benefit: id, beneficiary: event.beneficiary.toLowerCase(), amount: event.amount, transactionHash: event.tx.toLowerCase(), block: event.block });
  }
  if (event.kind === "closed") c.refunded += event.refund;
  context.Benefit.set(b); context.Creator.set(c);
  context.IndexedEvent.set({ id: eventId, benefit: id, transactionHash: event.tx.toLowerCase(), block: event.block, blockHash: event.blockHash });
}
