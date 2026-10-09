import { afterEach, describe, expect, it, vi } from "vitest";
async function headersFor(mode: string) {
  vi.stubEnv("NODE_ENV", mode); vi.resetModules();
  // @ts-expect-error Next configuration is a JavaScript module outside the TS project.
  const { default: config } = await import("../next.config.mjs");
  const rules = await config.headers();
  return Object.fromEntries(rules[0].headers.map((header: {key: string; value: string}) => [header.key, header.value]));
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("browser security headers", () => {
  it("blocks foreign embedding but allows Privy, WalletConnect, and Turnstile frames", async () => {
    const headers = await headersFor("production");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    const frames = csp.split('; ').find((value: string) => value.startsWith('frame-src'));
    for (const host of ['https://auth.privy.io', 'https://verify.walletconnect.com', 'https://verify.walletconnect.org', 'https://challenges.cloudflare.com']) expect(frames).toContain(host);
    expect(csp).not.toContain("unsafe-eval"); expect(csp).not.toContain('ws://localhost');
    expect(csp).toContain("object-src 'none'"); expect(csp).toContain('upgrade-insecure-requests');
    expect(headers["X-Content-Type-Options"]).toBe('nosniff');
  });
  it("limits debugging exceptions to development", async () => {
    const headers = await headersFor("development");
    expect(headers['Content-Security-Policy']).toContain("unsafe-eval");
    expect(headers['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
  });
});
