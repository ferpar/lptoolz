import { ethers } from "ethers";
import axios from "axios";
import Big from "big.js";
import dotenv from "dotenv";
dotenv.config();

import {
  uniswapV3PoolContract,
  nonFungiblePositionManagerContract,
  getTokenContracts,
} from "./contracts";

// pool contract
// TODO: account for decimals difference between token0 and token1
export const getPoolPrice = async (_sqrtRatioX96?: string, decimals? : number[]): Promise<Big> => {

  const [token0Decimals, token1Decimals] = !decimals?.length
    ? await getDecimals()
    : decimals;
  const decimalsDifference = Number(token0Decimals - token1Decimals);

  const slot0 = await uniswapV3PoolContract.slot0();
  const sqrtRatioX96 = _sqrtRatioX96 ? _sqrtRatioX96 : slot0.sqrtPriceX96.toString();
  const sharePrice = new Big(sqrtRatioX96).pow(2).div(2 ** 192);

  const price = sharePrice.mul(Big(10).pow(decimalsDifference));
  return price;
};

// pool and token contracts
export const getDecimals = async (): Promise<number[]> => {
  const [token0Contract, token1Contract] = await getTokenContracts();

  const token0Decimals = await token0Contract.decimals();
  const token1Decimals = await token1Contract.decimals();

  return [token0Decimals, token1Decimals];
};

// pool, and token contracts
// TODO: simplify once getPoolPrice accounts for decimals
export const getInvertedPrice = async (
  price: Big
): Promise<Big> => {
  // consider the decimals of each token, dont call api if decimals are provided
  const invertedPrice = price.pow(-1);
  return invertedPrice;
};

// third-party api
export const getEthPrice = async (): Promise<number> => {
  const ethPriceResponse = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const ethPriceData = ethPriceResponse.data as {
    ethereum: { usd: number };
  };
  return ethPriceData.ethereum.usd;
};

// position manager contract
export const getPositionTicks = async (positionId: number) => {
  const position = await nonFungiblePositionManagerContract.positions(
    positionId
  );
  const tickLower = position.tickLower.toString();
  const tickUpper = position.tickUpper.toString();
  return { tickLower, tickUpper };
};

// TODO: account for decimals difference between token0 and token1
export const tickToPrice = async (tick: string, decimals?: number[]): Promise<Big> => {
  const [token0Decimals, token1Decimals] = !decimals?.length
    ? await getDecimals()
    : decimals;
  const decimalsDifference = Number(token0Decimals - token1Decimals);
  const price = Big(Math.pow(1.0001, parseInt(tick))).mul(Big(10).pow(decimalsDifference));
  return price;
};

export const printData = async () => {
  const poolPrice = await getPoolPrice();
  const invertedPoolPrice = await getInvertedPrice(poolPrice);
  const price = await getEthPrice();
  console.log(`Pool price: ${Number(poolPrice)}`);
  console.log(`inverted Pool price ${Number(invertedPoolPrice)}`);
  console.log(`ETH price: ${price}`);
  const { tickLower, tickUpper } = await getPositionTicks(574861);
  const lowerPrice = await tickToPrice(tickLower);
  const upperPrice = await tickToPrice(tickUpper);
  console.log(`lower price: ${lowerPrice}`);
  console.log(`upper price: ${upperPrice}`);
  const token1PriceLower = await getInvertedPrice(lowerPrice);
  const token1PriceUpper = await getInvertedPrice(upperPrice);
  console.log(`token1 price lower: ${token1PriceLower}`);
  console.log(`token1 price upper: ${token1PriceUpper}`);
  return "done";
};

