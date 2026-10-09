# Early native test MON benefits

Non-upgradeable testnet escrow. Read `../../docs/MONAD-ESCROW-DESIGN.md` and the implementation results before a deployment. The eligibility signer is separate from the encrypted deployer keystore. Creator funds cannot be withdrawn by the admin. Signer rotation increments an epoch and invalidates all pending authorizations. Admin transfer requires acceptance; renunciation is disabled.

## Local validation

From the repository root:

```sh
pnpm install
pnpm test:monad
pnpm export:monad
node scripts/check-early-setup.mjs
node scripts/monad-simulate.mjs
```

Foundry >=1.8.0 is required. The project selects Monad execution, Solidity 0.8.27, Cancun and pinned OpenZeppelin 5.4.0. The simulation explicitly forks the Monad RPC and cannot broadcast; it does not open the deployment keystore. Its predicted address is not a deployed address. Ignore its local dry-run transaction files.

## Later manual deployment

Deployment is not authorized by the current implementation request. Only after separate authorization, load the public `MONAD_RPC_URL`, `MONAD_ESCROW_ADMIN` and `EARLY_ELIGIBILITY_SIGNER_ADDRESS` from private local configuration into the terminal environment (do not shell-source unknown env text). Then, from this directory, the Foundry command is:

```sh
forge script script/Deploy.s.sol:Deploy --rpc-url monad --account early-monad-deployer --broadcast
```

The wallet owner enters the keystore password interactively. Do not put it in chat, env or command arguments. Do not use the eligibility private key to deploy. Explorer source publication remains a separate action, not included in this command.

After a real confirmed deployment, from the repository root:

```sh
node scripts/record-monad-deployment.mjs ACTUAL_DEPLOYMENT_TRANSACTION_HASH
```

This checks chain 10143, successful creation receipt, matching compiled creation bytecode/constructor inputs, current signer/admin and canonical confirmations. Only then does it create a public manifest. Copy its address into `NEXT_PUBLIC_MONAD_ESCROW_ADDRESS` and block into `MONAD_ESCROW_DEPLOYMENT_BLOCK`; restart the app and indexer.

Liabilities are conserved per benefit. Forced transfers are tolerated surplus. Refunds require `now >= benefit.expiry`; claims require `now < authorization.expiry` and `now < benefit.expiry`. The creator cannot cancel an open window or change payout, capacity or rules. One recipient's failed transfer reverts only that transaction.
