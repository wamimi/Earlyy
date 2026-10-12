import { Wallet, JsonRpcProvider, formatEther } from 'ethers';
process.loadEnvFile('.env.local');
const required=['RECLAIM_APP_ID','RECLAIM_APP_SECRET','PRIVY_APP_ID','PRIVY_APP_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RAW_PROOF_ENCRYPTION_KEY','RETENTION_CRON_SECRET','EARLY_ELIGIBILITY_PRIVATE_KEY','EARLY_SOURCE_NULLIFIER_SECRET','EARLY_SOURCE_NULLIFIER_KEY_VERSION','MONAD_RPC_URL'];
const report={presence:Object.fromEntries(required.map(name=>[name,Boolean(process.env[name])])),signerValid:false,nullifierValid:false,network:'not_checked',deployerFunded:false,database:'not_checked',partnerAccess:'not_checked',escrowConfigured:Boolean(process.env.NEXT_PUBLIC_MONAD_ESCROW_ADDRESS),indexerConfigured:Boolean(process.env.ENVIO_GRAPHQL_URL)};
try { const wallet=new Wallet(process.env.EARLY_ELIGIBILITY_PRIVATE_KEY); report.signerValid=process.env.EARLY_ELIGIBILITY_SIGNER_MODE==='local-testnet' && wallet.address.toLowerCase()===(process.env.EARLY_ELIGIBILITY_SIGNER_ADDRESS??'').toLowerCase(); } catch {}
report.nullifierValid=Buffer.from(process.env.EARLY_SOURCE_NULLIFIER_SECRET??'','base64').length===32 && process.env.EARLY_SOURCE_NULLIFIER_KEY_VERSION==='1';
try {
  const rpc=new JsonRpcProvider(process.env.MONAD_RPC_URL);
  const network=await rpc.getNetwork();report.network=network.chainId===10143n?'monad_testnet':'wrong_chain';
  const balance=await rpc.getBalance('0x72abEE09224073495EFDbB4e65c75b13f672587E');report.deployerFunded=balance>0n;report.deployerTestMON=formatEther(balance);
  rpc.destroy();
} catch {report.network='unavailable';}
try {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result=await fetch(`${process.env.SUPABASE_URL}/rest/v1/early_rules?select=id&limit=0`,{headers:{apikey:key,...(key?.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})},signal:AbortSignal.timeout(10000)});
  report.database=result.ok?'migration_present':result.status===404?'migration_pending':`http_${result.status}`;
  const access=await fetch(`${process.env.SUPABASE_URL}/rest/v1/early_team_members?select=user_id&limit=0`,{headers:{apikey:key,...(key?.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})},signal:AbortSignal.timeout(10000)});
  report.partnerAccess=access.ok?'migration_present':access.status===404?'migration_pending':`http_${access.status}`;
} catch {report.database='unavailable';}
console.log(JSON.stringify(report,null,2));
if(process.env.ENVIO_API_TOKEN) {
  try {
    const result=await fetch('https://10143.hypersync.xyz/height',{headers:{Authorization:`Bearer ${process.env.ENVIO_API_TOKEN}`},signal:AbortSignal.timeout(10000)});
    console.log(JSON.stringify({hypersyncEndpointStatus:result.status,tokenAccepted:result.ok}));
  } catch {console.log(JSON.stringify({hypersyncEndpointStatus:'unavailable',tokenAccepted:false}));}
}
