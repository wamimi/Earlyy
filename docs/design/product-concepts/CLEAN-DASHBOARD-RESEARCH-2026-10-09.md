# Clean dashboards and product decisions

Design proposal only; no frontend implementation approved or performed in this pass. Preserve the first concept's emerald/coral/white palette but remove portraits and invented artists. Use typography, restrained line icons and real campaign state. The fan, creator and brand concepts use empty states instead of fabricated traction.

## Screen contract

Fan: Discover, My support, Rewards, Account. A campaign drawer shows exact targets, cutoff/timezone, accepted alternatives, reward and organizer. Display only server-validated eligibility; never successful evidence before proof. The live experience begins on Early, hands off to Reclaim, then resumes server validation and claim state.

Creator: Campaigns, Funding, Activity, Settings. Start with drafts; no funding/paid metrics until actual transactions. The form must capture each platform's target separately, then preview the rule before funding. Any-one is default; advanced conjunction/repeated-event rules must describe their requirements plainly. Empty source selectors or unresolved target IDs disable funding. Funding is not sufficient to publish a campaign with unsupported proof routes.

Brand: same campaign engine with organization/team context, budget and reports. Spotify/YouTube activity does not establish purchase history or customer loyalty. Commerce integrations are unavailable until separately implemented. Reports concern campaign funnel, verification results and actual rewards, not inferred listening profiles, purchased consumer lists or fabricated ROI. Brand artwork is optional; use owned/authorized uploads if supplied.

Images are concept art, not screenshots of completed application. Correct generator-added copy before implementation: past-tense requirements (not new engagement instructions), no Spotify-follow/listening-history promise, no generic 'and more', no eligibility claim from mere connection, explicit public campaign targets, sufficient text contrast. The live first-run experience contains no campaign until one is configured and funded; the illustrated Early community demo is a proposed record.

## Permissionless proposal, with exact scope

Separate organizer from subject. A community organizer can fund a campaign referencing a source target; this does not verify that the organizer represents that artist. Display organizer identity and independent/official status prominently. Official badge requires an evidence-backed representative verification process; wallet possession alone is insufficient. Never claim false partnership or imply an artist is paying rewards when the community is.

Technical layers: open campaign creation, controlled/curated discovery, allowlisted evidence verification, server-authorized claims. That is permissionless creation with trusted eligibility, NOT a fully permissionless proof-verification protocol. Do not let creators supply arbitrary provider hashes or overwrite source-account binding. Moderation/reporting and limits remain possible on the application discovery layer.

For a real-evidence test, create a self-funded Early demo, select an actual track/channel by source ID, choose an explicit retrospective cutoff before campaign announcement, use authentic existing user activity and pay test MON. This can test technical functionality without an artist-operated account, but is not a conclusion that public commercial use needs no permissions. No artist portrait is necessary. Known IDs should come from source links, not name guessing. Real artist affiliation is distinct from real activity.

Platform-policy finding: Spotify Developer Policy prohibits implied endorsement, artificial manipulation including compensation, and some profiling/marketing uses; its limited non-streaming commercial permissions do not waive those restrictions. It does not explicitly approve this historical-reward model. Reclaim access is not evidence that applicable service terms or artwork rights are waived. API policy scope must be distinguished from authenticated web-source access; do not claim an exemption. Review the concrete historical-recognition product before commercial rollout; don't turn the flow into paid new likes/follows/streams.

Sources checked October 9:
- https://developer.spotify.com/policy
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/terms/api-services-terms-of-service

## Revenue proposal (hypotheses, not existing pricing)

Keep fan participation free. Organizers pay for operating funded recognition campaigns. Start with a campaign service fee and metered verification allowance, charged separately from the promised reward budget. Measure actual Reclaim completion/attempt/retry charges, wallet costs, storage, indexing, support and abuse before choosing prices. Do not advertise unlimited proof attempts. Reused evidence still needs validity/rule checks and may reduce marginal costs.

Later: organization subscription for multiple campaigns, team permissions, exports of consented campaign results and support; developer usage plans for normalized verification APIs. Do not monetize raw private activity histories or sell inferred Spotify listener profiles. These options remain subject to platform-use review.

Unit economics: net contribution = service revenue minus provider/proof costs (including charged failures/retries), sponsored network costs, infrastructure, payment fees and support/abuse cost. Reward principal is liability, not revenue. A percentage-only fee can fail on many low-value claims; model minimum campaign charge plus bounded included proofs before adding a success fee.

Illustrative only: 1,000 claims × $1 reward = $1,000 reward principal. A separate 5% service fee earns $50 gross, before all costs. If average variable cost is $0.08/claim, $80 in variable costs already exceeds that fee. Actual costs are not established. No production fee contract change should be slipped into the current escrow task; choose pricing and fee/refund semantics explicitly first. Testnet tokens are not business revenue.

## Provider expansion: bounded experiments and pass criteria

These are proposed experiments based on repository evidence, not new successful proofs.

### Spotify albums

Observed authenticated libraryV3 Albums data contains dated album entries; both prior proofs ended 'connection closed'. Refresh authenticated capture, replay unchanged baseline, then run the minimal album recipe with gnark, which subsequently worked for tracks/subscriptions. Hold target/response constant while comparing engine behavior; record payload bytes, stage reached, timings and exact error. Preserve identity/date/album/artist in one selected item and authenticated account context. Minimize returned records only if source supports it. If failure persists, compare minimal field additions one at a time and inspect attestor diagnostics; do not just raise timeouts or weaken checks. Require strict signatures/provider hash, another target and mixed-item/account/date rejection before publishing capability.

### Pre-saves

Need authenticated state/event tied to source account and release ID. Historical pre-save date cannot be inferred from a release-day library save. Inspect an actual upcoming eligible album/EP's source response. If it exposes only current pre-saved=true, a signed observation made before cutoff/release can establish 'pre-save active by proof time' if both state and release relation are authenticated; it does NOT establish exact original commitment time or survive arbitrary retroactive inference. Early's own record timestamp alone is not a Spotify historical event. No verified native single pre-save route is established. With no suitable source evidence, classify unsupported instead of inventing a date.

Official source: https://support.spotify.com/ml-en/artists/article/getting-started-with-countdown-pages-on-spotify/ says native Countdown Pages apply to new albums/EPs, not singles, and add releases to libraries on release day.

### YouTube likes/comments/watch history

First apply the repaired stable-script/same-tuple method separately to each activity type. Never reuse subscription tuple offsets or label checks blindly. Bind source subject, activity type, timestamp, target video/comment ID and channel relationship. If channel relation requires separate metadata proof, join only on authenticated video ID, not client-supplied names. Comments require author/account evidence, not only public comment existence. Watches establish recorded activity, not completion or watch duration.

Pagination RPC has nested escaped JSON/anti-XSSI framing. The generator's decoded URL not-found issue needs selectors matching the actual raw response plus test fixtures for escaping; decoding for inspection does not authorize matching a fabricated normalized response. The secret-header/URL overlap requires classifying each header: drop unnecessary headers only after replay proves equivalence, mark genuinely public constants appropriately, retain real credentials as secret. Never resolve it by revealing cookies/auth tokens or increasing disclosure blindly. Equal match/redaction coverage and pinned request/body/recipe hashes remain mandatory. If stable initial HTML works first, ship bounded coverage honestly before expanding pagination.

### Repeated support

Aggregate only separately verified normalized events. Stable source/event IDs must survive re-proving; duplicate submissions are idempotent. Explicit rule defines distinct dates/timezone and qualifying target relation. Two proofs of one event count once; different eligible events on the same date do not satisfy a two-date rule. Gather only the minimum qualifying events. Test duplicates, conflicting source accounts, cutoff edges and date boundaries. This is backend aggregation plus acquisition of enough secure source events, not necessarily a new giant provider.

Order: album gnark experiment → YouTube likes → comments/watch routes → multi-event collection and aggregation, while pre-save evidence discovery runs when an eligible source event exists. Every route still needs end-user frontend/Verifier and second-account acceptance. These tests are not replaced by generated dashboard images.
