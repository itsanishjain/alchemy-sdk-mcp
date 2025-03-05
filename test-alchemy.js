import { Alchemy, Network } from "alchemy-sdk";

// Initialize Alchemy SDK with API key
const API_KEY = "KRdhdsBezoTMVajIknIxlXgBHc1Pprpw";

// Configure Alchemy SDK
const settings = {
  apiKey: API_KEY,
  network: Network.ETH_MAINNET,
};

// Create Alchemy instance
const alchemy = new Alchemy(settings);

async function testAlchemy() {
  try {
    console.log("Testing Alchemy API connection...");

    // Get current gas price
    const gasPrice = await alchemy.core.getGasPrice();
    console.log("Current gas price (wei):", gasPrice.toString());
    console.log(
      "Current gas price (gwei):",
      parseInt(gasPrice.toString()) / 1e9
    );

    // Get latest block number
    const blockNumber = await alchemy.core.getBlockNumber();
    console.log("Latest block number:", blockNumber);

    console.log("Alchemy API connection test successful!");
  } catch (error) {
    console.error("Error testing Alchemy API:", error);
  }
}

testAlchemy();
