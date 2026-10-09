# Implementation prompt: Early eligibility, Monad, Privy and Envio

Work in `/Users/xiaomao/Earlyy`. Implement the remaining application end to end, not just a plan. Another assistant owns provider repair and publication. The user will perform Reclaim Verifier phone tests and second-account tests later: do not wait for them, poll them, or repeatedly generate expiring sessions. Finish all independent implementation and tests, then report the exact remaining live actions.

## Updated user requirements — take precedence over later deployment wording

Read `docs/ENVIRONMENT-SETUP-2026-10-09.md` and use `.env.setup.local` as the private configuration worksheet. It is NOT auto-loaded. Preserve populated `.env.local` entries; merge only missing completed values. Adopt the new route-specific/provider, Monad, signer and Envio names documented there consistently. Generate missing local test-only signer/nullifier secrets securely into ignored files if needed; never display secrets or overwrite existing keys. Configuration values alone do not authorize deployment.

**Do not publish any code.** No Git staging/commits/pushes/PRs, package publication, site/backend deployment, hosted indexer deployment, contract broadcast or explorer-source publication without a subsequent explicit user instruction. Prepare artifacts and run local tests/simulations first. Earlier references to deployment describe the eventual acceptance flow, not permission to publish now. Report deployment-dependent checks as pending.

Write clean, cohesive code with small explicit interfaces, validated inputs, clear ownership of state and minimal dependencies. Separate pure eligibility rules, external provider verification, database persistence, authorization signing and transaction/indexer adapters. Avoid giant route handlers, duplicate business rules, speculative abstractions and unnecessary framework changes. Use precise types and explicit error states. Comments must be neutral and sparse: explain only non-obvious invariants, security assumptions or reasons. No comments addressed to the user, another assistant or the conversation; no narrated implementation history. Appropriate NatSpec for security-sensitive public contract interfaces is useful.

### Security-informed contract development, without running an audit workflow

The user supplied https://github.com/pashov/skills/blob/main/README.md as design reference. Read narrowly relevant reference material, not the audit orchestration. Do NOT install/update tools, invoke solidity-auditor/x-ray/fizz, spawn auditing agents, perform repeated audit passes or generate a full audit report. Normal development tests, including focused Foundry fuzz/invariant tests, remain required.

Reference-only files already available under `/Users/xiaomao/.codex/skills/solidity-auditor/references/hacking-agents/`: `access-control-agent.md`, `invariant-agent.md`, `execution-trace-agent.md`, `trust-gap-agent.md`. Their useful design lenses are permissions, conserved balances/coupled state, adversarial call sequences and interactions between authority and economic incentives. Translate these into the following concrete escrow requirements rather than executing their audit instructions:

- Before coding, define actors, authority and the benefit state machine. Cover deployment/constructor parameters, every state-changing entry point and admin/signer rotation. Reject zero/invalid critical addresses and impossible payout/capacity/expiry terms. No arbitrary privileged withdrawal of creator liabilities, arbitrary delegatecall or unnecessary upgradeability.
- Write accounting invariants: funding = paid + refunded + remaining liability per benefit; total liabilities never exceed contract balance; paid count never exceeds capacity; a consumed source nullifier cannot be consumed again for the same benefit even through another wallet. Forced native transfers must not break accounting: do not require exact equality between raw contract balance and tracked liabilities.
- Make beneficiary, amount, benefit terms and signature domain agree on every path. Use well-tested EIP-712/signature libraries; reject malformed/malleable signatures through their supported checks. Avoid ambiguous packed encodings for authorization commitments. Test independent mutation of every signed field and cross-chain/cross-contract replay.
- Apply checks-effects-interactions and reentrancy protection to ALL value-moving entry points. Check native transfer success. A reverting recipient must not corrupt accounting or lock unrelated benefits. Avoid loops over all claimants; one recipient cannot block others' claims/refunds.
- Define inclusive/exclusive expiry boundaries, and test just before/at/after expiry. Exercise claim/refund/funding interleavings, first/last capacity slots, zero values and large values. Creator closure cannot unexpectedly redirect funds promised under open terms; signer changes must have an explicit effect on pending authorizations.
- Test cross-function attacks, not only each function alone: reenter a refund from a claim receiver, interleave top-up/close/claim, submit duplicate signatures concurrently and try alternative activity routes for the same entitlement. Ensure contract events mirror final state so indexer totals remain consistent.
- Keep source ownership checks and signature issuance strict: a perfectly correct contract still loses funds if a backend issues fraudulent authorizations. Bind authenticated sessions and durable issuance to on-chain nullifiers; test the whole trust boundary.
- Document residual trust in the eligibility signer and administrative powers. Security-informed construction and passing tests are not an independent audit or a guarantee of safety. Keep this delivery on testnet; do not claim readiness to custody real creator funds.

## Read first and understand the actual state

Read applicable AGENTS.md, `docs/PLAN-2026-10-09.md`, the top/current sections of `docs/HANDOFF-2026-10-08.md`, `docs/PROVIDER-IMPLEMENTATION-2026-10-09.md`, `docs/PROVIDER-CAPABILITIES.md`, and package.json. Later updates supersede historical experiment notes.

Use TypeScript for the Next.js backend, React UI and Envio handlers; Solidity with Foundry for contracts; SQL migrations for durable storage. Existing stack: Next.js 16.2.9 App Router, React 19.2.7, TypeScript 6, Node >=22, pnpm 9.15.4, ethers 6, Privy React 3.35.1/Node 0.27.0, Reclaim JS SDK 5.6.0, Vitest and Playwright. Verify installed APIs before changing dependencies. Do not rewrite the app into a different language/framework or upgrade everything opportunistically.

Current private, active published providers:

- Spotify saved track: `486e7100-ea6e-4b82-b2ee-48933a05abc6`, version `1.0.2`. Supports a selected saved track and its actual track artists, save date and source owner. Multiple targets and an offset beyond the first page have real signed gnark proofs and strict SDK verification. Second-account adversarial ownership testing is still pending.
- YouTube dated subscription: `0e7046f2-4a43-448c-9b6f-7d1423525513`, version `1.0.3`. The existing real signed gnark proof passed strict SDK verification against published version 1.0.3 on October 9, including altered-date rejection. Version 1.0.3 changes the script bridge call only; its evidence hash is unchanged. This re-verification is not a new device-generated proof. Coverage currently means the loaded English activity page, not complete history.
- Neither route has completed actual Reclaim Verifier device acceptance yet. Published/private is not the same as ordinary-user end-to-end acceptance.
- Spotify artist-library provider `afd68bdb-673d-42e0-9036-cf013d9e5a01` 1.0.1 is experimental; do not allowlist it as equivalent.
- Albums, pre-saves, YouTube likes/comments/watch history and repeated-support source collection are not proven production routes. Architecture must accommodate them; do not invent their availability.

The current production proof endpoints still use legacy X/YouTube-comment and Base/Zama concepts. New provider helpers exist but are not wired into production. Inspect `src/lib/reclaim.ts`, `reclaim-proof.ts`, `privy-server.ts`, `v2-store.ts`, `proof-model.ts`, `proof-encryption.ts`, the existing reclaim/campaign API routes and `supabase/v2_verified_discovery.sql`. Reuse sound infrastructure, not legacy chain or evidence assumptions. In particular, the current assumption that Reclaim claim owner must equal the Privy wallet needs a secure replacement: a Verifier proof-owner key can be different.

## Ownership and boundaries for concurrent work

You own new application backend modules/routes, database migrations, `contracts/monad/`, `indexer/monad/`, their tests, functional Privy/UI wiring, and a new implementation/results handoff document. The provider assistant owns `scripts/provider-*.mjs`, `scripts/spotify-provider-lab.mjs`, `scripts/verify-provider-lab.mjs`, `src/lib/activity-evidence.ts`, `tests/activity-evidence.test.ts`, and the existing provider/handoff journals. Read these, import their helpers if appropriate, but do not modify them concurrently. Put extensions/adapters in separate files and document any required interface change. Do not operate the dedicated source browser or change/publish provider versions.

You may update package.json, lockfile and `.env.example` when necessary; preserve existing changes and make narrow edits. Do not overwrite user changes. Preserve approved emerald/coral/Jakarta design and existing animations; add functional states without redesigning the product. Follow applicable UI skills if editing frontend.

No staging, commits, pushes, PRs, destructive resets, paid infrastructure/browser allocation, outreach, mainnet transactions or public provider catalog changes. The user handles Git. No credentials, raw proofs or private history in source control, logs, screenshots or chat. Never request copied cookies or HAR files. Do not inspect or publish private proof artifacts merely to populate demo content.

## Product and eligibility implementation

Creators define versioned rules: platform, accepted activity types, target IDs, verified artist/channel relationships, cutoff with explicit timezone and reward terms. Alternatives default to OR: any accepted qualifying route suffices. A recipe's existence does not make it mandatory. Explicit repeat-support rules can require distinct events on distinct dates. Do not turn the product into a single fixed artist, track, comment or conjunction of every recipe.

Implement connect platform → consented inspection of accepted routes → candidate selection → proof → server verification → rule evaluation → eligibility result. If one accepted route has no qualifying candidate, try another. A source/network/extraction error is a technical error, not ineligibility. Stop unnecessary collection after sufficient evidence, unless the user explicitly opts into a broader support record. Implement orchestration interfaces for unsupported routes with honest capability states rather than fake handlers that return success.

Persist a common evidence record containing platform, source subject, activity type, target, authenticated artist/channel relationship, original activity time and precision, observed/proved time, stable event identity, provider ID/version/recipe hash and coverage. Support evidence gathered before a campaign. Keep private evidence server-side; public responses contain only necessary eligibility/reward information.

Use integer timestamp arithmetic, an explicit UTC normalization policy and half-open precision intervals. A precision interval overlapping the cutoff is indeterminate. A definitely earlier interval qualifies; definitely later evidence does not qualify for that rule. The existing boolean helper in activity-evidence.ts does not express all these states: do not translate every false into definitive ineligibility. Distinguish eligible, not qualifying for this rule, indeterminate, technical failure and awaiting proof. Incomplete source coverage does not establish absence from an entire account.

“Early” means verified activity before the creator's stated cutoff. It does not prove global fan rank, first-ever discovery or release-day commitment from a current save alone.

## Verification and durable backend

1. Verify Privy access tokens server-side using current supported SDK APIs, and establish that the requested wallet belongs to that authenticated user. Never trust a browser-supplied user ID, wallet or eligibility result. Inspect the existing private-looking users()._get usage against the installed supported SDK.
2. Create a one-time server-owned proof session, bound to authenticated user, wallet, nonce, selected route/provider/version and expiry. Bind signed Reclaim context to this session. Validate the actual returned proof and server request association, not an echoed callback field. Reclaim proof-owner address is not automatically the Privy wallet; replace the legacy equality assumption only with a documented, tested session binding design. A valid signature alone is insufficient to establish the intended app user/source owner.
3. Verify signatures, trusted attestor and exact allowlisted provider version plus request/body/recipe hashes using the SDK's supported verification. Do not confuse an Early configuration commitment with Reclaim's provider hash. Do not disable content/hash verification to make a proof pass. Provider lab hash-pairing constraints are documented in the journal.
4. Normalize only authenticated fields from each verified proof. Do not merge arbitrary extracted fields across proofs/items into one synthetic record. Reject account A identity combined with account B activity, mismatched owner, wrong target, mixed-item fields, altered dates, stale/reused sessions and unauthorized source relinking.
5. Source-account ownership must be established separately from proof-owner key possession. Keep routes whose ownership/device acceptance is incomplete explicitly gated from live reward authorization until the provider test evidence satisfies the documented gate. Build and test the entire path meanwhile; fixtures never bypass live gates.
6. Implement durable evidence, source-account bindings, sessions, versioned rules/evaluations and claim-authorizations in Supabase/Postgres migrations. Use transaction-safe constraints/RPCs for races; process memory and local JSON files are not production storage. Apply appropriate RLS; service-role credentials never reach browsers. Repeated identical submissions should return the same result idempotently; conflicting reuse fails.
7. Derive event identity from authenticated source identity and event fields, not session IDs or proof signatures. The same event may satisfy different campaigns but cannot become several distinct events for repeat-support counting. Use explicit ownership/privacy/retention rules and the existing encrypted raw-proof retention machinery where sound.
8. Document one-per-user and one-per-source semantics. A benefit-scoped source nullifier must survive wallet changes. Enforce source binding and per-user benefit issuance atomically to prevent claiming through multiple accepted routes. Do not claim you can identify the same human across unlinked Spotify/Google accounts. Define the residual Sybil limitation honestly.

Expose typed, authenticated APIs for rule creation, proof-session start/status/completion, evidence inspection results, evaluation and claim authorization. Use shared validation schemas, clear error codes and origin protection. Do not silently break legacy routes; isolate the new flow or migrate explicitly with tests.

## Monad escrow

Create a small native-testnet-MON benefit escrow in `contracts/monad/`, using Foundry and a pinned Solidity compiler/EVM target supported by the current Monad testnet. Verify network details from official docs and RPC chain ID before deployment; do not copy Base addresses or assume mainnet configuration.

A creator creates/funds a benefit with fixed payout, capacity, claim expiry and an immutable rule commitment/version. Define top-up, capacity, closure and refund behavior explicitly. Do not allow creator cancellation to unexpectedly invalidate an open advertised claim window. Prefer a simple non-upgradeable implementation with well-understood libraries, minimal authority and explicit signer administration.

Eligible fans claim with an Early-server-signed EIP-712 authorization bound to chain ID, verifying contract, benefit ID, beneficiary wallet, exact amount, authorization expiry and benefit-scoped source nullifier. Bind the authorization to immutable benefit terms/rule version. Enforce valid signer, correct amount, open window, funds, capacity and duplicate consumption. Bind caller to beneficiary or document safe permissionless relay to the beneficiary; funds must never go to an arbitrary submitter.

Use checks-effects-interactions and reentrancy protection. Maintain isolated accounting per benefit: one benefit cannot spend/refund another's funds. Source nullifiers must not be raw IDs or unhashed low-entropy identifiers; derive them server-side with a keyed, domain-separated construction and stable key-version policy. Rotation must not enable duplicate claims. Do not put private source IDs, raw proofs or activity on-chain.

Trust model: the contract trusts Early's eligibility signer; it does not independently establish every Spotify/Google source fact. Native test token payout is not physical ticket/merch fulfillment. Communicate this plainly in the demo.

Emit events sufficient for creation, funding, paid claims and refund/closure indexing. Produce ABI, deployment script, deployed-address manifest and deployment block only after actual execution. Never fabricate addresses or transaction hashes.

Required contract tests: valid creation/funding/claim/refund; invalid signer; wrong chain/contract/benefit/wallet; modified amount; expired authorization; duplicate claims including changed wallets; insufficient funds/capacity; unauthorized/premature refund; failed receiver transfer; reentrancy; isolation of multiple benefits. Test state rollback on failed transfer and funding/liability invariants. Review security-sensitive code and report remaining risks without calling it audited merely because tests pass.

## Privy transaction implementation

Configure actual Monad testnet embedded-wallet use with current Privy SDK/network settings. Reuse existing authenticated user flow. Implement creator funding, eligible fan claim and creator refund transactions with correct ABI/value/calldata. Login alone is not integration.

Show required network, test balance/gas, wallet confirmation, user rejection, transaction submission, receipt confirmation, revert and indexing-pending states. A returned hash is not a successful receipt. Reconcile verified receipts with server benefit state; do not trust client claims of payment. Handle wallet/account changes and expired authorization by revalidating the session and obtaining an appropriately bound authorization. Do not export embedded-wallet keys or add unnecessary delegated signing.

## Envio integration

Create an actual HyperIndex project in `indexer/monad/` with pinned dependencies, ABI, config.yaml, schema.graphql, TypeScript handlers and tests. Verify current Monad testnet HyperSync availability; use the supported RPC source if necessary. Index the real deployed escrow from its deployment block.

Build benefit funding/remaining capacity, paid claim history, refund/closure and creator totals from emitted events. Use chain/transaction/log identity for event uniqueness and deterministic processing. Enable/document rollback/reorg behavior; do not perform irreversible external effects from event handlers. Test reprocessing and aggregate consistency.

Connect the application to the real GraphQL endpoint. Indexing delay should show pending/syncing status, with chain receipt and indexed progress reconciled. Do not render an indexer lag as a failed payment. Contract state is authoritative for spending and eligibility authorizations must not rely on stale indexed balances alone. Never expose an indexer admin secret in NEXT_PUBLIC variables.

If deployment requires credentials or a Git push, finish local code, tests and deployment instructions and identify that external step. Do not violate the user's no-push rule or stop the rest of the implementation.

## Configuration and secrets

Inspect environment variable NAMES and presence only. Do not print values. Reuse existing variables when appropriate. At this handoff, RECLAIM_APP_ID/SECRET, NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_ID/SECRET, SUPABASE_URL/SERVICE_ROLE_KEY, RAW_PROOF_ENCRYPTION_KEY and RETENTION_CRON_SECRET are populated locally but not all have been validated. PRIVY_JWT_VERIFICATION_KEY, MONAD_RPC_URL and ENVIO_API_TOKEN were not found. Privy's verification key is a public verification key, not a private signing credential; determine whether the selected SDK obtains verification keys automatically before requiring this optional override.

Document only variables the implementation actually consumes. Likely new configuration:

- Monad testnet RPC URL; public chain ID, escrow address and explorer URL. Addresses are deployment outputs, not secrets. A public RPC may work without an API key.
- Testnet deployment signer, preferably an encrypted Foundry keystore; if a dedicated test-only private key is used, keep it in ignored local configuration. Never reuse Reclaim/Privy app secrets as signing keys. Creator and fan wallets need test MON for funding/gas.
- Separate Early eligibility signer through the repository's KMS/service pattern for production. An explicit local/test-only signing key can support the hackathon testnet with server-only handling, no insecure fallback and no production reuse.
- Stable server-only source-nullifier secret with explicit versioning and rotation policy. Generate securely locally if absent; do not put it in chat.
- Envio data-source credentials if required by chosen HyperSync/local setup, plus GraphQL endpoint and any server-only access credential. Hosted/local/RPC requirements differ; do not require a token merely because it appears in this list.
- Existing app origin, database and encrypted-proof retention configuration.

Update `.env.example` with placeholders and descriptions, never secrets. Tell the user precisely where a missing credential is entered securely and which action it blocks. Continue work that does not need it. Do not request broad credentials or secrets in chat.

## Official references

Read current docs before integration, particularly version-specific APIs:

- Monad testnet network: https://docs.monad.xyz/developer-essentials/testnet
- Monad complete documentation index (find current Foundry deployment/EVM compatibility guides): https://docs.monad.xyz/llms.txt
- Privy EVM network configuration: https://docs.privy.io/basics/react/advanced/configuring-evm-networks
- Privy embedded-wallet transactions: https://docs.privy.io/guide/react/wallets/embedded/prompts/transact
- Privy backend authentication: https://docs.privy.io/authentication/user-authentication/access-tokens
- Privy Node SDK setup: https://docs.privy.io/basics/nodeJS-node/setup
- Envio HyperIndex overview: https://docs.envio.dev/docs/HyperIndex/overview
- Envio configuration: https://docs.envio.dev/docs/HyperIndex/configuration-file.md
- Envio event handlers: https://docs.envio.dev/docs/HyperIndex/event-handlers.md
- Envio RPC data source: https://docs.envio.dev/docs/HyperIndex/rpc-sync.md
- Envio reorg support: https://docs.envio.dev/docs/HyperIndex/reorgs-support.md
- Envio tests: https://docs.envio.dev/docs/HyperIndex/testing.md
- Envio observability/indexing progress: https://docs.envio.dev/docs/HyperIndex/observability.md
- Envio environment configuration: https://docs.envio.dev/docs/HyperIndex/environment-variables.md
- Envio current index: https://docs.envio.dev/llms.txt

## Execution order and completion evidence

Start implementing after a short repository inspection. Establish typed interfaces and database invariants first; implement escrow and tests; connect authenticated proof verification/evaluation and EIP-712 signing; wire Privy transactions; index contract events and connect UI; exercise the integrated path. Work around genuine blockers without weakening validation. Every failure needs an exact error, supported hypothesis, bounded repair and recorded result. Do not spend the budget waiting for manual phone actions.

Run appropriate TypeScript/lint checks, backend rule/session/security tests, Foundry tests, indexer tests and focused browser integration tests. Prove OR with a test where the first accepted route does not qualify and a second does; two selectable buttons are not that test. Include wrong target, after-cutoff/overlap, mixed account/item, altered proof, stale sessions, repeated events, idempotency and concurrent issuance. Fixtures are valid for tests only; clearly separate local/unit, testnet transaction, actual device and second-account evidence.

Deliver working code, migrations, ABI/deployment tooling, indexer, transaction UI, `.env.example` updates, tester instructions and `docs/BACKEND-MONAD-PRIVY-ENVIO-RESULTS-2026-10-09.md`. Record exact commands/results, pending gates, actual addresses/blocks/transaction hashes and next action. Do not claim an end-to-end pass until a real accepted source proof produces eligibility, a creator funds through Privy, a fan claims, a duplicate fails, a refund path executes, and Envio updates the UI with real events. A missing manual test should be recorded once, not used as a reason to leave independent implementation unfinished.
