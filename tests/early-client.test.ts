import { expect, it, vi } from "vitest";
import { createEarlyClient } from "../src/lib/early/client";

const wallet = "0x0000000000000000000000000000000000000001";
const selection = {route:"youtube_subscription" as const,targetId:`UC${"a".repeat(22)}`,cutoff:"2026-10-01T00:00:00.000Z"};
it("requires explicit consent before any support inspection or proof request", () => {
  const transport = vi.fn();const token=vi.fn();const client=createEarlyClient({wallet,getAccessToken:token},transport);
  expect(()=>client.inspect("campaign",false)).toThrow(/Consent/);
  expect(()=>client.startVerification("campaign",selection,false)).toThrow(/Consent/);
  expect(token).not.toHaveBeenCalled();expect(transport).not.toHaveBeenCalled();
});
it("binds each request to the current access token, wallet, campaign and selected alternative",async()=>{
  const transport=vi.fn().mockImplementation(async()=>Response.json({sessionId:"s",requestUrl:"https://reclaimprotocol.org/verify",rewardReady:false}));
  const token=vi.fn().mockResolvedValueOnce("first-token").mockResolvedValueOnce("refreshed-token");
  const client=createEarlyClient({wallet,getAccessToken:token},transport);
  await client.startVerification("campaign",selection,true);
  await client.verificationStatus("campaign","s");
  const [url, options]=transport.mock.calls[0];
  expect(url).toBe("/api/early/sessions");expect(options.credentials).toBe("same-origin");expect(options.cache).toBe("no-store");
  expect(JSON.parse(options.body)).toEqual({wallet,ruleId:"campaign",selection,consent:true});
  expect(transport.mock.calls[1][1].headers.Authorization).toBe("Bearer refreshed-token");
  expect(JSON.parse(transport.mock.calls[1][1].body)).toEqual({wallet,ruleId:"campaign",sessionId:"s"});
});
it("keeps service errors distinct from successful ineligibility and does not retry mutations",async()=>{
  const transport=vi.fn().mockResolvedValueOnce(Response.json({error:{code:"PROOF_VERIFICATION_UNAVAILABLE",message:"Unavailable"}},{status:503}))
    .mockResolvedValueOnce(Response.json({evaluation:{status:"not_qualifying",evidenceIds:[],reason:"Current evidence is late"}}));
  const client=createEarlyClient({wallet,getAccessToken:async()=>"token"},transport);
  await expect(client.startVerification("campaign",selection,true)).rejects.toMatchObject({code:"PROOF_VERIFICATION_UNAVAILABLE",status:503});
  expect(transport).toHaveBeenCalledOnce();
  expect(await client.inspect("campaign",true)).toMatchObject({evaluation:{status:"not_qualifying"}});
});
it("rejects missing authentication and unreadable responses",async()=>{
  const transport=vi.fn().mockResolvedValue(new Response("unavailable",{status:502}));
  await expect(createEarlyClient({wallet,getAccessToken:async()=>""},transport).listCampaigns()).rejects.toMatchObject({code:"UNAUTHENTICATED"});
  expect(transport).not.toHaveBeenCalled();
  await expect(createEarlyClient({wallet,getAccessToken:async()=>"token"},transport).listCampaigns()).rejects.toMatchObject({code:"INVALID_RESPONSE"});
});
it("passes cancellation through without turning it into an eligibility decision",async()=>{
  const controller=new AbortController();controller.abort();
  const transport=vi.fn().mockRejectedValue(new DOMException("Aborted","AbortError"));
  await expect(createEarlyClient({wallet,getAccessToken:async()=>"token"},transport).inspect("campaign",true,controller.signal)).rejects.toMatchObject({name:"AbortError"});
  expect(transport.mock.calls[0][1].signal).toBe(controller.signal);
});
