import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { Wallet, getAddress } from 'ethers';
const env=parseEnv(readFileSync('.env.local','utf8'));
if(env.NEXT_PUBLIC_MONAD_CHAIN_ID!=='10143' || env.EARLY_ELIGIBILITY_SIGNER_MODE!=='local-testnet') throw new Error('Monad testnet settings required.');
let admin, signer;
try {admin=getAddress(env.MONAD_ESCROW_ADMIN);signer=new Wallet(env.EARLY_ELIGIBILITY_PRIVATE_KEY).address;} catch {throw new Error('Valid public admin and eligibility signer configuration required.');}
// Simulation never loads the deployment keystore and never passes --broadcast.
const result=spawnSync('forge',['script','script/Deploy.s.sol:Deploy','--sender',admin,'--rpc-url','monad'],{
  cwd:'contracts/monad',stdio:'inherit',env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,
    MONAD_RPC_URL:env.MONAD_RPC_URL,MONAD_ESCROW_ADMIN:admin,EARLY_ELIGIBILITY_SIGNER_ADDRESS:signer},
});
process.exit(result.status??1);
