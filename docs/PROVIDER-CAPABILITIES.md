# Early reusable platform-provider requirements

User-confirmed scope, 2026-10-08. This is a product integration, not a proof hardcoded to one sample song or artist. Preserve the full scope while validating each capability honestly.

## Required behavior

- Build reusable platform/activity recipes that ordinary users can use with real existing accounts and released artists. Do not require an artist partnership for the demo.
- Creators choose artist/channel, track/video/album targets, cutoffs, and qualifying actions. A new creator or target must not require a bespoke provider.
- Users can establish support records before a campaign exists. Rules can later evaluate those records with user consent.
- Cover every feasible activity supported by trustworthy source evidence on Spotify and YouTube. Do not drop capabilities merely because one sample track is easier.
- Creator rules may accept any qualifying action, require several actions, or require distinct activities across dates. Reproving one event must not increase support.
- The hackathon demonstration must eventually work end to end with real evidence, account/wallet binding, rule evaluation, and a benefit claim. A successful isolated proof does not complete it.
- Keep source account, action, target, target-to-artist/channel relationship, activity time, and evidence coverage associated. Never combine unrelated fields just because they occur in one response.

## Capability scope and honest claims

| Platform | Capability | Rule enabled if fully validated |
| --- | --- | --- |
| Spotify | Track save and its added timestamp | Saved this track before creator cutoff |
| Spotify | Track save plus track artist IDs | Saved any qualifying track by this artist before cutoff |
| Spotify | Album save, added date and album artist IDs | Saved this album / an album by this artist before cutoff |
| Spotify | Artist-library membership and added date | Follow/library support before cutoff, using only validated date semantics |
| Spotify | Native pre-save state/event and release relationship | Pre-saved this album/EP before release or cutoff |
| Spotify | Single/track pre-save from an authenticated source | Separate investigation; do not infer from native album pre-save or a later save |
| Spotify | Last-played context summaries | Narrow last-played observation, never complete listening history |
| YouTube | Dated subscription to channel | Subscribed before cutoff |
| YouTube | Dated video like plus owning channel | Liked this video / this channel's video before cutoff |
| YouTube | Dated comment with video/comment identity and channel mapping | Commented before cutoff |
| YouTube | Dated watch records, including YouTube Music | Source-recorded watch activity before cutoff; no duration/completion assumption |
| Both | Multiple distinct dated events | Repeated support under explicit creator rules |

"Early" means qualifying source-recorded activity before an explicit cutoff. Do not promise literal first-ever discovery, top-N fan rank, or being earlier than every other fan without comparative evidence. Creators may offer tickets, merchandise or other benefits; no reward is guaranteed absent an actual configured benefit.

## Architecture and validation

A platform integration may comprise several reusable activity recipes. It need not force every activity into one giant response or require users to disclose their whole history. Present one coherent platform capability set while proving only evidence needed for the selected rule.

Statuses must distinguish discovered evidence, successful experimental proof, reusable recipe, account-bound validated capability, and end-to-end tested capability. A technically verified signature alone is not the final acceptance criterion.

Before a capability is offered: authenticated/anonymous tests, different-account access tests, target/item/date tampering checks, recipe/hash pinning, source-subject and wallet binding, pagination/coverage handling, duplicate protection, date precision, and real end-user Reclaim Verifier execution are required. Missing or unavailable evidence is not automatically ineligibility.

Keep experimentation and specification progress separate from publication/application implementation. No Git staging, commits, pushes, or PRs. Preserve existing design and work.

## Pre-save research finding

Spotify's official Countdown Pages documentation states that native Countdown Pages apply to new original albums and EPs, not singles. It says pre-saved releases are added to the library on release. Therefore a later library save timestamp alone does not establish when the pre-save commitment happened. Capture a native pre-save state/event and release date relationship separately; inspect current authenticated responses before promising historical pre-save support.

Source checked 2026-10-08: https://support.spotify.com/bn-ms/artists/article/getting-started-with-countdown-pages-on-spotify/
