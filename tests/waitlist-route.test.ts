import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/waitlist/route";
const fetchMock = vi.fn();
function request(overrides = {}, origin = "https://proveearly.xyz") { return new Request("https://proveearly.xyz/api/waitlist", {method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify({email:"fan@example.com",interest:"supporter",consent:true,website:"",token:"valid",...overrides})}); }
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://proveearly.xyz");
  vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("RESEND_WAITLIST_SUPPORTER_SEGMENT_ID", "supporters");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret"); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-sitekey");
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const verified = () => Response.json({success:true,action:"waitlist",hostname:"proveearly.xyz"});
describe("waitlist signup", () => {
  it("persists a normalized email in the selected segment only after verification", async () => {
    fetchMock.mockResolvedValueOnce(verified()).mockResolvedValueOnce(Response.json({}, {status:404})).mockResolvedValueOnce(Response.json({id:"contact"}));
    expect((await POST(request({email:" FAN@example.com "}))).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({email:"fan@example.com",unsubscribed:false,segments:[{id:"supporters"}]});
  });
  it("handles repeat signup without overwriting contact preferences", async () => {
    fetchMock.mockResolvedValueOnce(verified()).mockResolvedValueOnce(Response.json({id:"contact",unsubscribed:false})).mockResolvedValueOnce(Response.json({id:"segment"}));
    expect((await POST(request())).status).toBe(200);
    expect(fetchMock.mock.calls[2][0]).toContain("/segments/supporters");
  });
  it("preserves an existing unsubscribe", async () => {
    fetchMock.mockResolvedValueOnce(verified()).mockResolvedValueOnce(Response.json({id:"contact",unsubscribed:true}));
    expect((await POST(request())).status).toBe(409); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid inputs, missing consent, and foreign origins before network calls", async () => {
    expect((await POST(request({email:"bad"}))).status).toBe(400);
    expect((await POST(request({consent:false}))).status).toBe(400);
    expect((await POST(request({interest:"unknown"}))).status).toBe(400);
    expect((await POST(request({}, "https://other.example"))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fails closed when production protection or Resend configuration is missing", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", ""); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects a challenge from a different hostname", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({success:true,action:"waitlist",hostname:"other.example"}));
    expect((await POST(request())).status).toBe(400); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("never returns success for failed persistence", async () => {
    fetchMock.mockResolvedValueOnce(verified()).mockResolvedValueOnce(Response.json({}, {status:404})).mockResolvedValueOnce(Response.json({}, {status:429}));
    expect((await POST(request())).status).toBe(429);
  });
});
