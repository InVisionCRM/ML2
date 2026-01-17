const { ethers } = require('ethers');

async function main() {
  // Use a working RPC endpoint
  const RPC_URL = 'https://rpc-pulsechain.g4mm4.io'; // Alternative RPC
  const TX_HASH = '0xbd79fc0a6b65be805444008b3d3d715a3c33ccd15b147a2417428855559d73a3';

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log('🔍 Debugging Transaction:', TX_HASH);
  console.log('');

  try {
    // Get the transaction
    const tx = await provider.getTransaction(TX_HASH);
    console.log('Transaction details:');
    console.log('  From:', tx.from);
    console.log('  To:', tx.to);
    console.log('  Value:', ethers.formatEther(tx.value), 'PLS');
    console.log('  Data length:', tx.data.length, 'bytes');
    console.log('');

    // Get the receipt
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    console.log('Receipt details:');
    console.log('  Status:', receipt.status ? 'Success' : 'Failed');
    console.log('  Gas used:', receipt.gasUsed.toString());
    console.log('  Logs count:', receipt.logs.length);
    console.log('');

    // Define addresses
    const EXPECTED_PLINKO_ADDRESS = '0x328F7Afefb8F561B5A832954257c01B3723054Fb';
    const ALTERNATE_PLINKO_ADDRESS = '0x328F7Afefb8F561B5A832954257c01B3723054Fb';

    // Analyze logs
    console.log('Analyzing logs:');
    const BALL_DROPPED_TOPIC = '0x30783330098d3f5ba08918f162dd444f105033a06e699dfcfc7f8571286cda34';
    const BALLS_PURCHASED_TOPIC = '0x3c619d8af5a33bbad28303c6e22fc915d466606954c379c90c01110cc2aa842e';
    const UNKNOWN_TOPIC = '0xeccff17fc68ca8be6d541aa37921bf2fb436e033fb3b02e97a9f8588f9f99195';

    // Load Plinko ABI
    const plinkoABI = require('../abi/plinko.json');

    receipt.logs.forEach((log, index) => {
      console.log(`Log ${index + 1}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${log.topics.length}`);
      console.log(`  Topic[0]: ${log.topics[0]}`);

      let eventType = 'Unknown';
      if (log.topics[0] === BALL_DROPPED_TOPIC) eventType = 'BallDropped';
      else if (log.topics[0] === BALLS_PURCHASED_TOPIC) eventType = 'BallsPurchased';
      else if (log.topics[0] === UNKNOWN_TOPIC) eventType = 'Unknown Event';
      else if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') eventType = 'ERC20 Transfer';

      console.log(`  Event Type: ${eventType}`);
      console.log(`  Data length: ${log.data.length}`);

      // Try to decode if it's from Plinko contract
      if (log.address.toLowerCase() === EXPECTED_PLINKO_ADDRESS.toLowerCase()) {
        try {
          // Try to decode with ethers
          const iface = new ethers.Interface(plinkoABI);
          const decoded = iface.parseLog(log);
          console.log(`  Decoded event: ${decoded.name}`);
          console.log(`  Args:`, decoded.args);
        } catch (e) {
          console.log(`  Decode error: ${e.message}`);
          console.log(`  Raw data: ${log.data}`);
        }
      }

      console.log('');
    });

    // Check if the transaction went to the expected address
    console.log('Address comparison:');
    console.log(`  Transaction 'to': ${tx.to}`);
    console.log(`  Expected Plinko: ${EXPECTED_PLINKO_ADDRESS}`);
    console.log(`  Alternate Plinko: ${ALTERNATE_PLINKO_ADDRESS}`);
    console.log(`  Match expected: ${tx.to.toLowerCase() === EXPECTED_PLINKO_ADDRESS.toLowerCase()}`);
    console.log(`  Match alternate: ${tx.to.toLowerCase() === ALTERNATE_PLINKO_ADDRESS.toLowerCase()}`);

    console.log('Checking Plinko contracts:');
    for (const addr of [EXPECTED_PLINKO_ADDRESS, ALTERNATE_PLINKO_ADDRESS]) {
      try {
        const code = await provider.getCode(addr);
        console.log(`  ${addr}: ${code !== '0x' ? 'EXISTS' : 'DOES NOT EXIST'} (${code.length} bytes)`);
      } catch (error) {
        console.log(`  ${addr}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);