import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ one: vi.fn(), db: vi.fn(), complete: vi.fn() }));
vi.mock("../src/lib/early/store", () => ({ one: mocks.one, db: mocks.db }));
vi.mock("../src/lib/early/verification", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/lib/early/verification")>();
  return { ...actual, completeSession: mocks.complete };
});
import { POST } from "../src/app/api/early/callback/route";
import { tokenHash } from "../src/lib/early/verification";
const token = "a".repeat(64);
function request(payload: unknown, capability = token) {
  return new NextRequest(`https://early.example/api/early/callback?session=session-one&token=${capability}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.one.mockResolvedValue({ id: "session-one", callback_token_hash: tokenHash(token), expires_at: new Date(Date.now() + 60000).toISOString(), proof_identifier: null });
  mocks.db.mockResolvedValue([]);
});
it("acknowledges a capability-bound Verifier error without storing raw diagnostics or creating evidence", async () => {
  const result = await POST(request({ error: { message: "private source data" } }));
  expect(result.status).toBe(200); expect(await result.json()).toEqual({ status: "technical_failure" });
  expect(mocks.complete).not.toHaveBeenCalled(); expect(mocks.db).toHaveBeenCalledOnce();
  expect(JSON.stringify(mocks.db.mock.calls)).not.toContain("private source data");
  expect(mocks.db.mock.calls[0][0]).toContain("proof_identifier=is.null");
});
it("rejects an invalid callback capability before any mutation", async () => {
  expect((await POST(request({ error: "failed" }, "b".repeat(64)))).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled();
});
it("cannot downgrade a completed proof through a later error callback", async () => {
  mocks.one.mockResolvedValue({ callback_token_hash: tokenHash(token), proof_identifier: "proof-one", evidence_id: "evidence-one" });
  expect(await (await POST(request({ error: "failed" }))).json()).toEqual({ status: "verified", evidenceId: "evidence-one" });
  expect(mocks.db).not.toHaveBeenCalled();
});
it("rejects error callbacks after expiry", async () => {
  mocks.one.mockResolvedValue({ callback_token_hash: tokenHash(token), proof_identifier: null, expires_at: new Date(Date.now() - 1000).toISOString() });
  expect((await POST(request({ status: "failed" }))).status).toBe(409); expect(mocks.db).not.toHaveBeenCalled();
});
it("still sends proof callbacks through strict proof verification", async () => {
  mocks.complete.mockResolvedValue({ id: "verified-evidence" });
  const proof = { identifier: "proof-one", claimData: {}, signatures: [] };
  expect(await (await POST(request({ proofs: [proof], error: "untrusted extra field" }))).json()).toEqual({ status: "verified", evidenceId: "verified-evidence" });
  expect(mocks.complete).toHaveBeenCalledWith([proof], expect.objectContaining({ id: "session-one" }));
  expect(mocks.db).not.toHaveBeenCalled();
});
