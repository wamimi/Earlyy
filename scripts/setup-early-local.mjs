import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Wallet, getAddress } from 'ethers';

for (const file of ['.env.local', '.env.setup.local']) execFileSync('git', ['check-ignore', '-q', file]);
const path = '.env.local';
let text = readFileSync(path, 'utf8');
const current = parseEnv(text);
const worksheet = existsSync('.env.setup.local') ? parseEnv(readFileSync('.env.setup.local', 'utf8')) : {};
const changed = [];
function fill(name, value) {
  if (current[name] || !value) return;
  const line = `${name}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  current[name] = value; changed.push(name);
}
for (const [name,value] of Object.entries(worksheet)) fill(name,value);
fill('EARLY_SOURCE_NULLIFIER_SECRET', randomBytes(32).toString('base64'));
fill('EARLY_SOURCE_NULLIFIER_KEY_VERSION','1');
fill('EARLY_ELIGIBILITY_PRIVATE_KEY', Wallet.createRandom().privateKey);
fill('EARLY_ELIGIBILITY_SIGNER_MODE','local-testnet');
try { fill('EARLY_ELIGIBILITY_SIGNER_ADDRESS',new Wallet(current.EARLY_ELIGIBILITY_PRIVATE_KEY).address); }
catch { throw new Error('Existing eligibility key is invalid; no key values were printed or replaced.'); }
const adminIndex=process.argv.indexOf('--admin');
if(adminIndex>=0) {
  let admin;
  try { admin=getAddress(process.argv[adminIndex+1]); } catch { throw new Error('Invalid public admin address.'); }
  fill('MONAD_ESCROW_ADMIN',admin);
}
writeFileSync(path,text,{mode:0o600});chmodSync(path,0o600);
console.log(JSON.stringify({updatedNames:changed, secretsPrinted:false}));
