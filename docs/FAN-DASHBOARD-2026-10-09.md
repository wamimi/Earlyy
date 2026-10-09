# Fan dashboard handoff — 9 October 2026

Implemented `/dashboard` and `/dashboard/campaigns/[id]` in the approved portrait-free emerald/white/coral direction. Uses the existing Jakarta font and Early logo. No sample artists, campaign records, reward balances or proof results are injected.

## Integration

- Discover reads `list-rules`; platform filters operate on the actual rule alternatives.
- My support reads `evidence`. Loading, errors and empty results are distinct states.
- Campaign details display target links, UTC cutoffs, distinct-event/day requirements and test MON terms.
- Consent precedes `inspect`. Existing qualifying evidence avoids a new proof request. Otherwise `sessions` starts the selected route and displays its Reclaim QR/link.
- `session-status` polls until verification, expiry or a technical failure. `evaluate` determines eligibility on the server. Network failures allow retry; technical failures are not ineligibility.
- Recovery stores only session ID and expiry in session storage, scoped to wallet and campaign. No private history or request URL is persisted there.
- Rewards links to the existing `/rewards` workspace. Funding is explicitly unconfirmed because `list-rules` does not return funded benefit linkage. Provider acceptance gates remain unchanged.

## Remaining live integration checks

- Sign in through Privy, create a real rule, select it in the dashboard and complete real Spotify/YouTube Verifier sessions. Those authenticated flows have not been certified by the signed-out UI checks.
- The backend currently sets Reclaim return/cancel URLs to `/rewards`. For direct return to campaign details, add a server-validated same-origin return destination tied to the session. Do not accept arbitrary client redirect URLs. Desktop polling works while the dashboard remains open.
- Supply actual benefit funding/linkage before labeling campaign rewards available or adding a direct campaign claim action.
- Second-account ownership acceptance and provider device tests remain required; this UI does not bypass them.

## Validation

- Production build, TypeScript and scoped ESLint passed. The initial sandboxed build was interrupted after stalling; the unrestricted retry completed successfully.
- Four Playwright checks passed across desktop and mobile: private navigation, campaign deep links, sign-in gate, accessible main/skip target, and viewport overflow.
- Inspected desktop and mobile screenshots of the signed-out dashboard and mobile campaign details.
- Static layout/type scans and a source review completed; corrected polling cancellation, hidden skip target, loading/empty confusion and clipped keyboard focus.

No commits, pushes or deployments were performed.
