const { ethers } = require('hardhat');

async function main() {
  const addresses = [
    { name: 'Original', addr: '0xD66b4489fbfF99A8d62f969203899840F2ec69c5' },
    { name: 'Recent', addr: '0x81F73Ab20890eB5b0226e03b6b73bf37F4Cf660A' }
  ];

  for (const {name, addr} of addresses) {
    console.log(`\n${name} Contract: ${addr}`);
    const code = await ethers.provider.getCode(addr);
    console.log(`Code exists: ${code !== '0x' ? 'YES' : 'NO'}`);
    console.log(`Code length: ${code.length} bytes`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
