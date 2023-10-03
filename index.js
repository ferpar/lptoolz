const ethers = require("ethers");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const Big = require("big.js");
require("dotenv").config();

const provider = new ethers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);

// pool for uscd/eth at 0.05% fee tier
const UniV3PoolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const uniswapV3PoolAbi = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

const uniswapV3PoolContract = new ethers.Contract(
  UniV3PoolAddress,
  uniswapV3PoolAbi.abi,
  provider
);

const getPoolPrice = async () => {
  const slot0 = await uniswapV3PoolContract.slot0();
  const sqrtRatioX96 = slot0.sqrtPriceX96.toString();
  const price = sqrtRatioX96 ** 2 / 2 ** 192;
  return price;
};

const getPriceInUSD = (priceIn18Decimals) => {
  // const price10 = priceIn18Decimals / 10 ** 18 in Big
  const price10 = new Big(priceIn18Decimals).div(Big(10).pow(18));
  const price01 = price10.pow(-1).mul(Big(10).pow(-6));
  return price01;
};

const getEthPrice = async () => {
  const ethPrice = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  )
    .then((res) => res.json())
    .then((json) => json.ethereum.usd);
  return ethPrice;
};

const init = async () => {
  // trigger getPoolPrice on swap event
  uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
    const poolPrice = await getPoolPrice();
    const price = await getEthPrice();
    const price2 = getPriceInUSD(poolPrice);
    console.log(`ETH price: ${price}`);
    console.log(`Pool price: ${poolPrice}`);
    console.log(`Pool price local: ${price2}`);
  });
};

const main = async () => {
  console.log("Starting...");
  await init();
  const poolPrice = await getPoolPrice();
  const price = await getEthPrice();
  const price2 = getPriceInUSD(poolPrice);
  console.log(`Pool price: ${poolPrice}`);
  console.log(`ETH price: ${price}`);
  console.log(`Pool price local: ${price2}`);
  console.log("initialized successfully");
  // do not close the process
  process.stdin.resume();

  // handle exit signals
  const exitHandler = async (signal) => {
    if (signal) {
      console.log(`Received ${signal}.`);
    }
    console.log("Exiting...");
    process.exit(0);
  };
  process.abort = exitHandler;
};

main();
