// Creates an actual Verifier-app request and validates the returned proof with
// the published version. No portal fallback, public callback or app secret in UI.
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { ReclaimProofRequest, verifyProof } from '@reclaimprotocol/js-sdk';

process.loadEnvFile('.env.local');
const [providerId, providerVersion, channelId] = process.argv.slice(2);
if (!providerId || !providerVersion) throw new Error('Provide provider ID and exact version.');
const dir = `/private/tmp/early-provider-lab/verifier-${randomUUID()}`;
await mkdir(dir, { recursive: true, mode: 0o700 });
const request = await ReclaimProofRequest.init(process.env.RECLAIM_APP_ID, process.env.RECLAIM_APP_SECRET,
  providerId, { providerVersion, acceptTeeAttestation: false });
if (request.getProviderVersion().providerVersion !== providerVersion) throw new Error('Unexpected provider version.');
const nonce = randomUUID();
const contextMessage = JSON.stringify({ product: 'Early provider acceptance test', nonce, providerId, providerVersion });
request.setContext('early-provider-test', contextMessage);
if (channelId) request.setParams({ channel_id: channelId });
const requestUrl = await request.getRequestUrl({ verificationMode: 'app', canUseDeferredDeepLinksFlow: true });
const metadata = { providerId, providerVersion, sessionId: request.getSessionId(), requestUrl, statusUrl: request.getStatusUrl(), dir };
await writeFile(`${dir}/session.json`, JSON.stringify(metadata, null, 2), { mode: 0o600 });
await writeFile(`${dir}/qr.svg`, renderToStaticMarkup(createElement(QRCodeSVG, { value: requestUrl, size: 320, marginSize: 4 })), { mode: 0o600 });
console.log(JSON.stringify(metadata));
await request.startSession({ verificationConfig: { providerId, providerVersion, allowedTags: [] },
  onSuccess: async proofs => {
    const verification = await verifyProof(proofs, { providerId, providerVersion, allowedTags: [] });
    const contextBound = proofs.length > 0 && proofs.every(proof => {
      const c = JSON.parse(proof.claimData.context);
      return c.contextMessage === contextMessage && c.reclaimSessionId === request.getSessionId();
    });
    const report = { sessionId: request.getSessionId(), providerId, providerVersion,
      verified: verification.isVerified, contextBound, completedAt: new Date().toISOString() };
    await writeFile(`${dir}/proofs.json`, JSON.stringify(proofs, null, 2), { mode: 0o600 });
    await writeFile(`${dir}/result.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(report));
    process.exit(verification.isVerified && contextBound ? 0 : 1);
  },
  onError: async error => {
    const report = { sessionId: request.getSessionId(), verified: false, error: String(error).slice(0, 500) };
    await writeFile(`${dir}/result.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(report));
    process.exit(1);
  },
});
