import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/early/retention/route";
import { db } from "../src/lib/early/store";

vi.mock("../src/lib/early/store", () => ({ db: vi.fn() }));

function request(method: string, token?: string) {
  return new NextRequest("https://early.example/api/early/retention", {
    method, headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("proof retention authorization", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.mocked(db).mockReset();
    vi.stubEnv("CRON_SECRET", "scheduled-test-secret");
    vi.stubEnv("RETENTION_CRON_SECRET", "manual-test-secret");
  });

  it("rejects missing, malformed and cross-route credentials without deleting data", async () => {
    for (const token of [undefined, "", "wrong", "manual-test-secret"]) {
      expect((await GET(request("GET", token))).status).toBe(401);
    }
    expect((await POST(request("POST", "scheduled-test-secret"))).status).toBe(401);
    expect(db).not.toHaveBeenCalled();
  });

  it("fails closed if the scheduled secret is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("GET", "manual-test-secret"))).status).toBe(503);
    expect(db).not.toHaveBeenCalled();
  });

  it("purges expired proof payloads through the existing RPC for an authenticated schedule", async () => {
    vi.mocked(db).mockResolvedValue(3);
    const response = await GET(request("GET", "scheduled-test-secret"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ purged: 3 });
    expect(db).toHaveBeenCalledExactlyOnceWith("rpc/early_purge_raw_proofs", "POST", {});
  });

  it("keeps the authenticated POST path working", async () => {
    vi.mocked(db).mockResolvedValue(0);
    expect((await POST(request("POST", "manual-test-secret"))).status).toBe(200);
    expect(db).toHaveBeenCalledExactlyOnceWith("rpc/early_purge_raw_proofs", "POST", {});
  });

  it("does not claim success when the database fails", async () => {
    vi.mocked(db).mockRejectedValue(new Error("storage unavailable"));
    const response = await GET(request("GET", "scheduled-test-secret"));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("TECHNICAL_FAILURE");
  });
});
