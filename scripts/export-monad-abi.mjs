import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const artifact = JSON.parse(readFileSync('contracts/monad/out/EarlyBenefitEscrow.sol/EarlyBenefitEscrow.json','utf8'));
mkdirSync('indexer/monad/abis',{recursive:true});
writeFileSync('indexer/monad/abis/EarlyBenefitEscrow.json',JSON.stringify(artifact.abi,null,2)+'\n');
console.log('Exported compiled escrow ABI; no deployment manifest created.');
