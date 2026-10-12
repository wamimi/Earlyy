import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderIndexerConfig } from '../scripts/monad-indexer-config.mjs';

const template = readFileSync(new URL('../indexer/monad/config.yaml', import.meta.url), 'utf8');
const address = '0x0000000000000000000000000000000000000003';

describe('Monad indexer configuration', () => {
  it('rejects missing or invalid deployment outputs', () => {
    for (const [contract, block] of [[undefined, 1], ['0x' + '0'.repeat(40), 1], [address, 0], [address, undefined], [address, Number.MAX_SAFE_INTEGER + 1]]) {
      expect(() => renderIndexerConfig(template, contract, block, false)).toThrow('Actual escrow');
    }
  });

  it('selects HyperSync with fallback or RPC sync without embedding credentials', () => {
    const rpc = renderIndexerConfig(template, address, '123', false);
    const hyperSync = renderIndexerConfig(template, address, '123', true);
    expect(rpc).toContain('for: sync');
    expect(rpc).not.toContain('hypersync_config');
    expect(hyperSync).toContain('url: https://10143.hypersync.xyz');
    expect(hyperSync).toContain('for: fallback');
    for (const config of [rpc, hyperSync]) {
      expect(config).toContain(`address: ["${address}"]`);
      expect(config).toContain('start_block: 123');
      expect(config).toContain('${ENVIO_MONAD_RPC_URL}');
      expect(config).not.toContain('Authorization');
    }
  });
});
