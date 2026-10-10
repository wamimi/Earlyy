import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ init:vi.fn(), db:vi.fn() }));
vi.mock("@reclaimprotocol/js-sdk", () => ({ReclaimProofRequest:{init:mocks.init},verifyProof:vi.fn()}));
vi.mock("../src/lib/early/store", () => ({db:mocks.db}));
import { startSession } from "../src/lib/early/verification";
import { providers } from "../src/lib/early/providers";
const request = {
  getProviderVersion: () => ({providerVersion:providers.youtube_subscription.version}),
  getSessionId: () => "session-one",setContext:vi.fn(),setParams:vi.fn(),setAppCallbackUrl:vi.fn(),
  setRedirectUrl:vi.fn(),setCancelRedirectUrl:vi.fn(),getRequestUrl:vi.fn(async () => "https://share.reclaimprotocol.org/request"),
};
beforeEach(() => {
  vi.stubEnv("RECLAIM_YOUTUBE_SUBSCRIPTION_PROVIDER_ID",providers.youtube_subscription.id);
  vi.stubEnv("RECLAIM_YOUTUBE_SUBSCRIPTION_PROVIDER_VERSION",providers.youtube_subscription.version);
  vi.clearAllMocks();mocks.init.mockResolvedValue(request);mocks.db.mockResolvedValue([]);
  vi.stubEnv("NEXT_PUBLIC_APP_URL","https://early.example");vi.stubEnv("RECLAIM_APP_ID","fixture");vi.stubEnv("RECLAIM_APP_SECRET","fixture");
});
const selection = {route:"youtube_subscription" as const,targetId:`UC${"a".repeat(22)}`,cutoff:"2025-01-01T00:00:00.000Z"};
it("binds campaign identity and derives its return URL from the server origin",async () => {
  await startSession("user","0x0000000000000000000000000000000000000001",selection,"campaign-one");
  expect(request.setRedirectUrl).toHaveBeenCalledWith("https://early.example/dashboard/campaigns/campaign-one?session=session-one");
  expect(request.setCancelRedirectUrl).toHaveBeenCalledWith("https://early.example/dashboard/campaigns/campaign-one?session=session-one");
  const context=JSON.parse(request.setContext.mock.calls[0][1]);
  expect(context.campaignId).toBe("campaign-one");
  expect(JSON.parse(mocks.db.mock.calls[0][2].context_message).campaignId).toBe("campaign-one");
});
it("keeps standalone support sessions returning to Rewards",async () => {
  await startSession("user","0x0000000000000000000000000000000000000001",selection);
  expect(request.setRedirectUrl).toHaveBeenCalledWith("https://early.example/rewards?session=session-one");
});
