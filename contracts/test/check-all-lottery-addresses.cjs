const { ethers } = require('hardhat');

async function main() {
  const addresses = [
    { name: 'User requested "original"', addr: '0xD66b4489fbfF99A8d62f969203899840F2ec69c5' },
    { name: 'Recent (from .env before change)', addr: '0x81F73Ab20890eB5b0226e03b6b73bf37F4Cf660A' },
    { name: 'Deployment 1 (Dec 16 earlier)', addr: '0x25056D6159F6C7a7812d1B65aca2Ca14E3E0F4c3' },
    { name: 'Deployment 2 (Dec 16 later)', addr: '0xBF48D5376Cb30ff760aFe3728AFf3A308B019C5E' }
  ];

  const lotteryJSON = require('./abi/lottery6of55-v2.json');
  const lotteryABI = lotteryJSON.abi || lotteryJSON;

  for (const {name, addr} of addresses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${name}`);
    console.log(`Address: ${addr}`);
    console.log('='.repeat(60));

    const code = await ethers.provider.getCode(addr);
    const hasCode = code !== '0x';
    console.log(`Contract deployed: ${hasCode ? 'YES ✅' : 'NO ❌'}`);

    if (hasCode) {
      try {
        const lottery = await ethers.getContractAt(lotteryABI, addr);
        const roundInfo = await lottery.getCurrentRoundInfo();
        console.log(`getCurrentRoundInfo: WORKS ✅`);
        console.log(`  Current Round: ${roundInfo[0].toString()}`);
        console.log(`  State: ${roundInfo[7] === 0n ? 'OPEN' : 'FINALIZED'}`);
        console.log(`  Total Tickets: ${roundInfo[4].toString()}`);
      } catch (e) {
        console.log(`getCurrentRoundInfo: FAILED ❌`);
        console.log(`  Error: ${e.message.substring(0, 100)}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
