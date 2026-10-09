# Early prelaunch setup

The marketing pages now direct people to `/waitlist`. Campaign publishing, brand onboarding, and developer documentation are coming soon. Existing campaign images describe possible rewards, not open campaigns. The layout, imagery, and scroll animations are preserved.

## Enable real signups on Vercel

1. In Resend, create four Segments: Early Supporters, Early Creators, Early Brands, and Early Developers. Copy each segment ID.
2. Create a Resend API key with access to read and write Contacts. Set `RESEND_API_KEY` in Vercel. This key is server-only; never prefix it with `NEXT_PUBLIC_`.
3. Set `RESEND_WAITLIST_SUPPORTER_SEGMENT_ID`, `RESEND_WAITLIST_CREATOR_SEGMENT_ID`, `RESEND_WAITLIST_BRAND_SEGMENT_ID`, and `RESEND_WAITLIST_DEVELOPER_SEGMENT_ID`.
4. Create a Cloudflare Turnstile widget for the deployed domain. Set its public key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and secret as `TURNSTILE_SECRET_KEY`. Production signup requires server-side challenge validation. Add any preview hostname you intend to test to the widget.
5. Set `NEXT_PUBLIC_APP_URL=https://proveearly.xyz` and `ALLOWED_APP_ORIGINS=https://proveearly.xyz`. If using www, add that exact origin to the comma-separated list too. Use the actual deployed hostname if different.
6. Redeploy after changing variables, especially the public site key, which is embedded at build time.
7. Submit one real signup from each interest and verify its contact and segment in Resend. Test a repeat signup and an unavailable-service error before sharing the teaser.

This integration saves contacts in Resend. It does not send an automatic confirmation email. Verify a sending domain in Resend before sending launch broadcasts. Use Resend Broadcasts with unsubscribe support. Existing global unsubscribe preferences are preserved; the endpoint never silently re-subscribes those contacts.

The success screen appears only after Resend confirms persistence. Missing configuration produces a retryable unavailable message, never a fake signup. No emails or credentials are logged. Origin checks, consent validation, a honeypot, and production Turnstile validation guard the public endpoint. Configure Vercel Firewall rate limits if signup traffic grows; Resend API rate limits surface as retryable failures. A high-volume queue/database design is a separate architecture task.

Sources: [Resend contact creation](https://resend.com/docs/api-reference/contacts/create-contact), [contact segments](https://resend.com/docs/api-reference/contacts/add-contact-to-segment), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Privy

The public pages no longer require sign-in to join the waitlist. Authentication readiness is now independent of wallet readiness. This removes an unnecessary dependency but does not prove the production configuration is correct.

In the Privy dashboard, allow `https://proveearly.xyz` as an origin, plus www if used. Confirm Vercel's Production `NEXT_PUBLIC_PRIVY_APP_ID` identifies that same Privy application, then redeploy. Keep server Privy secrets server-only. Check browser network and console errors if auth still does not initialize. Do not use an unconditional readiness override.

The production domain is `proveearly.xyz`. The earlier failed inspection used a misspelled domain and did not diagnose production authentication.

## Social artwork

- `public/social/early-x-banner.png`: emerald/coral 3:1 X banner.
- `public/social/early-launch-teaser.png`: landscape teaser post.
- `public/branding/early-icon.png`: existing 512px square profile logo.
- `public/branding/early-lockup.png`: existing transparent wordmark.

Generated with the built-in image generation tool. Nothing was posted to X. Use the teaser after the live waitlist has been configured and tested. No X URL was supplied yet, so the footer's X placeholder remains unchanged.
