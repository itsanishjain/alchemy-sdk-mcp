import { Alchemy, Network, Utils } from "alchemy-sdk";

// Initialize Alchemy SDK with API key
const API_KEY = "KRdhdsBezoTMVajIknIxlXgBHc1Pprpw";

// Configure Alchemy SDK
const settings = {
  apiKey: API_KEY,
  network: Network.ETH_MAINNET,
};

// Create Alchemy instance
const alchemy = new Alchemy(settings);

// USDC contract address (a stable coin pegged to USD)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// WETH contract address (Wrapped ETH)
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function getEthPrice() {
  try {
    console.log("Fetching ETH price...");

    // Method 1: Using Alchemy's getTokenBalances to check WETH/USDC ratio
    // This is a simplified approach and not the most accurate for price data
    console.log("Method 1: Using token balances (simplified approach)");

    // Get latest block number for reference
    const blockNumber = await alchemy.core.getBlockNumber();
    console.log("Latest block number:", blockNumber);

    // Get gas price as a basic test of Alchemy connection
    const gasPrice = await alchemy.core.getGasPrice();
    console.log("Current gas price (wei):", gasPrice.toString());
    console.log(
      "Current gas price (gwei):",
      parseInt(gasPrice.toString()) / 1e9
    );

    // Note: For accurate ETH price, you would typically:
    // 1. Query a price oracle like Chainlink
    // 2. Check a DEX like Uniswap for the ETH/USDC pair
    // 3. Use a price API service

    console.log("\nFor accurate ETH price data, consider:");
    console.log("1. Adding a Chainlink price feed oracle integration");
    console.log("2. Querying Uniswap or another DEX for the ETH/USDC pair");
    console.log("3. Using a price API service like CoinGecko or CryptoCompare");

    // Example of what the implementation might look like:
    console.log("\nExample implementation (pseudocode):");
    console.log(`
    // Using Chainlink ETH/USD Price Feed
    const ETH_USD_PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    const aggregatorV3InterfaceABI = [...]; // ABI for price feed
    const priceFeedContract = new ethers.Contract(
      ETH_USD_PRICE_FEED,
      aggregatorV3InterfaceABI,
      provider
    );
    const roundData = await priceFeedContract.latestRoundData();
    const price = roundData.answer.toString() / 10**8; // Adjust for decimals
    console.log("ETH price (USD):", price);
    `);
  } catch (error) {
    console.error("Error fetching ETH price:", error);
  }
}

getEthPrice();
