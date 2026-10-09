export function renderIndexerConfig(template, address, block, useHyperSync) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? '') || /^0x0{40}$/.test(address) || !/^\d+$/.test(String(block ?? '')) || Number(block) < 1 || !Number.isSafeInteger(Number(block))) {
    throw new Error('Actual escrow address and deployment block are required before indexing.');
  }
  let config = template
    .replace('address: []', `address: ["${address}"]`)
    .replace('start_block: 0', `start_block: ${block}`)
    .replace('https://testnet-rpc.monad.xyz', '${ENVIO_MONAD_RPC_URL}');
  if (useHyperSync) config = config
    .replace('    rpc:', '    hypersync_config:\n      url: https://10143.hypersync.xyz\n    rpc:')
    .replace('for: sync', 'for: fallback');
  return config;
}
