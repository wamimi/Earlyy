# Published Early provider registry

## October 9 update — supersedes readiness below

Spotify saved-track is now **1.0.2**, private and active, with dynamic collection/offset selection, actual track-artist evidence and collection-owner checks. YouTube dated subscription is now **1.0.3**, private and active, with stable selectors and same-event date/channel binding. Both have real signed gnark proofs and strict JS SDK verification against the published recipe/version; altered proofs are rejected. Browser scripts selected real requested events with a local bridge stub. **Actual Reclaim Verifier completion and second-account tests are still pending.** The artist-library provider remains at 1.0.1.

See [October 9 implementation record](PROVIDER-IMPLEMENTATION-2026-10-09.md) for exact test evidence, runtime repair details, current sessions and remaining limitations. The October 8 sections below are historical.

Published on 2026-10-08 after the user explicitly authorized publication. Ownership was checked through `get_me_providers`; no pre-existing Spotify/YouTube providers were found. Expired old-devtools authentication was refreshed through local Chrome.

| Capability | Provider ID | Latest version | Visibility | Active | Readiness |
| --- | --- | --- | --- | --- | --- |
| Spotify track save | `486e7100-ea6e-4b82-b2ee-48933a05abc6` | `1.0.1` | PRIVATE | Yes | Experimental; original captured recipe passed a signed proof |
| Spotify artist library | `afd68bdb-673d-42e0-9036-cf013d9e5a01` | `1.0.1` | PRIVATE | Yes | Experimental; original captured recipe passed a signed proof |
| YouTube dated subscription | `0e7046f2-4a43-448c-9b6f-7d1423525513` | `1.0.1` | PRIVATE | No | Registered repair baseline; signed proof has not passed |

These are three activity providers across two platforms. Spotify capabilities were registered separately so every user is not forced to prove both activities in one verification. Other capabilities remain in scope as described in `PROVIDER-CAPABILITIES.md`.

## Publication verification

- Read all three providers back using `get_provider_info` and confirmed version `1.0.1`.
- The registration endpoint initially creates `1.0.0`; the tool automatically created `1.0.1` to apply `disableRequestReplay: true`. The latest readback confirms that setting for all three.
- This flag disables document replay, not signature or request-hash validation. No validation was disabled.
- Registered in the authenticated owner's account. All three are private, not public catalog listings.
- Reclaim metadata `isApproved` and `isVerified` are false. Do not conflate these metadata fields with the earlier MCP `run_proof` results.
- YouTube was explicitly marked inactive after registration; readback confirms it.
- No account credentials were included in published recipes. Do not copy full captured request headers into future versions.
- No post-publication end-user Verifier session has yet passed. Published status is not end-to-end readiness.

## Current demo suitability

Spotify is the nearest candidate for an end-to-end hackathon demo because two source-response proofs have passed. The published track recipe is still pinned to the original collection request and first item. The artist recipe selects the first artist from the filtered library. Neither currently implements arbitrary target selection, creator cutoff evaluation, wallet binding or benefit issuance. Publishing does not complete these missing steps.

Before inviting ordinary users to test or granting benefits:

1. Generalize collection/target selection without weakening request/body or item relationship checks. Pin the exact provider version/recipe.
2. Establish and enforce authenticated source-subject ownership, including different-account access tests. A URI in a playlist response alone is insufficient.
3. Connect returned evidence to the creator's target and cutoff rules, preserve original activity dates, and deduplicate events.
4. Test the published provider in the actual Reclaim Verifier, then the full app flow through account/wallet binding and benefit claim.

YouTube is not yet suitable for a working proof demo: the HTML recipe failed positional XPath extraction. The structured My Activity RPC response exists, but the current MCP generator also encounters escaped-value and secret-header/URL overlap problems. Version the existing YouTube provider after repair; do not create duplicate providers or claim publication solved extraction.

Album, pre-save, watch/history, comments, repeated-support and track-to-artist expansion remain tracked in the capability document. No unsupported capability should be advertised as working.

## Updating these providers

Use the IDs above for new immutable versions. Always fetch the current provider configuration first and preserve every field that should survive, including document-replay settings, injection configuration, allowed requests and login URL. Never register new duplicate providers to make a small change.

No application code, Git staging, commits, pushes, PRs or on-chain transactions were changed in this publication pass.
