# Early Monad HyperIndex

Pinned HyperIndex 3.14.0. Code generation uses the ABI exported from the actual Solidity build. `config.yaml` deliberately has no contract address; it cannot accidentally index a fabricated deployment. `config.test.yaml` is only for synthetic-event tests and must never be used as a live deployment configuration.

```sh
pnpm --dir indexer/monad install
pnpm export:monad
pnpm check:indexer
pnpm --dir indexer/monad test
```

After an explicitly authorized contract deployment, set the real address and block in repository `.env.local`, run Docker, then:

```sh
pnpm --dir indexer/monad dev
```

The launcher parses `.env.local` explicitly without shell evaluation, maps `MONAD_RPC_URL` to the indexer's `ENVIO_MONAD_RPC_URL`, and passes only those indexer settings. It does not forward Supabase, Privy, Reclaim or signer secrets. When `ENVIO_API_TOKEN` is present, it probes Monad testnet HyperSync with an eight-second timeout and selects HyperSync with RPC fallback if successful. Otherwise it uses RPC sync. Envio lists chain 10143 as supported; its height endpoint returned HTTP 200 with the configured token on October 9. This checks reachability, not full event ingestion. The token is passed through the environment, never embedded in generated YAML.

Use the actual GraphQL endpoint reported by the running local services. The Next backend uses `ENVIO_GRAPHQL_URL`, and optionally `ENVIO_GRAPHQL_AUTH_HEADER` plus the exact header value in `ENVIO_GRAPHQL_AUTH_TOKEN`. For a Hasura admin secret use the endpoint's documented `x-hasura-admin-secret` header; for Bearer auth include the `Bearer ` prefix in the configured value. Nothing is exposed through `NEXT_PUBLIC`.

The handler entities are `Benefit`, `Creator`, `Claim` and `IndexedEvent`. Benefit identity includes chain and contract. Event identity includes chain, transaction hash and log index. A creation initializes accounting at zero; the following funding event records the initial deposit. All balances use bigint. Reprocessing an event is idempotent. Handlers perform no external writes, so HyperIndex can roll back all entity changes together with `rollback_on_reorg: true`. RPC reorg behavior on the actual network still needs live acceptance; synthetic reducer replay is not proof of every RPC edge case.

The frontend distinguishes submitted/confirming/confirmed and indexing pending/unavailable/indexed. Its GraphQL reconciliation compares the indexed block hash to the canonical RPC receipt. Contract state, not indexed aggregates, determines available funds and claim authorization. A stale indexer cannot authorize spending.

The real-handler test uses `createTestIndexer()` and explicit simulated events. It exercises Envio's runtime and generated handler interfaces without network transactions or a hosted database. Hosting and deployment remain separate manual actions.
