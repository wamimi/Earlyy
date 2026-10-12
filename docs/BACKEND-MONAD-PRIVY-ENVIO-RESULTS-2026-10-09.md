# Early backend, Monad, Privy and Envio implementation

Date: October 9, 2026. Local implementation and validation; no publication or blockchain broadcast.

## Delivered

- New isolated `/api/early/*` backend and `/rewards` workspace. Legacy proof/campaign routes remain separate. Privy now supports Monad testnet alongside the legacy Base/Ethereum testnets.
- Immutable numbered rule definitions and commitments, alternative activities evaluated as OR, distinct-event/distinct-UTC-day requirements, integer microsecond arithmetic, half-open precision intervals, and separate eligible/not-qualifying/indeterminate/awaiting-proof/technical-failure outcomes.
- Reclaim Verifier requests pinned to Spotify saved-track 1.0.2 and YouTube subscription 1.0.3. The full recipe hashes are pinned independently of Early session commitments. SDK verification still checks signatures and trusted attestors; no content-validation bypass is used. Unsigned extraction/publicData fields are ignored, and exactly one complete verified record is normalized per request.
- Durable server-owned sessions bound to a verified Privy user and linked wallet, random nonce, exact selection, provider/version/hash and expiry. The signed context and Reclaim session ID must match; an echoed callback ID is insufficient. Callback capability hashes add an initial access check. The Verifier proof-owner key may differ from the Privy wallet; possession of that key is explicitly not a source-ownership claim.
- Postgres migration with RLS, service-role-only RPCs, transactional source binding, stable event identity, idempotent completion, encrypted raw-proof retention, persisted evaluations and atomic one-per-user/per-source benefit issuance. No process-local production store.
- Native test MON escrow with fixed payout/capacity/rule/expiry, capped creator funding, signer epochs, two-step admin transfer, EIP-712 authorizations, source and wallet duplicate protection, liability accounting and post-expiry refunds. Zero-address admin transitions and renouncing admin are disabled. Signer rotation invalidates outstanding signatures.
- Privy wallet funding/claim/refund calldata, Monad network checks, balance/gas estimation, wallet rejection/submission/receipt states and backend receipt reconciliation. A transaction hash alone never marks a payment confirmed. Claims refresh server authorization; changing wallets resets the UI and revalidates account ownership.
- HyperIndex 3.14.0 project, compiled ABI, RPC ingestion, generated types, real handlers, benefit/creator aggregates, payout history, idempotent event identities and rollback configuration. GraphQL is proxied server-side. Receipt block hashes are compared with indexed events before marking a transaction indexed.
- Local secret setup, read-only preflight, deployment simulation, ABI export and post-deployment manifest tooling. No fabricated deployment manifest, address or transaction hash was written.

## Validation

The following checks were run locally. Unit/simulation fixtures do not establish device acceptance or a live end-to-end pass.

| Command | Result |
| --- | --- |
| `pnpm test:monad` | 17 passing: 16 contract tests plus the invariant suite; 256 funding-fuzz cases and 128 × 64 = 8,192 invariant calls |
| `pnpm export:monad` | ABI exported from compiled Solidity 0.8.27 artifact |
| `pnpm test:app` | 87 passed across 19 files |
| `pnpm check:indexer` | HyperIndex code generation and TypeScript passed |
| `pnpm --dir indexer/monad test` | Real HyperIndex handlers passed synthetic creation → funding → payout → refund/closure |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed; generated Envio declarations excluded, handwritten handlers checked |
| `pnpm exec playwright test tests/e2e/rewards.spec.ts` | 4 passed across desktop/mobile; entry state, overflow, no hydration exceptions, origin and authentication controls |
| `pnpm build` | Production build passed, including new API routes and `/rewards` |
| `node scripts/check-early-setup.mjs` | Chain 10143; deployer has 5 test MON; signer/nullifier settings valid; migration pending; escrow and indexer endpoint unset |
| `node scripts/monad-simulate.mjs` | RPC-backed Foundry simulation passed on chain 10143; no broadcast or password request; estimated 2,080,323 gas / 0.416064600002080323 MON at that RPC fee snapshot |

Local database tests execute the actual migration and PL/pgSQL functions in PGlite (Postgres). Concurrent Promise submissions cover idempotency and conflicting issuance. PGlite serializes access to its embedded instance; this is not a multi-connection hosted Postgres contention/load test. Unique constraints, row locks and advisory transaction locks enforce the production race boundaries.

Contract tests cover every signed field, cross-chain/cross-contract replay, wrong/malleable signatures, duplicate source with another wallet, duplicate wallet with another source, first/last capacity, partial funding, zero/overflow terms, unauthorized/premature refund, before/at/after expiry, rejecting receivers, cross-function reentrancy, failed-transfer rollback, benefit isolation, signer/admin rotation and forced-transfer surplus.

Backend tests cover OR where the first route is late and the second qualifies, collection stopping after success, technical errors, wrong target, cutoff overlap, repeated events, context/session/version/timestamp mismatches, mixed-account normalization, ignored unsigned fields, stable nullifiers, source relinking rejection, RPC privilege boundaries and authorization renewal across wallets/routes. Provider hashes are regression-checked against the actual provider recipe helpers and installed SDK.

## Configuration state

Existing `.env.local` values were preserved. Missing completed worksheet settings were merged. A separate random local-testnet eligibility key and a 32-byte base64 nullifier key were written directly into ignored `.env.local` with mode 0600; no values were printed. Public signer/admin fields were also filled. The admin is the supplied deployer `0x72abEE09224073495EFDbB4e65c75b13f672587E`.

Foundry's default stable update returned 1.5.1. Explicit installation of **1.8.0** succeeded; the Monad project uses `network = "monad"`, compiler 0.8.27 and Cancun EVM. OpenZeppelin contracts are pinned at 5.4.0. HyperIndex is pinned at 3.14.0 in its own lockfile; its generated types are local build output. The configured `ENVIO_API_TOKEN` was preserved. The launcher probes Monad testnet HyperSync when a token is present, selects it with RPC fallback on success, and otherwise uses RPC-only sync. Secrets are passed only through the child environment, not generated YAML. The synthetic handler configuration also validates the HyperSync/fallback schema.

The current Privy Node 0.27.0 SDK explicitly declares/documents `users()._get(userId)` in `resources/users.d.ts`; the leading underscore does not make it an unsupported guessed API in this installed version. `utils().auth().verifyAccessToken()` remains the token-verification entry point; the optional verification-key override is not required for the SDK's normal key retrieval path. Linked-wallet ownership is checked server-side. Live account login/transaction acceptance remains pending.

## Runtime and privacy semantics

One source account can bind to one Early user. Each user can bind at most one account per platform; automatic relinking is rejected. There is one issuance per benefit per Early user, so two accepted activity routes cannot issue two entitlements. Its first source/nullifier remains fixed across renewal and wallet changes. An unexpired authorization cannot be rebound to another wallet until expiry, unless signer rotation already invalidated it. The contract additionally consumes both source nullifier and beneficiary wallet per benefit.

Nullifiers use a keyed, domain-separated HMAC over chain/contract/benefit and source binding. Key version 1 is enforced. Back up the key securely; replacing it is not a supported rotation. A future rotation needs a reviewed binding/nullifier migration and must preserve prior entitlements. Early cannot determine whether two unlinked Google/Spotify/Privy accounts belong to the same human. Session-link sharing also cannot establish which human operated a source account.

Raw proofs use the existing AES-256-GCM envelope and expire after the configured 1–168 hours (24 by default). `POST /api/early/retention` requires the server retention bearer secret and purges expired ciphertext. Configure a private scheduled call after deployment. Normalized evidence remains private for future consented evaluations; source bindings and issuance tombstones must survive privacy deletion to preserve duplicate protection. No public profile exposes source IDs or raw history. Account deletion/export and a reviewed tombstone retention policy are not implemented here; they are required before broad production use. Never log callback query capabilities, request URLs, raw proofs or private source fields at a reverse proxy/APM layer.

## Capability boundaries

Both published routes remain **reward-gated in code** (`src/lib/early/providers.ts`). Device acceptance and second-account ownership flags are false. Credentials or test fixtures cannot turn those flags on. A provider assistant must record successful device/source-account adversarial acceptance before a reviewed gate update. New versions require reviewed hash pins, not just an env edit.

Source inspection/selection happens inside the existing Verifier provider scripts; the backend does not have independent Spotify/Google browsing access. It reports saved-record inspection and routes awaiting proof, never invents source candidates. Current scripts select a matching record; there is no independently accepted arbitrary-history candidate browser. If the provider finds no candidate or fails extraction, the user can try another accepted route. The adapter orchestration supports no-candidate, unsupported and technical failures and is tested across OR alternatives, but richer source-candidate selection and typed provider no-candidate callbacks depend on the provider work. Spotify covers a selected saved item; YouTube covers a loaded English activity page, not complete history. Albums, pre-saves, artist-library ownership, likes/comments/watch and complete listening history are explicitly unsupported for rewards. Repeated-support rules work on distinct stored evidence; broad collection coverage remains experimental.

The contract trusts Early's signer to establish off-chain eligibility. Admin rotation can invalidate authorizations. This is a testnet delivery, not an independent audit, a real-money custody guarantee or physical reward fulfillment.

## Remaining manual/live actions, in order

1. **Apply the migration** `supabase/early_monad_v3.sql` through the intended development Supabase project's SQL Editor after review. It has not been applied remotely. Run `node scripts/check-early-setup.mjs` to confirm `migration_present`. No additional credential is needed for the SQL Editor path.
2. **Check Privy dashboard** allowed origins and embedded Ethereum wallet configuration. Use `/rewards` locally to sign in and prepare a creator rule. Supply a cutoff explicitly in UTC. The two provider routes can remain alternatives; neither is mandatory simply because it exists.
3. **Provider acceptance, when ready:** use a reachable approved app origin/callback (a phone cannot reach laptop localhost), initiate one fresh session from the app, verify Spotify and YouTube, and run second-account/mixed-account/target/date/anonymous-access tests. Preserve the current provider versions until the provider assistant deliberately updates them. Do not poll old expired sessions. Update the reward gates only with recorded evidence.
4. **Separate authorization is required before deployment/publication.** The deployer keystore is `early-monad-deployer`; no password or raw key is needed in app config. See `contracts/monad/README.md`. The dry-run helper is safe to rerun; a real Foundry broadcast is a distinct manual action. After a confirmed deployment, `node scripts/record-monad-deployment.mjs <actualTxHash>` verifies creation bytecode, constructor addresses, chain, receipt and authority before writing `contracts/monad/deployments/10143.json`. Then copy its address/block into the two existing blank local env entries. Do not use the simulation address.
5. **Start the indexer after deployment:** `pnpm --dir indexer/monad dev`. The launcher explicitly reads repository `.env.local`, passes only indexer settings, requires a real address/block, and creates ignored `config.local.yaml`. Run Docker for the local Postgres/Hasura services. Copy the endpoint actually reported by Envio into `ENVIO_GRAPHQL_URL`; configure its documented auth header/value if protected. Do not invent an endpoint. Hosting remains unperformed and requires separate authorization.
6. **Run real wallet acceptance:** fund the creator and fan Privy wallets with test MON, create/fund a benefit, generate accepted source evidence, claim, retry a duplicate, wait for expiry and refund. Confirm receipts and verify Envio updates balances, capacity, claim history and creator totals. Test wallet rejection, account changes, expired authorizations, indexer delay and reorg behavior. This is the remaining live end-to-end gate.

No Git staging, commits, pushes or PRs; no provider operation, dedicated-browser use, keystore password request, blockchain broadcast, explorer verification, hosted deployment or external message was performed. The user's pre-existing prompt/setup edits and design-concept files were preserved.

Concurrent `/dashboard`, fan-dashboard components/tests and `docs/FAN-DASHBOARD-2026-10-09.md` appeared during this work. They were not authored or modified by this implementation; the final repository build and typecheck included them successfully. Next.js regenerated its tracked route-type import during build.

## Bounded fixes during validation

- Solidity import restrictions initially rejected OpenZeppelin transitive files: added the Monad project's narrow `allow_paths` entry; compilation and tests passed.
- Foundry interprets names beginning `testFail` as its removed legacy failure convention: renamed two rejection tests and reran; all tests passed.
- The root TypeScript target rejected bigint literals imported from the indexer reducer: used `BigInt(0)` in the shared reducer, preserving the app compiler target.
- Generated Envio declarations triggered ESLint rules: excluded only generated declaration paths; actual handlers remain linted and typechecked.
- New routes conflicted with stale `.next` route types: ran `next typegen`, then typecheck/build passed.
- Browser hydration exposed differing Privy ready state during SSR: gated account UI with a hydration-safe external-store snapshot; repeated desktop/mobile checks passed without exceptions.
- HyperIndex's real runtime rejects an empty address configuration even for simulated events: added a clearly marked, test-only configuration; default real configuration remains inactive until deployment.
- First deployment simulation did not activate the RPC fork and reverted at the chain guard: passed an explicit `monad` RPC alias; the next simulation passed on 10143 without broadcast.

## References checked

- https://docs.monad.xyz/tooling-and-infra/toolkits/foundry
- https://docs.privy.io/authentication/user-authentication/access-tokens
- https://docs.privy.io/basics/react/advanced/configuring-evm-networks
- https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction
- https://docs.envio.dev/docs/HyperIndex/configuration-file
- https://docs.envio.dev/docs/HyperIndex/rpc-sync
- https://docs.envio.dev/docs/HyperIndex/event-handlers
- https://docs.envio.dev/docs/HyperIndex/reorgs-support
- https://docs.envio.dev/docs/HyperIndex/testing
- https://docs.envio.dev/docs/HyperIndex/environment-variables
- https://docs.envio.dev/docs/HyperIndex/observability
- https://docs.envio.dev/docs/HyperSync/hypersync-supported-networks

Installed SDK declaration/runtime files and actual code generation were checked where documentation and version-specific APIs matter. Network configuration was checked by RPC. Envio lists Monad testnet (10143) as supported. `https://10143.hypersync.xyz/height` returned HTTP 200 with the configured Bearer token; no token value was printed. This demonstrates a successful request with that token, not an authentication-enforcement test or live contract-event ingestion. No indexer was started against a deployment.
