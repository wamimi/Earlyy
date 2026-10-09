# Provider experiments and real proof tests

Date: 2026-10-08, Africa/Nairobi. Follows `EVIDENCE-INSPECTION-2026-10-08.md`.

## Result

### Subsequent expansion (same date)

The user explicitly reiterated comprehensive reusable Spotify/YouTube scope and real end-to-end demo requirements. These are preserved in `PROVIDER-CAPABILITIES.md`; do not narrow the product to the original fixed-track proof.

**A second capability passed a real proof: Spotify artist-library membership with its added date.**

- Fresh request `8244.1130`, `libraryV3` with Artists filter, original capture `64aa3aee-3736-4555-96c4-0fa06025fc69`.
- Draft `draft_33e5ddb3-daed-488d-bceb-1dd16ebeae0f`.
- Authenticated replay 200/match; anonymous replay 401/no match.
- Proof `verified: true`, extracted `artist_uri` and `added_at: 2026-08-30T18:02:19Z`.
- Claim `0x316b9d7a8c441b3b8d1f771615a5b27c982fb5049f1b694d845f35177e777ecc`.
- Persistent claim `/Users/xiaomao/.reclaim/claims/1791464531968.json`.
- Display-ready claim and exact recipe `/private/tmp/early-provider-experiments/spotify-artist-result.md`.
- Recipe selects both values under `data.me.libraryV3.items[0]`. Authenticated source-identity binding, original-follow/refollow semantics, generalization and adversarial tests remain outstanding. Do not label this original-ever follow proof.

Older captures returned expired-token 401s. Refreshing real requests restored authenticated replay. A later browser CDP socket closed; `list_tabs` still found the existing signed-in tab and `start_capture` on that tab restored access. New capture: `3e29a5c0-733a-4725-b636-5cb9c03125bd`.

Saved-album experiment on the new capture:

- Request `8244.2231`, `libraryV3` with Albums filter; reported nine entries.
- Draft `draft_693ddb92-3a2a-4eca-8cd9-1ae7ba9a9370`.
- Fields `album_uri`, `saved_at`, `artist_uri` all anchored to `data.me.libraryV3.items[0]` and that item's album artists.
- Authenticated replay 200/match; anonymous replay 401/no match.
- Both real proof attempts returned `verified: false`, exact error `connection closed`. No album claim was produced. Exact recipe and retry diagnostic: `/private/tmp/early-provider-experiments/spotify-album-result.md`. The failure's underlying network/prover cause is unestablished; do not claim albums cannot be proved.
- Temporary browser priority-header replay wrapper was restored before navigating away.

YouTube structured-response lead on the new capture:

- Subscription-page Load more produced request `8605.438`, POST `/_/FootprintsMyactivityUi/data/batchexecute`, RPC `y3VFHd`; returned an empty activity array, so no further subscription rows were observed.
- Likes-page Load more produced request `8605.946`, same RPC; captured response length 64,195 characters. It contains an anti-XSSI prefix and length-framed JSON arrays; `wrb.fr` field `[2]` is a JSON-encoded string containing 100 dated activity tuples plus continuation.
- First returned like timestamp interpreted as `2026-09-03T13:18:03.263Z`. Dates and video/channel relationships exist in the same tuple shape as the initial page data.
- Drafting the decoded video URL failed because the generator did not find the decoded value in the escaped response. A selected video-ID/date draft advanced further but failed before creating a draft due to secret-header/URL overlap. Error identifies `Referer`, `X-Same-Domain`, `referer`, `x-browser-year`, `x-same-domain`, totaling 66 characters against the two-character redaction budget.
- No YouTube RPC proof was attempted because no valid draft was created. No opaque event token was deliberately added to extraction targets.

Track-to-artist expansion also exposed a generator limitation: a structural JSON fragment verified locally as present in the captured body was rejected by `propose_provider` as not found. A whole-fragment input is therefore not a supported substitute for selecting the correct track-artist field in this flow. The original artist-URI target selected album artists; do not equate that generally to track artists, especially for compilations.

Native Spotify pre-save research: official Countdown Pages guidance says albums/EPs qualify, singles do not, and pre-saved releases are added to the library on release day. A normal save date does not establish prior commitment. No authenticated pre-save evidence has yet been captured or proved. Source and scope are recorded in `PROVIDER-CAPABILITIES.md`.

**Spotify produced a real signed proof with `verified: true`. YouTube did not produce a successful proof.** No provider was published and no application code was changed. These are experimental recipes, not production-ready integrations.

The user explicitly authorized provider experiments and real proof tests through MCP, then approved cleartext disclosure of selected source-account/activity/date values to the attestor. Existing local proof-owner credentials resolved successfully without exposing the private key. Reclaim remains in old-devtools mode by default, with no persisted backend override.

Capture: `64aa3aee-3736-4555-96c4-0fa06025fc69`.

## Spotify

- Fresh captured request: `8244.337`, POST `https://api-partner.spotify.com/pathfinder/v2/query`, operation `fetchPlaylist`.
- Successful draft: `draft_07e7d2b2-e6c9-4f76-a478-b1c7ff5f8590`.
- Authenticated replay: HTTP 200, `matchesOriginal: true`.
- Secret-free replay: HTTP 401, `matchesOriginal: false`; response message `Missing/invalid/expired access token`.
- Real `run_proof`: `verified: true`.
- Extracted fields: `collection_format`, `saved_at`, `source_user_uri`, `track_uri`.
- Extracted saved date: `2026-09-05T18:17:18Z`; format: `liked-songs`.
- Claim identifier: `0x29e99c56a3544c146add229a79a28fb225b429c0a7ee5300bbd9ac3d15aa448f`.
- Recipe/provider hash in signed context: `0x87ba70bb779ce648e0c30cb68559a4983e53f7bab183c06b15e90a33cfb9e121`.
- Full tool-written claim: `/Users/xiaomao/.reclaim/claims/1791463770455.json`.
- Display-ready claim without the tool's large request payload: `/private/tmp/early-provider-experiments/spotify-claim.json`.
- Exact secret-free experimental recipe: `/private/tmp/early-provider-experiments/spotify-provider.json`.

The recipe anchors the adding user, date and track to `data.playlistV2.content.items[0]`, and the format to `data.playlistV2.format`. It is fixed to the captured playlist and item position, so it is not yet a reusable target-parameterized provider. No artist claim is included in this successful draft. The earlier draft picked an album artist rather than necessarily a track artist; use the track's artists for future eligibility work.

### Replay defect diagnosed and worked around temporarily

Original draft `draft_ead5a829-3e13-4353-bd0b-1efbe81ecc32` and the fresh draft both initially failed authenticated replay with `in-browser replay failed: Failed to fetch (api-partner.spotify.com)`.

Captured preflight requests `12261CEED84DE99FE43D4E422972CAF9` and `8769DAA889E3A5DB00ED7135212EB2FD` requested the `priority` header. Spotify's `access-control-allow-headers` did not permit it. Inspection of installed Reclaim `src/proof/page-replay.ts` confirmed browser replay injects captured non-cookie headers through fetch.

A temporary browser fetch wrapper deleted only `priority` for this exact Spotify endpoint. Authenticated MCP replay then passed. The original fetch was restored immediately afterward, before the secret-free check. The secret-free replay uses a detached Node request, as confirmed in that source. No signatures, response matchers, hash validation, or proof checks were disabled. The proof itself used the unchanged draft through MCP and passed.

This workaround was not committed to the application or installed MCP package. A durable MCP replay header fix remains desirable.

### Limits of this success

A valid signed response is not enough to establish every Early eligibility requirement. Still required:

- Prove authenticated source identity and its equality to the owner/adding user; test a different authenticated account requesting this playlist. Secret-free failure alone does not rule out access by a different signed-in account.
- Test whether the signed extraction/matching rules prevent mixing fields from different items and whether verifier-side recipe/hash enforcement rejects modified selectors or parameters.
- Add target parameterization and stable item selection, track-to-artist mapping, pagination and duplicate-event semantics.
- Validate remove/resave behavior, multiple accounts and regions, and the actual end-user Reclaim Verifier runtime.

No cross-account, malicious-parameter, signature-tampering, end-user Verifier, or repeated-save test was performed in this pass. Do not report these as passed.

## YouTube

- Original My Activity request caused a draft error because secret `Referer` overlapped the request URL beyond the tool's redaction budget.
- Recaptured a simpler URL: `https://myactivity.google.com/page?page=youtube_subscriptions`, request `29D772B180C5513FE2BA8A0CC801DAFE`.
- Draft: `draft_223285f5-cc1b-427d-975d-f69e7f0bd37d`.
- Authenticated replay: HTTP 200, `matchesOriginal: true`.
- Secret-free replay: HTTP 302, `matchesOriginal: false`, empty body.
- First real proof attempt: MCP error `timed out awaiting tools/call after 300s`. No new claim was found afterward. The underlying cause was not established.
- Second attempt: `verified: false`; extracted fields empty. The account-ID regex did not match the selected script element.
- Returned `sentParams` retained `/html[1]/body[1]/script[6]` for account identity and `/html[1]/body[1]/script[11]` for the timestamp. The error's base64 element decodes to an unrelated page initialization script, establishing that the generated positional selector did not select the expected identity data in that proof response.
- Exact error and sent parameters: `/private/tmp/early-provider-experiments/youtube-proof-error.json`.
- Exact secret-free recipe: `/private/tmp/early-provider-experiments/youtube-provider.json`.

This draft separately extracts source-account ID, timestamp, and channel URL. Even a successful proof would not yet establish that the timestamp belongs to the selected channel subscription. Repair both the positional-selector fragility and the event relationship before treating it as support evidence.

The installed `propose_provider` implementation accepts target values and names, but exposes no XPath override in its schema/handler. The listed tools do not expose an experimental-draft update method. Do not invent override arguments or publish a provider merely to test a repair. A better captured response shape or an explicit supported draft-edit mechanism is needed for a robust repair through this MCP workflow.

## Automatic approval review

A separate proposal to extract a combined YouTube event fragment was rejected by automatic approval review because it would disclose an opaque event token in addition to the selected values authorized by the user. No combined-event draft was created. The rejected payload was not retried indirectly. Work continued with the already-authorized selected fields. Future combined-event extraction should omit that token or obtain explicit approval for its disclosure first.

## Artifacts and continuation

The temporary recipe/claim/error files contain selected account values approved for this experiment but no copied request credentials. Keep them out of a public repository. Temporary files may disappear; the signed Spotify claim also exists at Reclaim's persistent claim path above.

No provider publication, Git mutation, application implementation, or claim transaction occurred. Existing local work was preserved. Next work is provider hardening and additional tests, not a claim that both integrations are ready.
