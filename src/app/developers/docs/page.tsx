import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { LandingFooter } from "@/components/landing-footer";
import "@/components/developers.css";

export const metadata: Metadata = { title: "Integration reference | Early", description: "Early’s provider requirements, claim model, security boundaries, and local setup reference." };

export default function DeveloperReference() {
  return <main id="top" className="product-main developers-page dv-reference"><SiteHeader action={<Link href="/developers" className="dv-button dv-outline"><ArrowLeft size={16} /> Developers</Link>} /><div className="dv-container dv-reference-heading"><span className="dv-eyebrow">Implementation reference</span><h1>Build with verified<br />participation.</h1><p>A guide to the current source implementation. Production integrations require validated providers, deployed contracts, and configured services.</p></div><div className="dv-container dv-reference-layout"><nav aria-label="Reference sections"><a href="#providers">Providers</a><a href="#schemas">Claim schemas</a><a href="#security">Security</a><a href="#privacy">Privacy boundary</a><a href="#quickstart">Quickstart</a></nav><div className="dv-reference-content">
    <section id="providers"><span className="dv-eyebrow">01 · Providers</span><h2>Bind support to its source.</h2><p>A provider must establish the authenticated account, the subject of the activity, the required interaction, its relationship to that subject, and its timestamp. A general screenshot or unrelated action does not establish qualifying support.</p><ul><li>Version every provider configuration and bind it to a configuration hash.</li><li>Allowlist the configuration before accepting its proof.</li><li>Confirm the proof binds the submitting wallet and authenticated account.</li><li>Validate source-specific claims before using them in campaign criteria.</li></ul><p>Fixtures and proof conformance checks in the repository describe expected signed claim shapes. A provider must pass those checks before it can be advertised as an integration.</p></section>
    <section id="schemas"><span className="dv-eyebrow">02 · Claim schemas</span><h2>A record your product can verify.</h2><p>The verified discovery model binds an approved provider, proof identifier, session nullifier, wallet, subject, timestamp, and commitment. This excerpt shows the public receipt returned by the model; platform values are defined by the source implementation.</p><pre><code>{`type PublicReceipt = {
  version: "early.public-receipt/v2";
  owner: \`0x\${string}\`;
  proofId: \`0x\${string}\`;
  platform: DiscoveryPlatform;
  subjectHash: \`0x\${string}\`;
  contentHash: \`0x\${string}\`;
  providerHash: \`0x\${string}\`;
  commitment: \`0x\${string}\`;
};`}</code></pre><p>For the private path, a signed confidential input attestation binds the vault, proof commitment, encrypted update, owner, nonce, and expiry. Eligibility authorisations bind the campaign, claimant, evaluation transaction, nullifier, and expiry.</p><p className="dv-reference-location">Source: <code>src/lib/proof-model.ts</code></p></section>
    <section id="security"><span className="dv-eyebrow">03 · Security</span><h2>Verification comes first.</h2><p>The public registry calls Reclaim’s verifier before creating a receipt. The wallet must match the proof’s context and owner. There is no separate public publish function that bypasses verification.</p><pre><code>{`function verifyAndRegister(ReclaimTypes.Proof calldata proof)
    external
    whenNotPaused
    returns (bytes32 commitment)`}</code></pre><ul><li>Duplicate proofs, sessions, commitments, nonces, and claim nullifiers are rejected.</li><li>Changed encrypted input is rejected by the signed attestation.</li><li>Callbacks are authenticated, idempotent, and origin restricted.</li><li>Transaction events are reconciled before database confirmation.</li></ul><p>Campaign eligibility is not reward delivery. Builders must also plan inventory, funding, fulfilment, and how a qualifying person claims a benefit.</p><p className="dv-reference-location">Source: <code>contracts/base/src/EarlyDiscoveryRegistry.sol</code></p></section>
    <section id="privacy"><span className="dv-eyebrow">04 · Privacy boundary</span><h2>Choose the disclosure path deliberately.</h2><div className="dv-reference-paths"><article><h3>Public receipt</h3><p>Selected proof fields appear in transaction calldata. Hashes in a receipt do not make all submitted data private.</p></article><article><h3>Private eligibility</h3><p>The Early attestor sees verified plaintext before encryption. FHE protects the accumulated history and campaign computation after that boundary.</p></article></div><p>The private proof does not go to the public registry. The attestor verifies the facts, derives an encrypted update, and signs an EIP-712 attestation for the vault. Consumers receive an expiring claim authorisation.</p><p>Explain which facts each path exposes before a user acts. Do not describe the current attestor path as end-to-end private or anonymous.</p></section>
    <section id="quickstart"><span className="dv-eyebrow">05 · Quickstart</span><h2>Run the implementation locally.</h2><p>Use Node.js 22 or newer and pnpm 9. Contract development also requires Foundry.</p><pre><code>{`pnpm install
cp .env.example .env.local
pnpm dev`}</code></pre><p>Configure the services listed in the environment example, then apply <code>supabase/v2_verified_discovery.sql</code> to your Supabase project. The migration does not alter V1 tables.</p><p>Run the application and contract checks relevant to your change:</p><pre><code>{`pnpm lint
pnpm typecheck
pnpm test:app
pnpm test:base
pnpm test:zama
pnpm build`}</code></pre><p>Review the provider conformance requirements and deploy the required contracts before connecting a production experience.</p><a className="dv-button dv-green" href="https://github.com/wamimi/Earlyy" target="_blank" rel="noreferrer">Explore the repository <ArrowUpRight size={17} /></a></section>
  </div></div><LandingFooter compact /></main>;
}
