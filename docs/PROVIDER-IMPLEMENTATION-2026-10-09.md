# Provider implementation — October 9

## Current result

Spotify saved-track version **1.0.2** and YouTube dated-subscription version **1.0.3** are published under the existing IDs, PRIVATE and active for testing. Both have real signed proofs and independent JS SDK verification with strict provider/version hash checks. **Actual Reclaim Verifier device completion and second-account acceptance remain pending.** Do not label the whole product or hackathon demo end-to-end complete.

| Route | Provider | Version | Verified today |
| --- | --- | --- | --- |
| Spotify track save / saved track by an artist | `486e7100-ea6e-4b82-b2ee-48933a05abc6` | 1.0.2 | Authenticated 200, anonymous 401, multiple real tracks/offsets, signed gnark proofs, strict SDK and published-version verification, altered-proof rejection |
| YouTube dated subscription | `0e7046f2-4a43-448c-9b6f-7d1423525513` | 1.0.3 | Authenticated 200, anonymous 302, two real subscription events, signed gnark proofs, strict SDK and published-version verification, altered-date rejection |
| Spotify artist library | `afd68bdb-673d-42e0-9036-cf013d9e5a01` | 1.0.1 unchanged | October 8 experimental first-item proof only; not the new saved-track-to-artist route |

## Repairs and generalization

YouTube:

- Stable `script[data-id="_gd"]` and `script[class="ds:3"]` anchors replace positional XPath.
- One attestor regex binds the timestamp and channel in the same subscription tuple. Two revealed fragments surround exactly 115 redacted bytes; the opaque event token is never revealed. A changed token format fails closed. This requires the attestor's 3.2+ redaction framing.
- A reusable script selects a requested `channel_id` and optional UTC `cutoff`, or the first subscription when no target is supplied for a provider smoke test. It currently searches the loaded activity page only. Absence there is not proof of no earlier support.
- Local browser bridge tests selected the second real event. They used a stub bridge and are explicitly not Verifier acceptance tests.
- stwo generated ZK proofs but the attestor connection repeatedly closed afterward. The supported gnark engine completed successfully. This isolates an engine-dependent failure; it does not prove a particular server timeout/root cause. Actual Verifier engine behavior remains to be exercised.
- SDK 5.6 hashes match/redaction pairs by index. The initial two-match/three-redaction recipe failed full-hash validation. Three required matches now cover all three redactions; regression tests compare SDK and attestor hashes.
- Version 1.0.2 first published the repaired recipe. Readback reported `isScriptRequestingClaim:false` because the script used an alias for the bridge. Version 1.0.3 uses explicit `window.Reclaim.requestClaim`; readback confirms the flag is true. The evidence recipe/hash is unchanged between these versions.

Spotify:

- The request body templates only the collection URI and numeric offset. Operation, persisted-query hash, flags and `limit:1` stay pinned.
- Proof reveals one selected saved item, its collection owner, `format:liked-songs`, and `canEditItems:true`. The selected item contains its save date, track, actual track artists and source subject. It includes selected record metadata, not the entire listening/library history.
- The owner extractor is anchored to `ownerV2` rather than an arbitrary `uri` elsewhere in the response. The normalizer requires the item's added-by source to equal that owner.
- Script discovers the user's own collection from the real page request; selects `track_id`, `artist_id`, and optional cutoff; paginates up to 100 pages; then requests a one-item proof. A page-limit/technical failure is not treated as ineligibility.
- The account relationship additionally relies on Spotify's authenticated edit capability for a liked-songs collection. **The adversarial second-account request has not yet been run.** Do not assume anonymous rejection alone completes that test.
- Actual track artists are used for artist qualification, not album artists.

## Evidence identifiers and private artifacts

Final YouTube signed proof (three matches):
`0x8c26030b5475a17499d2996786b64e345db5d6e1246cbfd73d757cfe9bc798a7`.

Earlier event-bound YouTube proofs, before the SDK pairing adjustment:
`0x24e038ebf910737fc11d2147e750d6edbecb03c6e3ed2c85ac2cd822d6b7298a` and
`0x1d1628b6ecaf8afca7904668e7187dcbd868b18eb0effc4a4292ac0381727942`.
These establish real event selection but are not the final allowlisted recipe.

Spotify final owner-anchored proof at offset 15:
`0xa01d56884f1c48c50088f4f3f617136fa51f6437da0987f51cb57807bb6902a4`.

Spotify offset 40 (beyond the first page), same final recipe:
`0x3f0bdd6edcdedc5e02e8dc4b71ba9e9b4e5e8a8eb6cbc5980ca30cf153cd0509`.
The real browser script also paginated and selected offset 40 successfully with the local bridge stub.

Private artifacts live under `/private/tmp/early-provider-lab/` (directory mode 0700, proof files 0600). They may contain signed private activity and raw SDK diagnostics; do not commit or publish them. Historical YouTube filenames say `selector-repair` even though the final result uses the bound-event recipe. Public recipe construction is in `scripts/provider-recipes.mjs`; no credentials belong there.

## Tests and application boundary

Final local checks: seven attestor recipe tests passed; thirteen targeted application tests passed (activity evidence plus existing Reclaim flow/start tests); TypeScript checking and targeted lint passed. Spotify offset-40 proof also passed strict verification against published 1.0.2, with its actual save date altered in the negative test and rejected.

- `scripts/provider-recipes.test.mjs`: actual installed attestor extraction/receipt checks, mixed-event rejection, absent-date rejection, parameter validation, complete-selector hashing and stable hashes across selections.
- `tests/activity-evidence.test.ts`: owner mismatch, track-versus-album artist mapping, OR routes, wrong target, cutoff boundary, microsecond precision and stable event identifiers.
- Cutoff evaluation conservatively respects Spotify's one-second timestamp precision and YouTube's microsecond precision. An overlapping precision interval does not qualify.
- `src/lib/activity-evidence.ts` normalizes **already strictly verified** fields and evaluates creator alternatives. It is a helper, not a replacement for signature/session validation.
- `scripts/verify-provider-lab.mjs` independently verifies signatures and exact trusted recipe or published provider/version, then confirms tampered context rejection. No content-validation bypass.
- `scripts/provider-verifier-session.mjs` uses existing backend-only app credentials, pins provider versions, requests `verificationMode:app`, listens for completion, and checks session context. Its QR/link is a real Verifier request, not a portal or simulated proof.
- Existing production proof routes still implement the older X/YouTube-comment model. These new helpers are **not yet wired into the production account/wallet/reward flow**. No Monad, Privy reward transaction or Envio work was performed in this pass.

## Device-test sessions

Session IDs (private request URLs/QR files are in the matching private directories):

- YouTube 1.0.3: `1584024f89`, directory `verifier-cbb81e91-c05b-4703-9c68-64e0f6799ad1`.
- Spotify 1.0.2: `a6defaa048`, directory `verifier-d3c2a051-0221-4c7e-a35c-0ed046201550`.
- Superseded YouTube 1.0.2: `ecb8e97815`; do not use for acceptance.

The YouTube 1.0.3 listener timed out without a proof. No device completion is established for either platform. On October 9 the user explicitly deferred phone and second-account tests until independent implementation is finished. Do not poll or regenerate sessions until the user is ready; the links above must not be presented as fresh. An unanswered prompt is not completion.

## Resume commands and remaining work

Use `RECLAIM_AGENT_ROOT` pointing to the installed `@reclaimprotocol/agent` with existing proving resources. Today's working installation was `/Users/xiaomao/.npm/_npx/771f12908941f372/node_modules/@reclaimprotocol/agent`. The lab checks resources before running to avoid an SDK downloader writing into the working directory. A mistaken initial download was stopped and its created temporary download folder removed.

- Run `node --test scripts/provider-recipes.test.mjs` with that root for the attestor tests.
- `scripts/provider-lab.mjs` defaults to event-bound YouTube proof; `EARLY_SELECTOR_ONLY=true` is diagnostic only. Set `EARLY_ZK_ENGINE=gnark`, `EARLY_CAPTURE_TAB`, and optional `EARLY_CHANNEL_ID`.
- `scripts/spotify-provider-lab.mjs` takes `EARLY_CAPTURE_TAB` and `EARLY_TRACK_OFFSET`; credentials remain in memory.
- `scripts/provider-script-smoke.mjs` takes optional `EARLY_SCRIPT_PLATFORM`, `EARLY_SCRIPT_TRACK_ID`, `EARLY_SCRIPT_CHANNEL_ID`. Its bridge is stubbed; it checks script selection only. Page/Runtime domains must be enabled before pre-navigation injection.
- Finish actual Verifier tests; inspect exact client logs if they fail. Do not substitute the SDK proof runner for this milestone.
- Run account A/B tests, including Google Personal/Brand semantics. Keep source-account binding separate from proof owner/wallet binding.
- Album/pre-save, artist-library ownership, YouTube likes/comments/watch history and repeated-support aggregation remain in the capability backlog. Today's successful gnark path is a concrete next experiment for the earlier album `connection closed` failure, not proof that albums are already working.
- Current YouTube extraction expects the English `Subscribed to` response and the observed Google event format. Spotify owner extraction currently accepts alphanumeric Spotify source URIs. Changed/localized formats fail closed and need explicit coverage before claiming universal account support.

No staging, commits, pushes or PRs. Existing user changes preserved.

## Final-version verification and parallel handoff

The existing final YouTube signed proof was independently verified against published **1.0.3**: `verified:true`, `alteredDateRejected:true`. Initial restricted-network attempt failed with DNS `ENOTFOUND api.reclaimprotocol.org`; the approved network-enabled retry passed. The negative-test identifier-mismatch log is expected. This checks the final published configuration, not actual device acceptance.

The other implementation assistant should use `docs/BACKEND-MONAD-PRIVY-ENVIO-PROMPT-2026-10-09.md`. It owns backend/Monad/Privy/Envio work; provider files stay with this thread. No additional phone sessions were generated. Remaining provider work includes device acceptance, adversarial second-account ownership tests, broader source/locale coverage and additional activity recipes; these must not be reported complete.
