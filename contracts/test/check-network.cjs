const { ethers } = require('hardhat');

async function main() {
  console.log('\n🔍 Checking Network Connection...\n');

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  console.log(`Network Name: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Current Block: ${blockNumber}`);

  // Test with MORBIUS token (we know this exists)
  const MORBIUS_TOKEN = '0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1';
  const morbiusCode = await provider.getCode(MORBIUS_TOKEN);
  console.log(`\nMORBIUS Token (${MORBIUS_TOKEN}):`);
  console.log(`Has code: ${morbiusCode !== '0x' ? 'YES ✅' : 'NO ❌'}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
