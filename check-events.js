import hre from "hardhat";

async function main() {
  const PLINKO_ADDRESS = "0x37B1db8F06870BFFeFed862C06535BEFc4383ff8";

  console.log("Checking Plinko contract events...");

  const Plinko = await hre.ethers.getContractAt("Plinko", PLINKO_ADDRESS);

  // Get the contract interface
  const iface = Plinko.interface;

  // Find BallDropped event
  const ballDroppedEvent = iface.getEvent("BallDropped");
  console.log("BallDropped event:", ballDroppedEvent);

  if (ballDroppedEvent) {
    // Calculate topic hash
    const signature = ballDroppedEvent.format();
    console.log("Event signature:", signature);

    const topicHash = hre.ethers.id(signature);
    console.log("Topic hash:", topicHash);

    // Also try with the interface
    try {
      const ifaceTopic = iface.getEventTopic("BallDropped");
      console.log("Interface topic hash:", ifaceTopic);
    } catch (e) {
      console.log("Interface method failed, using manual calculation");
    }
  }
}

main().catch(console.error);
