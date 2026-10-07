# Canonical repository

Early's canonical repository is https://github.com/wamimi/Earlyy (double Y).

On 7 October 2026, the local checkout's `origin` was corrected to this repository. The former single-Y repository is retained as `legacy-early` for reference. The active work remains on `feature/x-proof-conformance`; this name reflects its history, not a final product architecture decision.

## History comparison

Before migration, Earlyy's feature branch ended at `f7d460c4`. The local branch and the old repository's feature branch ended at `c0a319db`. Earlyy's feature tip was a direct ancestor of the local tip, with zero unique commits on Earlyy's side and eleven missing commits on the local side.

The eleven commits, all dated 6 October 2026, are preserved without rewriting:

- `81b7a7a6` Add Jakarta font and scroll-driven image portal
- `e6487725` Redesign landing page with illustrated steps and dark footer
- `8a8e98c3` Test landing page navigation and responsive portal behavior
- `f1cb9425` Add mountain hero background and moving creator image row
- `26398128` Test uniform image motion and backstage portal transitions
- `bf5a94fc` Upgrade Reclaim X provider to v1.0.6 with mobile authorization compatibility
- `7e7bdcb7` Record Base and Zama testnet deployments
- `2ff1a308` Replace moving image row with selectable stacked portal
- `7f6fd402` Reposition Early around supporter recognition and rewards
- `2c7d10c6` Unify public page styling and clarify prelaunch availability
- `c0a319db` Test stacked portal selection and public prelaunch messaging

Current UI work is committed in separate branding, landing, campaigns, brands, developers, validation, and documentation batches. Public website repository links use Earlyy.

Only the active feature branch is published. Both repositories' `main` branches are left untouched, and the old repository is not deleted or modified. Git history and uncommitted files were backed up locally before migration; ignored environment files and local tooling are not published.
