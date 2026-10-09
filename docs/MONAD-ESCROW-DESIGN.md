# Testnet benefit escrow

Actors: a two-step administrator rotates the eligibility signer; a creator fixes a benefit's rule commitment/version, payout, capacity and exclusive expiry; a beneficiary receives the signed payout. Anyone may relay a claim, but its recipient is signed. The administrator cannot withdraw creator funds. Signer rotation increments an epoch and immediately invalidates outstanding authorizations; clients must request a fresh authorization.

State machine: absent → open → closed. Creation may be partially funded. Only the creator can top up, at most to payout × capacity, before expiry. Terms and capacity never change. Claims require now < both expiries. Closure/refund requires now >= benefit expiry and returns only that benefit's remaining liability to its creator. There is no early cancellation. A rejecting creator can retry closure; unrelated benefits remain usable.

Accounting: funded = paid + refunded + remaining per benefit; total remaining <= native balance; claim count <= capacity. Forced transfers are surplus and are not creator liabilities. No surplus withdrawal is implemented. All money-moving entry points share the reentrancy guard. Failed transfers revert state and events. A beneficiary and a benefit-scoped source nullifier can each be consumed once per benefit.

Trust: eligibility depends on Early's off-chain signer, authenticated sessions, source binding and durable issuance. Signer/admin compromise can authorize fraudulent claims or invalidate pending signatures, but cannot change fixed benefit terms or refund destination. This is native test MON only, not ticket/merch fulfillment and not an independently audited custody system.
