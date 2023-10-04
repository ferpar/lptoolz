import { ethers } from "ethers";
import axios from "axios";
import Big from "big.js";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.WebSocketProvider(
  `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);

// pool for uscd/eth at 0.05% fee tier
const UniV3PoolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const uniswapV3PoolAbi = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

// non fungible position manager
const nonFungiblePositionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
const nonFungiblePositionManagerAbi = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json");

const uniswapV3PoolContract = new ethers.Contract(
  UniV3PoolAddress,
  uniswapV3PoolAbi.abi,
  provider
);

const nonFungiblePositionManagerContract = new ethers.Contract(
  nonFungiblePositionManagerAddress,
  nonFungiblePositionManagerAbi.abi,
  provider
);

const getPoolPrice = async (): Promise<number> => {
  const slot0 = await uniswapV3PoolContract.slot0();
  const sqrtRatioX96 = slot0.sqrtPriceX96.toString();
  const price = sqrtRatioX96 ** 2 / 2 ** 192;
  return price;
};

const getDecimals = async (): Promise<number[]> => {
  const token0address = await uniswapV3PoolContract.token0();
  const token1address = await uniswapV3PoolContract.token1();

  const token0Contract = new ethers.Contract(
    token0address,
    uniswapV3PoolAbi.abi,
    provider
  );

  const token1Contract = new ethers.Contract(
    token1address,
    uniswapV3PoolAbi.abi,
    provider
  );

  const token0Decimals = await token0Contract.decimals();
  const token1Decimals = await token1Contract.decimals();

  return [ token0Decimals, token1Decimals ]
}

const getInvertedPrice = async (price:number): Promise<number> => {
  // consider the decimals of each token
  const [ token0Decimals, token1Decimals ] = await getDecimals();
  const decimalsDifference = token0Decimals - token1Decimals;
  const invertedPrice = price ** decimalsDifference;
  return invertedPrice;
}

const getPriceInUSD = (priceIn18Decimals: number): Big => {
  // const price10 = priceIn18Decimals / 10 ** 18 in Big
  const price10 = new Big(priceIn18Decimals).div(Big(10).pow(18));
  const price01 = price10.pow(-1).mul(Big(10).pow(-6));
  return price01;
};

const getEthPrice = async (): Promise<number> => {
  const ethPriceResponse = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const ethPriceData = ethPriceResponse.data as {
    ethereum: { usd: number };
  };
  return ethPriceData.ethereum.usd;
};

const getPositionTicks = async () => {
  const position = await nonFungiblePositionManagerContract.positions(1);
  const tickLower = position.tickLower.toString();
  const tickUpper = position.tickUpper.toString();
  return { tickLower, tickUpper };
}

const tickToPrice = (tick: string) => {
  const price = Math.pow(1.0001, parseInt(tick));
  return price;
}

const init = async () => {
  // trigger getPoolPrice on swap event
  uniswapV3PoolContract.on("Swap", async (sender, amount0, amount1, data) => {
    const poolPrice = await getPoolPrice();
    const invertedPoolPrice = await getInvertedPrice(poolPrice);
    const price = await getEthPrice();
    console.log(`Pool price: ${poolPrice}`);
    console.log(`inverted Pool price ${invertedPoolPrice}`);
    console.log(`ETH price: ${price}`);
  });
};

const main = async (): Promise<void> => {
  console.log("Starting...");
  await init();
  const poolPrice = await getPoolPrice();
    const invertedPoolPrice = await getInvertedPrice(poolPrice);
  const price = await getEthPrice();
  console.log(`Pool price: ${poolPrice}`);
    console.log(`inverted Pool price ${invertedPoolPrice}`);
  console.log(`ETH price: ${price}`);
  console.log("initialized successfully");
  // do not close the process
  process.stdin.resume();

  // handle exit signals
  const exitHandler = async (signal:any): Promise<void> => {
    if (signal) {
      console.log(`Received ${signal}.`);
    }
    console.log("Exiting...");
    process.exit(0);
  };

  // handle ctrl+c event
  process.on("SIGINT", exitHandler);

  // handle kill
  process.on("SIGTERM", exitHandler);

};

(async () => {
  await main();
})()
