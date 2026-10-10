import { ensure, requireSetting } from "./errors";
import { escrowAddress, monad } from "./chain";
import { escrowEvents } from "./receipt-events";

export async function indexedBenefit(benefitId: string, txHash?: string) {
  ensure(/^[1-9]\d{0,77}$/.test(benefitId), "INVALID_BENEFIT", "Invalid benefit ID.");
  if (!process.env.ENVIO_GRAPHQL_URL) return { status: "not_configured", benefit: null, claims: [], creator: null };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ENVIO_GRAPHQL_AUTH_TOKEN) {
    const header = requireSetting("ENVIO_GRAPHQL_AUTH_HEADER");
    ensure(/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(header) && !/^(host|cookie|content-length)$/i.test(header), "INVALID_INDEXER_AUTH", "Configure the endpoint's documented authentication header.", 503);
    headers[header] = process.env.ENVIO_GRAPHQL_AUTH_TOKEN;
  }
  const id = `10143:${escrowAddress().toLowerCase()}:${benefitId}`;
  try {
    const response = await fetch(requireSetting("ENVIO_GRAPHQL_URL"), {
      method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ query: `query BenefitProgress($id:String!){ Benefit(where:{id:{_eq:$id}}){id creator payout capacity expiry funded paid refunded remaining claims closed lastBlock} Claim(where:{benefit:{_eq:$id}},order_by:{block:desc},limit:50){id beneficiary amount transactionHash block} }`, variables: { id } }),
    });
    if (!response.ok) return { status: "unavailable", benefit: null, claims: [], creator: null };
    const result = await response.json();
    if (result.errors) return { status: "unavailable", benefit: null, claims: [], creator: null };
    const benefit = result.data?.Benefit?.[0] ?? null;
    const claims = result.data?.Claim ?? [];
    let indexed = Boolean(benefit);
    if (txHash) {
      ensure(/^0x[0-9a-fA-F]{64}$/.test(txHash), "INVALID_TRANSACTION", "Invalid transaction hash.");
      const eventResponse = await fetch(requireSetting("ENVIO_GRAPHQL_URL"), { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ query: "query Progress($tx:String!,$id:String!){IndexedEvent(where:{transactionHash:{_eq:$tx},benefit:{_eq:$id}},limit:1){id blockHash}}", variables: { tx: txHash.toLowerCase(), id } }) });
      const eventData = await eventResponse.json();
      const indexedEvent = eventData.data?.IndexedEvent?.[0];
      const { provider, address } = await monad();
      const receipt = await provider.getTransactionReceipt(txHash);
      const block = receipt ? await provider.getBlock(receipt.blockNumber) : null;
      if (!receipt || receipt.status !== 1 || block?.hash !== receipt.blockHash ||
          !escrowEvents(receipt.logs, address).some(event => event.benefitId === benefitId))
        return { status: "confirmation_pending", benefit: null, claims: [], creator: null };
      indexed = eventResponse.ok && !eventData.errors && Boolean(indexedEvent) && indexedEvent.blockHash === receipt.blockHash;
    }
    let creator = null;
    if (benefit) {
      const creatorResponse = await fetch(requireSetting("ENVIO_GRAPHQL_URL"), { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ query: "query CreatorTotals($id:String!){Creator(where:{id:{_eq:$id}}){id funded paid refunded benefits claims}}", variables: { id: `10143:${escrowAddress().toLowerCase()}:${benefit.creator.toLowerCase()}` } }) });
      const c = await creatorResponse.json(); creator = c.data?.Creator?.[0] ?? null;
    }
    return { status: indexed ? "indexed" : "syncing", benefit, claims, creator };
  } catch { return { status: "unavailable", benefit: null, claims: [], creator: null }; }
}
