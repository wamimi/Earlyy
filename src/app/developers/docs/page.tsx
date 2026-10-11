import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LandingFooter } from "@/components/landing-footer";
import { DeveloperIntegration } from "@/components/developer-integration";
import "@/components/developers.css";
import "./reference.css";

const example = `import { createEarlyClient } from "@/lib/early/client";

// Within Early's browser app, with its Privy account context:
const early = createEarlyClient({ wallet: walletAddress, getAccessToken });
const { rules } = await early.listCampaigns();
// Let the user select a published campaign and give consent.
const { evaluation } = await early.inspect(selectedRule.id, consent);
if (evaluation.status !== "eligible") {
  // Only after the user chooses an alternative and clicks Verify:
  const session = await early.startVerification(
    selectedRule.id, selectedRule.definition.alternatives[selectedIndex], consent
  );
  // Show session.requestUrl as a link or QR. Never auto-open/auto-collect.
  const status = await early.verificationStatus(selectedRule.id, session.sessionId);
  if (status.status === "verified") {
    const result = await early.evaluate(selectedRule.id);
    // result.status is eligibility, not a confirmed payout.
  }
}`;
export default function DeveloperReference() {
  return <main className="product-main developers-page"><SiteHeader /><article className="dv-container dr-reference">
    <header><Link href="/developers">← Developers</Link><h1>Build with verified support.</h1><p>A working reference for consented proof requests and campaign evaluation inside Early. Use existing support records, then request one accepted activity when needed.</p><p><strong>Authenticated preview integration.</strong> These endpoints use an Early Privy session and linked wallet. Public API keys, external-app tenancy and third-party data access are not available yet.</p></header>
    <nav aria-label="Integration reference"><a href="#quickstart">Quickstart</a><a href="#contract">API contract</a><a href="#outcomes">Outcomes</a><a href="#try">Live example</a></nav>
    <section id="quickstart"><h2>Verify one accepted alternative</h2><p>The typed browser client lives at <code>src/lib/early/client.ts</code>. Import it within this application; it is not a published SDK. The variables below come from the signed-in account and the user’s campaign selection.</p><pre tabIndex={0} aria-label="Authenticated integration example"><code>{example}</code></pre>
    <p>Each campaign supplies immutable targets and explicit UTC cutoffs, such as <code>2026-10-01T00:00:00.000Z</code>. Spotify saved-track evidence can match a track or its verified artist relationship; YouTube evidence matches a channel. Alternatives use OR. Repeat-support rules still require their stated distinct event/day counts.</p></section>
    <section id="contract"><h2>Request and response contract</h2><p>All operations below use <code>POST /api/early/&#123;operation&#125;</code>, JSON, <code>Authorization: Bearer &lt;Privy access token&gt;</code>, and a <code>wallet</code> field owned by that account. Browser requests must originate from the configured Early app origin. Responses are private and uncached; request bodies are limited to 1 MiB.</p>
    <div className="dr-table"><table><caption>Support verification operations</caption><thead><tr><th>Operation</th><th>Additional request fields</th><th>Response</th></tr></thead><tbody>
      <tr><td><code>list-rules</code></td><td>None</td><td><code>rules[]</code> with campaign IDs, definitions, targets and cutoffs. Managed publication controls apply.</td></tr>
      <tr><td><code>inspect</code></td><td><code>ruleId, consent: true</code></td><td><code>evaluation, routes, capabilities</code>. Checks owned stored evidence; does not browse source accounts.</td></tr>
      <tr><td><code>sessions</code></td><td><code>ruleId, selection: &#123;route, targetId, cutoff&#125;, consent: true</code></td><td><code>sessionId, requestUrl, expiresAt, rewardReady</code>. Selection must match a campaign alternative.</td></tr>
      <tr><td><code>session-status</code></td><td><code>ruleId, sessionId</code></td><td><code>status, errorCode, evidenceId, expiresAt, rewardReady</code>. A session is private to its bound account/wallet.</td></tr>
      <tr><td><code>evaluate</code></td><td><code>ruleId</code></td><td><code>status, evidenceIds, reason</code>. Evaluates owned records and persists the result.</td></tr>
    </tbody></table></div><p>The Verifier submits signed proofs to Early’s callback. Keep callback capabilities, raw proofs and source identifiers out of logs, analytics and public URLs. Never embed a service-role key, signer key or Privy app secret in client code.</p></section>
    <section id="outcomes"><h2>Keep proof, eligibility and payment separate</h2><ul>
      <li><strong>verified:</strong> the server accepted and stored a proof. It may still fail a campaign’s cutoff or target rule.</li>
      <li><strong>eligible:</strong> stored verified records meet the rule. Reward gates, funds, expiry and duplicate protection still apply.</li>
      <li><strong>awaiting_proof:</strong> collect an accepted activity only with consent.</li>
      <li><strong>not_qualifying:</strong> current records do not meet the rule. Incomplete coverage does not prove the user has no other qualifying activity.</li>
      <li><strong>indeterminate:</strong> source timestamp precision overlaps the cutoff.</li>
      <li><strong>technical_failure / expired:</strong> recover the request or start a fresh one after expiry. Neither establishes ineligibility.</li>
    </ul><p>Errors use <code>{JSON.stringify({error:{code:"…",message:"…"}})}</code>. Handle 401 sign-in failures, 403 account/origin restrictions, 400 invalid inputs/proofs, 409 expiry/conflicts or pending acceptance, and 503 service failures. Never retry a failed proof by weakening verification.</p><p>Spotify and YouTube rewards remain acceptance-gated. Video-like verification is experimental and requires phone and ownership acceptance. Artist-library, album, pre-save, comment and watch routes remain unfinished. The example does not broadcast transactions. A confirmed Monad receipt and canonical indexed event are separate payment evidence.</p></section>
    <section id="try"><h2>Try it with your account</h2><p>Published campaigns and your own records are loaded only when requested. No sample records are substituted when a campaign or service is unavailable.</p><DeveloperIntegration /></section>
  </article><LandingFooter compact /></main>;
}
