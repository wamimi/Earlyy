# Production browser security

`next.config.mjs` supplies an enforced Content-Security-Policy on all paths, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Referrer-Policy: strict-origin-when-cross-origin.

`frame-ancestors 'none'` and X-Frame-Options DENY prevent other sites from embedding Early. They do not prevent Early from loading Privy's iframe; the separate `frame-src` and `child-src` directives explicitly allow Privy, WalletConnect verification, and Cloudflare Turnstile.

## CSP exceptions and limits

This is Next.js's non-nonce CSP configuration, not a fully strict script CSP. `script-src 'unsafe-inline'` is required for the current statically rendered Next.js hydration scripts. `style-src 'unsafe-inline'` supports inline animation styles and Privy's styled components. Production never allows unsafe-eval. Development allows it for Next debugging, plus localhost websocket origins for hot reload. Blob workers support browser SDK workers.

The policy restricts scripts, frames, browser connections, fonts, images, and media to the listed sources. It blocks plugin objects and foreign form actions. It does not make arbitrary injected inline JavaScript safe. A stronger nonce-based policy would require dynamic rendering and nonce support throughout third-party script loading. Do that as a distinct security/architecture change before opening sensitive wallet or proof operations, rather than making an untested global rendering change to the teaser website.

WalletConnect verification and relay hosts, Privy's iframe/API/RPC hosts, and Cloudflare challenge resources follow Privy's published guidance. Server-side Resend and Reclaim requests are not browser CSP connections. Future direct browser RPC endpoints or a Privy custom base domain must be reviewed and explicitly added before enabling those features. Legacy prototype transaction flows are not covered by the public teaser verification.

## Dashboard and deployment

- Privy allowed origins: `https://proveearly.xyz`, plus `https://www.proveearly.xyz` only if actually served. Use a separate development app for localhost; remove development origins from the production app.
- Vercel Production: `NEXT_PUBLIC_APP_URL=https://proveearly.xyz`, `ALLOWED_APP_ORIGINS=https://proveearly.xyz` (add www if used), and the correct production `NEXT_PUBLIC_PRIVY_APP_ID`.
- Turnstile widget: allow `proveearly.xyz`, plus any actual preview hosts.
- Redeploy, then inspect the response headers and run a real Privy sign-in and waitlist signup. Do not mark production security checks complete solely from the source config.

Verification command after deployment:

```bash
curl -I https://proveearly.xyz
```

X-Frame-Options primarily addresses clickjacking. CSP mitigates resource injection and exfiltration risks; the inline-script exception limits its XSS protection.

Sources: [Privy CSP](https://docs.privy.io/security/implementation-guide/content-security-policy), [Privy production checklist](https://docs.privy.io/security/implementation-guide/security-checklist), [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy).
