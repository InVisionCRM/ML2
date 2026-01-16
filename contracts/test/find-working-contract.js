import { ethers } from 'ethers';
import fs from 'fs';

const RPC_URL = 'https://rpc.pulsechain.com';

const addresses = [
  { name: 'User requested', addr: '0xD66b4489fbfF99A8d62f969203899840F2ec69c5' },
  { name: 'Recent (.env old)', addr: '0x81F73Ab20890eB5b0226e03b6b73bf37F4Cf660A' },
  { name: 'Deployment 1', addr: '0x25056D6159F6C7a7812d1B65aca2Ca14E3E0F4c3' },
  { name: 'Deployment 2', addr: '0xBF48D5376Cb30ff760aFe3728AFf3A308B019C5E' }
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abiPath = './abi/lottery6of55-v2.json';
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const ABI = Array.isArray(artifact) ? artifact : artifact.abi;

  for (const {name, addr} of addresses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${name}: ${addr}`);
    console.log('='.repeat(60));

    const lottery = new ethers.Contract(addr, ABI, provider);

    try {
      const price = await lottery.ticketPriceMORBIUS();
      console.log(`✅ ticketPriceMORBIUS: ${ethers.formatUnits(price, 18)} MORBIUS`);
    } catch (err) {
      console.log(`❌ ticketPriceMORBIUS: FAILED`);
    }

    try {
      const info = await lottery.getCurrentRoundInfo();
      console.log(`✅ getCurrentRoundInfo: Round ${info[0]}, Tickets ${info[4]}`);
    } catch (err) {
      console.log(`❌ getCurrentRoundInfo: FAILED`);
    }

    try {
      const roundDuration = await lottery.roundDuration();
      console.log(`✅ roundDuration: ${roundDuration} seconds`);
    } catch (err) {
      console.log(`❌ roundDuration: FAILED`);
    }
  }
}

main().catch(console.error);
