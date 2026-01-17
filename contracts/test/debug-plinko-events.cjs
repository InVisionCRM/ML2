const { ethers } = require('ethers');

async function main() {
  const RPC_URL = 'https://rpc.pulsechain.com';
  const PLINKO_ADDRESS = '0x328F7Afefb8F561B5A832954257c01B3723054Fb'; // Current address from lib/contracts.ts
  const BALL_DROPPED_TOPIC = '0x30783330098d3f5ba08918f162dd444f105033a06e699dfcfc7f8571286cda34';

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log('🔍 Debugging Plinko BallDropped Events\n');

  // Get recent blocks
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = latestBlock - 100; // Last 100 blocks

  console.log(`Checking blocks ${fromBlock} to ${latestBlock}`);
  console.log(`PLINKO_ADDRESS: ${PLINKO_ADDRESS}`);
  console.log(`BALL_DROPPED_TOPIC: ${BALL_DROPPED_TOPIC}\n`);

  // Query for BallDropped events
  const filter = {
    address: PLINKO_ADDRESS,
    topics: [BALL_DROPPED_TOPIC],
    fromBlock: fromBlock,
    toBlock: latestBlock
  };

  try {
    const logs = await provider.getLogs(filter);
    console.log(`Found ${logs.length} BallDropped events\n`);

    if (logs.length > 0) {
      // Decode the first few events
      for (let i = 0; i < Math.min(logs.length, 3); i++) {
        const log = logs[i];
        console.log(`Event ${i + 1}:`);
        console.log(`  Transaction: ${log.transactionHash}`);
        console.log(`  Block: ${log.blockNumber}`);
        console.log(`  Topics: ${log.topics.length}`);
        console.log(`  Data length: ${log.data.length} bytes`);
        console.log(`  Raw data: ${log.data}`);

        // Try to decode manually
        try {
          // Parse the data according to the event signature
          // BallDropped(address indexed player, uint256 seed, uint8 bucket, uint256 multiplier, uint256 payout, uint8 riskLevel)
          const data = log.data.slice(2); // Remove 0x prefix
          const seed = '0x' + data.slice(0, 64);
          const bucket = '0x' + data.slice(64, 128);
          const multiplier = '0x' + data.slice(128, 192);
          const payout = '0x' + data.slice(192, 256);
          const riskLevel = '0x' + data.slice(256, 320);

          console.log(`  Decoded:`);
          console.log(`    Player: ${log.topics[1]}`);
          console.log(`    Seed: ${BigInt(seed).toString()}`);
          console.log(`    Bucket: ${BigInt(bucket).toString()}`);
          console.log(`    Multiplier: ${BigInt(multiplier).toString()} (${Number(BigInt(multiplier)) / 100}x)`);
          console.log(`    Payout: ${ethers.formatEther(payout)} MORBIUS`);
          console.log(`    Risk Level: ${BigInt(riskLevel).toString()}`);
        } catch (decodeError) {
          console.log(`  Decode error: ${decodeError.message}`);
        }
        console.log('');
      }
    } else {
      console.log('No BallDropped events found in recent blocks.');
      console.log('Checking if contract exists...');

      try {
        const code = await provider.getCode(PLINKO_ADDRESS);
        if (code === '0x') {
          console.log('❌ Contract does not exist at this address!');
        } else {
          console.log('✅ Contract exists at this address');
          console.log(`Code length: ${code.length} bytes`);
        }
      } catch (error) {
        console.log('Error checking contract:', error.message);
      }
    }
  } catch (error) {
    console.log('Error querying logs:', error.message);
  }
}

main().catch(console.error);