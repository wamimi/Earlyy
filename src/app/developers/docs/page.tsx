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

const ruleExample = `{
  "version": 1,
  "title": "Early demo — exact video like",
  "alternatives": [
    { "route": "youtube_like", "targetId": "dQw4w9WgXcQ", "cutoff": "2026-10-20T00:00:00.000Z" },
    { "route": "spotify_saved_track", "targetId": "spotify:track:<22-character ID>", "cutoff": "2026-10-20T00:00:00.000Z" }
  ],
  "minimumDistinctEvents": 1,
  "minimumDistinctDays": 1,
  "payoutWei": "10000000000000000",
  "capacity": 10,
  "claimExpiry": 1761523200
}`;

const sessionExample = `POST /api/early/sessions
Authorization: Bearer <Privy access token>
Content-Type: application/json

{
  "wallet": "0xYourLinkedWallet",
  "ruleId": "<published campaign ID>",
  "consent": true,
  "selection": { "route": "youtube_like", "targetId": "dQw4w9WgXcQ", "cutoff": "2026-10-20T00:00:00.000Z" }
}

200 OK
{
  "sessionId": "<Reclaim session ID>",
  "requestUrl": "<Reclaim Verifier link — show as a button or QR>",
  "expiresAt": "2026-10-13T12:15:00.000Z",
  "rewardReady": false
}`;

const statusExample = `POST /api/early/session-status
{ "wallet": "0xYourLinkedWallet", "ruleId": "<campaign ID>", "sessionId": "<Reclaim session ID>" }

200 OK
{ "sessionId": "…", "status": "verified", "errorCode": null,
  "evidenceId": "…", "expiresAt": "…", "rewardReady": false }

// A rejected proof is reported on the session, not as an HTTP error:
200 OK
{ "sessionId": "…", "status": "technical_failure", "errorCode": "SOURCE_ALREADY_BOUND",
  "evidenceId": null, "expiresAt": "…", "rewardReady": false }`;

export default function DeveloperReference() {
  return <main className="product-main developers-page"><SiteHeader /><article className="dv-container dr-reference">
    <header><Link href="/developers">← Developers</Link><h1>Build with verified support.</h1><p>A working reference for consented proof requests and campaign evaluation inside Early. Use existing support records, then request one accepted activity when needed.</p><p><strong>Authenticated preview integration.</strong> These endpoints use an Early Privy session and linked wallet. Public API keys, external-app tenancy and third-party data access are not available yet. The client below is source code inside this application, not a published SDK, and there is no billing or usage plan.</p></header>
    <nav aria-label="Integration reference"><a href="#architecture">Architecture</a><a href="#providers">Providers</a><a href="#quickstart">Quickstart</a><a href="#auth">Access &amp; consent</a><a href="#contract">API contract</a><a href="#outcomes">Outcomes</a><a href="#errors">Errors &amp; retries</a><a href="#integrity">Replay &amp; duplicates</a><a href="#campaigns">Campaigns &amp; rewards</a><a href="#privacy">Privacy</a><a href="#local">Local setup</a><a href="#try">Live example</a></nav>

    <section id="architecture"><h2>How the pieces fit</h2><p>Early separates four questions: who is signed in, what happened on a source platform, whether that activity meets a campaign, and whether a reward was paid. Each service answers one of them.</p>
    <div className="dr-table"><table><caption>Service roles</caption><thead><tr><th>Component</th><th>Role</th><th>What it does not do</th></tr></thead><tbody>
      <tr><td>Privy</td><td>Signs users in to Early and links the wallet used for sessions and claims. API requests carry a Privy access token.</td><td>It does not see or prove Spotify or Google activity.</td></tr>
      <tr><td>Reclaim Verifier</td><td>Runs on the user’s phone. The user signs in to the source inside Reclaim, and a zkTLS proof of selected response fields is sent to Early’s callback.</td><td>Credentials are not sent to Early. A Verifier proof key is not an Early account or a source-account identity.</td></tr>
      <tr><td>Early server</td><td>Checks the proof signature, pinned provider version and recipe hash, session binding, target and timestamps; stores normalized evidence; evaluates rules; signs expiring reward authorizations.</td><td>It does not broadcast transactions for the user.</td></tr>
      <tr><td>Supabase (Postgres)</td><td>Private storage for sessions, source bindings, normalized evidence, immutable rules, evaluations, authorization reservations and encrypted retained proofs.</td><td>It is not public and is never queried directly from the browser.</td></tr>
      <tr><td>Monad testnet escrow</td><td>Holds creator-funded test MON and enforces payout, capacity, expiry, signer, wallet and duplicate-source constraints.</td><td>It does not verify Reclaim proofs onchain; it trusts Early’s eligibility signer.</td></tr>
      <tr><td>Envio</td><td>Indexes escrow creation, funding, claim and closure events into a queryable activity feed.</td><td>It is not the source of truth. RPC receipts and contract state are authoritative.</td></tr>
    </tbody></table></div>
    <p>Active deployment: Monad testnet, chain <code>10143</code>, escrow <code>0x32192Beb858561c67CCe7C1b2dbdD60E8484Df41</code>, deployment block <code>70207421</code>. Older Base, Zama and Stellar code in the repository is historical and not part of this flow.</p></section>

    <section id="providers"><h2>Three providers, three different claims</h2><p>Each route has its own Reclaim provider, target format, extraction and evidence. A rule names the route explicitly; one route never satisfies another.</p>
    <div className="dr-table"><table><caption>Accepted activity routes</caption><thead><tr><th>Route</th><th>Target format</th><th>What an accepted proof establishes</th><th>Coverage and limits</th></tr></thead><tbody>
      <tr><td><code>spotify_saved_track</code></td><td><code>spotify:track:&lt;22 chars&gt;</code> or <code>spotify:artist:&lt;22 chars&gt;</code></td><td>The date a selected song was saved to the user’s library. An artist target matches a saved song by that artist.</td><td>The selected saved item only. Not listening history, follows, albums or pre-saves.</td></tr>
      <tr><td><code>youtube_subscription</code></td><td>Channel ID <code>UC…</code> (24 chars)</td><td>A dated subscription to that channel, as recorded in Google My Activity.</td><td>The loaded English My Activity page. Does not prove watching or liking any video.</td></tr>
      <tr><td><code>youtube_like</code></td><td>Video ID (11 chars), e.g. <code>dQw4w9WgXcQ</code></td><td>A dated like of that exact video, bound to its channel, as recorded in Google My Activity.</td><td>The first loaded English likes page, which lists recent likes. An older like may not appear there. Does not prove watching, discovery or a first-ever like.</td></tr>
    </tbody></table></div>
    <p>Timestamps are stored in UTC microseconds with a precision window. A record whose window overlaps a cutoff is <code>indeterminate</code>, not eligible. A missing record on a loaded page does not prove the activity never happened. Provider IDs, versions and recipe hashes are pinned in <code>src/lib/early/providers.ts</code>; the server rejects proofs from any other version, and the deployment’s environment must match the pin or sessions fail with <code>PROVIDER_CONFIGURATION_MISMATCH</code>. <code>resolve-target</code> turns a public share link (<code>open.spotify.com</code>, <code>youtube.com/watch</code>, <code>youtu.be</code>, Shorts) into the canonical target.</p></section>

    <section id="quickstart"><h2>Verify one accepted alternative</h2><p>The typed browser client lives at <code>src/lib/early/client.ts</code>. Import it within this application; it is not a published SDK. The variables below come from the signed-in account and the user’s campaign selection.</p><pre tabIndex={0} aria-label="Authenticated integration example"><code>{example}</code></pre>
    <p>Each campaign supplies immutable targets and explicit UTC cutoffs, such as <code>2026-10-01T00:00:00.000Z</code>. Spotify saved-track evidence can match a track or its verified artist relationship. YouTube subscription evidence matches a channel; YouTube like evidence matches one exact video. Alternatives use OR. Repeat-support rules still require their stated distinct event/day counts.</p></section>

    <section id="auth"><h2>Access, ownership and consent</h2><ul>
      <li><strong>Authentication:</strong> every operation requires <code>Authorization: Bearer &lt;Privy access token&gt;</code> and a <code>wallet</code> field. The server checks that the wallet is linked to that Privy account; otherwise it returns <code>401 UNAUTHENTICATED</code>.</li>
      <li><strong>Origin:</strong> browser requests must come from an origin in <code>ALLOWED_APP_ORIGINS</code>, or the server returns <code>403 ORIGIN_FORBIDDEN</code>. Third-party sites cannot call these endpoints today.</li>
      <li><strong>Session ownership:</strong> a verification session belongs to the account and wallet that created it. Knowing a session ID does not grant access (<code>403 SESSION_FORBIDDEN</code>).</li>
      <li><strong>Source binding:</strong> the first accepted proof binds a source account (a Spotify or Google account) to the Early account. A proof from the same source on another Early account is rejected with <code>SOURCE_ALREADY_BOUND</code>. One Google binding covers both YouTube routes.</li>
      <li><strong>Consent:</strong> <code>inspect</code> and <code>sessions</code> require <code>consent: true</code>. Ask for it in the interface before reading saved records or starting a proof, and never open the Verifier automatically.</li>
      <li><strong>Campaign management:</strong> creating, publishing and funding campaigns requires an Early team account and an approved organizer. Public sign-in does not grant those permissions.</li>
    </ul></section>

    <section id="contract"><h2>Request and response contract</h2><p>All operations below use <code>POST /api/early/&#123;operation&#125;</code>, JSON, <code>Authorization: Bearer &lt;Privy access token&gt;</code>, and a <code>wallet</code> field owned by that account. Browser requests must originate from the configured Early app origin. Responses are private and uncached; request bodies are limited to 1 MiB.</p>
    <div className="dr-table"><table><caption>Support verification operations</caption><thead><tr><th>Operation</th><th>Additional request fields</th><th>Response</th></tr></thead><tbody>
      <tr><td><code>resolve-target</code></td><td><code>route, link</code></td><td><code>targetId, label, url</code> for a public share link.</td></tr>
      <tr><td><code>list-rules</code></td><td>None</td><td><code>rules[]</code> with campaign IDs, definitions, targets and cutoffs, plus <code>access</code> and <code>capabilities</code>. Only published campaigns from approved organizers are returned.</td></tr>
      <tr><td><code>inspect</code></td><td><code>ruleId, consent: true</code></td><td><code>evaluation, routes, capabilities</code>. Checks owned stored evidence; does not browse source accounts.</td></tr>
      <tr><td><code>sessions</code></td><td><code>selection: &#123;route, targetId, cutoff&#125;, consent: true</code>, optional <code>ruleId</code></td><td><code>sessionId, requestUrl, expiresAt, rewardReady</code>. With a <code>ruleId</code>, the selection must match one of its alternatives. Sessions expire after 15 minutes.</td></tr>
      <tr><td><code>session-status</code></td><td><code>sessionId</code>, optional <code>ruleId</code></td><td><code>status, errorCode, evidenceId, expiresAt, rewardReady</code>. A session is private to its bound account/wallet. A rejected proof appears here as <code>technical_failure</code> with its <code>errorCode</code> (for example <code>SOURCE_ALREADY_BOUND</code> or <code>WRONG_TARGET</code>).</td></tr>
      <tr><td><code>evidence</code></td><td>None</td><td><code>records[]</code>: the account’s accepted records (platform, activity, target, timestamp, precision, coverage).</td></tr>
      <tr><td><code>evaluate</code></td><td><code>ruleId</code></td><td><code>status, evidenceIds, reason</code>. Evaluates owned records and persists the result.</td></tr>
    </tbody></table></div>
    <div className="dr-table"><table><caption>Campaign and reward operations</caption><thead><tr><th>Operation</th><th>Request fields</th><th>Response</th></tr></thead><tbody>
      <tr><td><code>rules</code> (team)</td><td><code>rule</code></td><td>Saves an immutable rule draft. An identical rule returns the existing record. Corrections require a new rule.</td></tr>
      <tr><td><code>publish-rule</code> (team)</td><td><code>ruleId, organizationId</code></td><td>Publishes under an approved organizer. A published rule cannot move to another organizer.</td></tr>
      <tr><td><code>campaign-benefits</code></td><td><code>ruleId</code></td><td>Linked escrow benefits and their status: <code>available</code>, <code>unavailable</code>, <code>terms_mismatch</code> or <code>confirmation_pending</code>.</td></tr>
      <tr><td><code>transaction</code></td><td><code>action</code>: <code>create</code> (<code>ruleId, amountWei</code>), <code>fund</code> (<code>benefitId, amountWei</code>), <code>claim</code> or <code>refund</code> (<code>benefitId</code>)</td><td>Unsigned transaction data for the user’s wallet to sign. Early never broadcasts it.</td></tr>
      <tr><td><code>authorize</code></td><td><code>benefitId</code></td><td>An EIP-712 claim authorization (wallet, amount, five-minute expiry, source nullifier) after re-evaluating eligibility.</td></tr>
      <tr><td><code>reconcile</code></td><td><code>txHash</code></td><td><code>submitted</code>, <code>confirming</code> or a confirmed result read from the RPC receipt and escrow events.</td></tr>
      <tr><td><code>indexed</code></td><td><code>benefitId</code>, optional <code>txHash</code></td><td>Envio’s view of the benefit and claims, or <code>not_configured</code>/<code>unavailable</code>. Index delay is not a payment failure.</td></tr>
    </tbody></table></div>
    <pre tabIndex={0} aria-label="Session request example"><code>{sessionExample}</code></pre>
    <pre tabIndex={0} aria-label="Session status example"><code>{statusExample}</code></pre>
    <p>The Verifier submits signed proofs to Early’s callback. Keep callback capabilities, raw proofs and source identifiers out of logs, analytics and public URLs. Never embed a service-role key, signer key or Privy app secret in client code.</p></section>

    <section id="outcomes"><h2>Keep proof, eligibility and payment separate</h2><ul>
      <li><strong>verified:</strong> the server accepted and stored a proof. It may still fail a campaign’s cutoff or target rule.</li>
      <li><strong>eligible:</strong> stored verified records meet the rule. Funds, expiry and duplicate protection still apply.</li>
      <li><strong>awaiting_proof:</strong> collect an accepted activity only with consent.</li>
      <li><strong>not_qualifying:</strong> current records do not meet the rule. Incomplete coverage does not prove the user has no other qualifying activity.</li>
      <li><strong>indeterminate:</strong> source timestamp precision overlaps the cutoff.</li>
      <li><strong>technical_failure / expired:</strong> recover the request or start a fresh one after expiry. Neither establishes ineligibility.</li>
    </ul><p>Supported Spotify and YouTube records can qualify for testnet rewards. Authorization checks campaign terms, account-bound evidence, funding, expiry and prior claims. Saving a proof alone does not authorize payment, which is why session responses always return <code>rewardReady: false</code>. Artist-library, album, pre-save, comment, listening and watch routes remain unfinished. The example does not broadcast transactions. A confirmed Monad receipt and canonical indexed event are separate payment evidence.</p></section>

    <section id="errors"><h2>Errors and retry behavior</h2><p>Errors use <code>{JSON.stringify({error:{code:"…",message:"…"}})}</code>. Never retry a failed proof by weakening verification.</p>
    <div className="dr-table"><table><caption>Common errors</caption><thead><tr><th>Status</th><th>Codes</th><th>What to do</th></tr></thead><tbody>
      <tr><td>400</td><td><code>CONSENT_REQUIRED</code>, <code>INVALID_TARGET</code>, <code>INVALID_CUTOFF</code>, <code>SELECTION_MISMATCH</code>, <code>WRONG_TARGET</code>, <code>INVALID_PROOF_RECIPE</code>, <code>INVALID_PROOF_SIGNATURE</code></td><td>Fix the input or selection. A rejected proof needs a fresh session for the correct target; do not resubmit it.</td></tr>
      <tr><td>401 / 403</td><td><code>UNAUTHENTICATED</code>, <code>ORIGIN_FORBIDDEN</code>, <code>SESSION_FORBIDDEN</code>, <code>TEAM_REQUIRED</code>, <code>CREATOR_FORBIDDEN</code></td><td>Sign in again with the account that owns the wallet, or use an account with the required role.</td></tr>
      <tr><td>409</td><td><code>SESSION_EXPIRED</code>, <code>SOURCE_ALREADY_BOUND</code>, <code>SOURCE_RELINK_FORBIDDEN</code>, <code>NOT_ELIGIBLE</code>, <code>BENEFIT_UNAVAILABLE</code>, <code>ALREADY_CLAIMED</code>, <code>AUTHORIZATION_EXPIRED</code>, <code>REORG_PENDING</code></td><td>Start a new session after expiry; renew an expired authorization by calling <code>authorize</code> again; wait and reconcile again after a reorg. Source and claim conflicts are final for that account.</td></tr>
      <tr><td>503</td><td><code>PROVIDER_CONFIGURATION_MISMATCH</code>, <code>PROOF_VERIFICATION_UNAVAILABLE</code>, <code>RPC_UNAVAILABLE</code>, <code>SIGNER_MISMATCH</code>, <code>TECHNICAL_FAILURE</code></td><td>Service or configuration problem. Retry later; it says nothing about the user’s eligibility.</td></tr>
    </tbody></table></div></section>

    <section id="integrity"><h2>Sessions, replay and duplicates</h2><ul>
      <li>Each session carries a signed context: session ID, wallet, route, provider version, recipe hash, selection and a random nonce. A proof whose context does not match the server session is rejected (<code>SESSION_BINDING_MISMATCH</code>).</li>
      <li>The proof must be produced inside the session window (<code>PROOF_TIME_MISMATCH</code>), and a session accepts only one proof (<code>SESSION_CONFLICT</code>). The callback URL carries a random per-session capability; only its hash is stored.</li>
      <li>Recovering a stored record does not need a new proof: reopen <code>/rewards?session=&lt;id&gt;</code> or <code>/dashboard#support</code> while signed in to the same account.</li>
      <li>Reproving the same source event creates no extra support event; events are keyed by a server-side nullifier. Unliking and liking again creates a new, later event.</li>
      <li>Each claim uses a per-benefit source nullifier. The escrow rejects a second claim from the same source or the same wallet.</li>
      <li>Limits: source binding cannot show that two independently controlled accounts belong to different people, and it cannot stop a user from sharing their own session link.</li>
    </ul></section>

    <section id="campaigns"><h2>Campaign lifecycle</h2><ol>
      <li>A team member saves a rule (example below). Payout is in wei; <code>claimExpiry</code> is Unix seconds. The cutoff (when activity must have happened) and the claim expiry (when claims close) are different times.</li>
      <li>Publish it under an approved organizer. Publication does not fund anything.</li>
      <li>The creator wallet calls <code>transaction</code> with <code>create</code>, then <code>fund</code>, and signs both. Funding cannot exceed payout × capacity.</li>
      <li>A fan with eligible records calls <code>transaction</code> with <code>claim</code>, signs it, and the app calls <code>reconcile</code> with the hash until it is confirmed. Envio updates follow.</li>
      <li>After expiry, the creator can refund the unclaimed balance. The admin cannot withdraw campaign funds.</li>
    </ol><pre tabIndex={0} aria-label="Rule definition example"><code>{ruleExample}</code></pre>
    <p>Gas: verification needs no gas. Claims use Privy gas sponsorship only when it is funded; otherwise the user must explicitly choose to pay with their own test MON from the <a href="https://faucet.monad.xyz/">Monad faucet</a>. A failed sponsored transaction is never silently retried as user-paid.</p></section>

    <section id="privacy"><h2>Privacy and retained data</h2><ul>
      <li>Stored privately: normalized evidence (route, target, channel, timestamp, coverage), a keyed source-account nullifier, sessions and evaluations.</li>
      <li>Raw proofs are encrypted at rest and deleted after <code>RAW_PROOF_RETENTION_HOURS</code> (1–168, default 24). Cleanup runs once a day, so deletion can lag by up to a day.</li>
      <li>Public onchain: the claiming wallet, benefit ID, amount, transaction and a source nullifier that cannot be reversed into the source account. Source activity and proofs are never written onchain.</li>
      <li>The source platform still holds its own record of the activity. See the <Link href="/privacy">privacy policy</Link> for user-facing terms.</li>
    </ul></section>

    <section id="local"><h2>Run it locally</h2><ol>
      <li>Node 22 and pnpm 9: <code>pnpm install</code>.</li>
      <li>Copy <code>.env.example</code> to <code>.env.local</code>. You need your own Reclaim app, Privy app, Supabase project, raw-proof encryption key, source-nullifier secret and an eligibility signer. Provider IDs and versions must equal the pins in <code>providers.ts</code>.</li>
      <li>Apply the SQL in <code>supabase/</code> in order: <code>early_monad_v3</code>, <code>early_partner_access_v4</code>, <code>early_campaign_publication_v5</code>, <code>early_sponsored_receipts_v6</code>, <code>early_youtube_like_v6</code>.</li>
      <li>Run <code>pnpm dev</code>. Reclaim must reach your callback, so phone proofs need a publicly reachable <code>NEXT_PUBLIC_APP_URL</code>.</li>
      <li>Checks: <code>pnpm test:app</code>, <code>pnpm typecheck</code>, <code>pnpm lint</code>, <code>pnpm test:monad</code> (Foundry), <code>pnpm check:indexer</code> and <code>pnpm test:e2e</code>.</li>
    </ol><p>Troubleshooting: <code>PROVIDER_CONFIGURATION_MISMATCH</code> means environment provider settings differ from the pins; a Verifier success with no record usually means the callback could not reach your server; a YouTube like that is “not found” is often older than the first loaded likes page.</p></section>

    <section id="try"><h2>Try it with your account</h2><p>Published campaigns and your own records are loaded only when requested. No sample records are substituted when a campaign or service is unavailable.</p><DeveloperIntegration /></section>
  </article><LandingFooter compact /></main>;
}
