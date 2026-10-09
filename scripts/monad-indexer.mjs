import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { renderIndexerConfig } from './monad-indexer-config.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const env = parseEnv(readFileSync(resolve(root,'.env.local'),'utf8'));
const address = env.NEXT_PUBLIC_MONAD_ESCROW_ADDRESS;
const block = env.MONAD_ESCROW_DEPLOYMENT_BLOCK;
if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? '') || /^0x0{40}$/.test(address) || !/^\d+$/.test(block ?? '') || Number(block)<1 || !Number.isSafeInteger(Number(block))) throw new Error('Actual escrow address and deployment block are required before indexing.');
const rpc = new URL(env.MONAD_RPC_URL);
if (rpc.protocol !== 'https:' && !(rpc.protocol === 'http:' && ['localhost','127.0.0.1'].includes(rpc.hostname))) throw new Error('Invalid Monad RPC URL');
const dir = resolve(root,'indexer/monad');
let useHyperSync = false;
if (env.ENVIO_API_TOKEN) {
  try {
    const response = await fetch('https://10143.hypersync.xyz/height', {
      headers: { Authorization: `Bearer ${env.ENVIO_API_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    useHyperSync = response.ok;
    await response.body?.cancel();
  } catch { /* RPC sync remains available when HyperSync cannot be reached. */ }
}
const config = renderIndexerConfig(readFileSync(resolve(dir,'config.yaml'),'utf8'), address, block, useHyperSync);
console.log(useHyperSync ? 'Indexer source: Monad HyperSync with RPC fallback.' : 'Indexer source: Monad RPC sync.');
writeFileSync(resolve(dir,'config.local.yaml'),config,{mode:0o600});
// Child inherits only the indexer's required application configuration.
const childEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
  ENVIO_MONAD_RPC_URL: env.MONAD_RPC_URL, ...(env.ENVIO_API_TOKEN ? {ENVIO_API_TOKEN:env.ENVIO_API_TOKEN}: {}) };
const result = spawnSync('pnpm',['exec','envio','--config','config.local.yaml',process.argv[2] ?? 'dev'],{cwd:dir,env:childEnv,stdio:'inherit'});
process.exit(result.status ?? 1);
