# Early credential setup

## Latest update: public settings are already installed

Monad RPC, browser-safe public RPC, chain ID 10143, MonadVision testnet explorer, deployer account name and the four route-specific provider settings are now populated in the actual `.env.local`. The public RPC was checked live and returned chain ID 10143. Skip earlier instructions to obtain/copy these public values. No secrets were overwritten.

Foundry is installed but needs updating from 1.2.3 to the current Monad-supported release (official guide requires >=1.8.0): run `foundryup`, then `forge --version`. Create the deployment keystore with `mkdir -p "$HOME/.foundry/keystores"` followed by `cast wallet new "$HOME/.foundry/keystores" early-monad-deployer`; enter its encryption password interactively. Read its public address with `cast wallet address --account early-monad-deployer`. Request test MON at https://faucet.monad.xyz using that address. No raw deployer private key needs adding to env.

The official deployment guide is https://docs.monad.xyz/guides/deploy-smart-contract/foundry. Envio token, when using local HyperSync, goes directly into the existing blank `ENVIO_API_TOKEN` entry in `.env.local`. The GraphQL endpoint and escrow address remain future outputs; no public value can substitute for them.


Fill `/Users/xiaomao/Earlyy/.env.setup.local`. It is a private, Git-ignored worksheet, not a Next.js auto-loaded filename. Existing active values remain in `.env.local`; they have not been copied, printed or overwritten. The implementation assistant must merge only completed missing entries into `.env.local`, preserve existing values, and load the indexer/Foundry environment explicitly. Never shell-source untrusted environment text or print secrets during validation.

The worksheet includes proposed names for new implementation. Those names do not imply features already exist. The assistant should adopt these names consistently and validate configuration per subsystem, so missing deployment outputs do not prevent unit tests.

## 1. Reclaim — already present locally

At https://dev.reclaimprotocol.org/ select the existing application's credentials under My Applications. `RECLAIM_APP_ID` and `RECLAIM_APP_SECRET` are already populated locally. Preserve the working pair; the secret is only shown at creation, so do not create a replacement merely to view it. If genuinely lost, use the portal's supported replacement process. Guide: https://docs.reclaimprotocol.org/api-key

The four new route-specific provider ID/version entries are prefilled. They are identifiers, not secrets. Existing legacy `RECLAIM_YOUTUBE_PROVIDER_*` fields must not be silently repointed from comments to subscriptions. The new backend must wire the route-specific entries and a reviewed provider-hash allowlist. No Spotify client secret or Google API key is needed for the current Reclaim routes. Account owners sign in themselves. No cookies in env.

`RECLAIM_REQUIRE_TEE_ATTESTATION=false` preserves current configuration; it does not disable signature/hash verification. Changing attestation policy requires compatible providers and explicit validation.

## 2. Privy — already present locally

Open https://dashboard.privy.io/ and select the existing Early app. Copy its App ID into both `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_ID`; its App Secret goes in `PRIVY_APP_SECRET`. Existing values are populated. App IDs are public identifiers; the secret is backend-only. Setup: https://docs.privy.io/basics/nodeJS/setup

`PRIVY_JWT_VERIFICATION_KEY` is an optional public verification-key override, currently absent. Leave it empty if SDK verification retrieves keys automatically. If needed, use the app's verification key, never a wallet private key.

Also configure permitted app domains/origins for localhost and the actual demo deployment, enable the chosen login methods and Ethereum embedded wallets. The assistant configures Monad as a supported chain. User-driven transactions do not require exporting embedded-wallet keys or creating delegated/session signers. Network guide: https://docs.privy.io/basics/react/advanced/configuring-evm-networks

## 3. Supabase — runtime credentials already present locally

Open https://supabase.com/dashboard and select Early's existing project. The Connect dialog/project API settings supplies the project URL (`SUPABASE_URL`). Project Settings → API Keys has the legacy `service_role` JWT for `SUPABASE_SERVICE_ROLE_KEY`. Do not substitute an anon or publishable key. Current code uses a legacy Bearer-token pattern; switching to a new `sb_secret_…` key requires deliberately adapting and testing the client. Keys guide: https://supabase.com/docs/guides/getting-started/api-keys

These credentials provide application data access; they do not automatically execute schema migrations. Choose either:

- Apply the assistant's SQL migration through the project's SQL Editor; no additional local credential needed.
- For CLI automation, supply `SUPABASE_ACCESS_TOKEN` from https://supabase.com/dashboard/account/tokens, `SUPABASE_PROJECT_REF` from project settings/URL, and `SUPABASE_DB_PASSWORD`, the project's database password. These optional names are commented out in the worksheet. Use a development/test project for destructive tests. Do not reset a database password unless necessary.

## 4. Monad — obtain network access and test funds

Use the official testnet page: https://docs.monad.xyz/developer-essentials/testnet (documentation index: https://docs.monad.xyz/llms.txt). Populate `MONAD_RPC_URL`, `NEXT_PUBLIC_MONAD_CHAIN_ID`, and `NEXT_PUBLIC_MONAD_EXPLORER_URL` from that page. Public RPCs may not need credentials; for a dedicated RPC, use a listed provider's dashboard and choose Monad TESTNET. A credential-bearing RPC URL stays server-side. The assistant must configure browser wallet RPC access without exposing a private provider key.

Create a dedicated test-only deployment wallet or let the assistant generate one locally. Prefer an encrypted Foundry keystore. If using the worksheet alternative, place its 0x-prefixed private key in `MONAD_DEPLOYER_PRIVATE_KEY`. Never use a personal/mainnet wallet or export a Privy embedded-wallet key. Obtain test MON through the faucet linked from official Monad docs, using the public wallet address only. Fund creator/fan embedded-wallet public addresses for their later transaction tests too.

`NEXT_PUBLIC_MONAD_ESCROW_ADDRESS` and `MONAD_ESCROW_DEPLOYMENT_BLOCK` are outputs after deployment. Leave blank now. Credentials do not authorize deployment: the updated prompt requires a separate user instruction before publishing/deploying code.

## 5. Locally generated secrets — no website

Existing `RAW_PROOF_ENCRYPTION_KEY` (base64 32 bytes) and `RETENTION_CRON_SECRET` are present. Preserve them; rotating encryption keys without migration can make existing proofs unreadable.

New `EARLY_SOURCE_NULLIFIER_SECRET`: generate 32 cryptographically random bytes, encode as base64 and write directly into ignored local configuration. Keep `EARLY_SOURCE_NULLIFIER_KEY_VERSION=1`; back up securely. Never silently regenerate on restart, or rotation could enable duplicate rewards.

New `EARLY_ELIGIBILITY_PRIVATE_KEY`: a separate randomly generated Ethereum signing key for testnet-only authorizations. It is not the deployer key, Reclaim application secret or Privy wallet key. `EARLY_ELIGIBILITY_SIGNER_MODE=local-testnet` must be implemented with an explicit testnet chain gate and no fallback to production. The assistant can generate both new secrets locally without showing their values in chat; nothing needs purchasing. Production signer migration to a reviewed KMS/service is separate and must not be represented as completed by this test setup.

## 6. Envio — token now, endpoint later

Open https://envio.dev/app/api-tokens, sign in, choose the intended organization, expand the available HyperSync package and create a development token. Store it in `ENVIO_API_TOKEN`. Local/self-hosted HyperSync needs this token; Envio Cloud supplies its own HyperSync access, and RPC-only indexing does not use it. Token guide: https://docs.envio.dev/docs/HyperSync/api-tokens

`ENVIO_GRAPHQL_URL` comes from the running local or deployed indexer. Leave blank until it exists. `ENVIO_GRAPHQL_AUTH_TOKEN` is conditional on endpoint protection; leave blank for an unauthenticated local endpoint. Never place an admin token in a public browser variable. The assistant must use the hosting service's correct authorization header, not assume every endpoint uses Bearer tokens.

HyperIndex loads the indexer project's `.env`; it does not automatically load this repository's `.env.local`. The assistant must explicitly provide the required values to `indexer/monad/` without copying unrelated application secrets. Hosted deployment is deferred under the no-publication rule.

## 7. App settings and things not needed

`NEXT_PUBLIC_APP_URL` and `ALLOWED_APP_ORIGINS` use localhost for local tests. Real remote callbacks require a reachable URL; a phone cannot call the laptop's localhost. Configure the actual callback/redirect after the route is implemented; never invent one. `RAW_PROOF_RETENTION_HOURS=24` is a policy setting, not a credential.

No Base/Zama credentials are required for the new Monad path. No Spotify developer/Google API credentials are required for these two Reclaim recipes. Existing Resend/Turnstile credentials concern the waitlist, not reward acceptance: preserve them, but they are not prerequisites for this work. No paid plan is implicitly authorized.

## Before starting the other assistant

Preserve existing populated credentials; fill Envio and Monad access configuration if available. Local signer/nullifier creation can be delegated to the assistant securely. Deployment addresses and the indexer URL are later outputs. Ask the assistant to validate credentials without logging values, run local tests and prepare deployment artifacts. Manual source sign-in/device tests, database schema application and permission to deploy remain separate from having env values.
