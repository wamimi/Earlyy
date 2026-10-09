import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { verifyProof } from '@reclaimprotocol/js-sdk';

const [resultPath, recipePath, providerId, providerVersion] = process.argv.slice(2);
if (!resultPath || !recipePath) throw new Error('Usage: node scripts/verify-provider-lab.mjs result.json recipe.json [providerId version]');
const result = JSON.parse(await readFile(resultPath, 'utf8'));
const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
const { hashProviderParams } = await import(pathToFileURL(`${process.env.RECLAIM_AGENT_ROOT}/lib/provider/index.js`).href);
const { claim, attestorAddress, claimSignature } = result.attestorClaim;
const proof = { identifier: claim.identifier, claimData: claim, signatures: [claimSignature],
  witnesses: [{ id: attestorAddress, url: 'wss://attestor.reclaimprotocol.org:444/ws' }], extractedParameterValues: result.extractedParameters };
const config = providerId ? { providerId, providerVersion, allowedTags: [] } : { hashes: [hashProviderParams(recipe)] };
const valid = await verifyProof(proof, config);
const changed = structuredClone(proof);
const context = JSON.parse(changed.claimData.context);
if (typeof context.extractedParameters.saved_item === 'string') {
  const item = JSON.parse(context.extractedParameters.saved_item);
  item.addedAt.isoString = '2000-01-01T00:00:00Z';
  context.extractedParameters.saved_item = JSON.stringify(item);
} else {
  context.extractedParameters.activity_timestamp = '1000000000000000';
}
changed.claimData.context = JSON.stringify(context);
const tampered = await verifyProof(changed, config);
const summary = { verified: valid.isVerified, error: valid.isVerified ? undefined : valid.error,
  alteredDateRejected: !tampered.isVerified, providerId, providerVersion, identifier: claim.identifier };
await writeFile(resultPath.replace(/\.json$/, '-verification.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
console.log(JSON.stringify(summary));
process.exit(valid.isVerified && !tampered.isVerified ? 0 : 1);
