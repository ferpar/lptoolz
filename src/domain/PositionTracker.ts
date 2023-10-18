import Big from "big.js";
import {
  uniswapV3PoolContract,
  nonFungiblePositionManagerContract,
  getTokenContracts,
} from "./contracts";

import { getPoolPrice, getInvertedPrice, tickToPrice } from "./PriceOracle";
import { get } from "http";

// the PositionTracker class is a singleton
// it serves as the go-to source of truth for the current position
// it is initialized on startup and updated on every swap event
interface IPositionTracker {
  poolContract: typeof uniswapV3PoolContract;
  positionManager: typeof nonFungiblePositionManagerContract;
  initialized: boolean;
  pool: {
    sqrtRatioX96: string;
    price: Big | null;
    invertedPrice: Big | null;
    tick: string;
  };
  position: {
    tickLower: string;
    tickUpper: string;
    fee: string;
    liquidity: Big;
    priceLowerBound: Big;
    priceUpperBound: Big;
  };
  token0: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
  token1: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
}

export default class PositionTracker implements IPositionTracker {
  poolContract: typeof uniswapV3PoolContract = uniswapV3PoolContract;
  positionManager: typeof nonFungiblePositionManagerContract =
    nonFungiblePositionManagerContract;
  initialized: boolean;
  pool: {
    sqrtRatioX96: string;
    price: Big; // price in terms of token1 per token0
    invertedPrice: Big; // price in terms of token0 per token1
    tick: string;
  } = {
    sqrtRatioX96: "",
    price: Big(0),
    invertedPrice: Big(0),
    tick: "",
  };
  position: {
    tickLower: string;
    tickUpper: string;
    fee: string;
    liquidity: Big;
    priceLowerBound: Big;
    priceUpperBound: Big;
  } = {
    tickLower: "",
    tickUpper: "",
    fee: "",
    liquidity: Big(0),
    priceLowerBound: Big(0),
    priceUpperBound: Big(0),
  };
  token0: { address: string; decimals: number; symbol: string; name: string } =
    {
      address: "",
      decimals: 0,
      symbol: "",
      name: "",
    };
  token1: { address: string; decimals: number; symbol: string; name: string } =
    {
      address: "",
      decimals: 0,
      symbol: "",
      name: "",
    };
  private static instance: PositionTracker | null = null;

  private constructor() {
    this.initialized = false;
  }

  async initialize(positionId: number) {
    console.log("initializing PositionTracker");
    await this.loadPoolData();
    await this.loadPositionData(positionId);
    await this.loadTokenData();
    console.log("finished loading position tracker data");
    console.log("deriving pool prices");
    await this.derivePoolPrice();
    console.log("deriving token reserves");
    this.deriveTokenBalances();
    console.log("finished deriving token reserves");
    this.initialized = true;
  }

  static async getInstance(positionId: number = 0) {
    if (!this.instance) {
      this.instance = new PositionTracker();
      await this.instance.initialize(positionId);
    }
    return this.instance;
  }

  private loadPoolData = async () => {
    console.log("loading pool data");
    const slot0 = await this.poolContract.slot0();
    const sqrtRatioX96 = slot0.sqrtPriceX96.toString();
    const tick = slot0.tick.toString();
    const poolData = {
      sqrtRatioX96,
      tick,
    };
    this.pool = { ...this.pool, ...poolData };
    return poolData;
  };

  private loadPositionData = async (positionId: number) => {
    console.log("loading position data");
    const position = await this.positionManager.positions(positionId);
    console.log("position");
    const tickLower = position.tickLower.toString();
    const tickUpper = position.tickUpper.toString();
    const fee = position.fee.toString();
    const liquidity = Big(position.liquidity);
    const token0Address = position.token0;
    const token1Address = position.token1;
    console.log("before tickToPrice");

    const positionData = {
      tickLower,
      tickUpper,
      fee,
      liquidity,
    }; // const gasPrice = await getGasPrice();
    // console.log("gasPrice: " + gasPrice + " gwei")
    this.position = { ...this.position, ...positionData };
    this.token0.address = token0Address;
    this.token1.address = token1Address;

    return positionData;
  };

  // get token decimals, symbol, name, balance derived from liquidity and ticks
  private loadTokenData = async () => {
    console.log("loading token data");
    const [token0Contract, token1Contract] = await getTokenContracts();
    const token0Decimals = await token0Contract.decimals();
    const token1Decimals = await token1Contract.decimals();
    const token0Symbol = await token0Contract.symbol();
    const token1Symbol = await token1Contract.symbol();
    const token0Name = await token0Contract.name();
    const token1Name = await token1Contract.name();

    const token0Data = {
      decimals: token0Decimals,
      symbol: token0Symbol,
      name: token0Name,
    };

    const token1Data = {
      decimals: token1Decimals,
      symbol: token1Symbol,
      name: token1Name,
    };

    this.token0 = { ...this.token0, ...token0Data };
    this.token1 = { ...this.token1, ...token1Data };
    return [token0Data, token1Data];
  };

  private derivePoolPrice = async () => {
    const price = await getPoolPrice(this.pool.sqrtRatioX96, [
      this.token0.decimals,
      this.token1.decimals,
    ]);
    const priceInverted = await getInvertedPrice(price);

    const priceLowerBound = await tickToPrice(this.position.tickLower, [
      this.token0.decimals,
      this.token1.decimals,
    ]);
    const priceUpperBound = await tickToPrice(this.position.tickUpper, [
      this.token0.decimals,
      this.token1.decimals,
    ]);

    this.pool.price = price;
    this.pool.invertedPrice = priceInverted;
    this.position.priceLowerBound = priceLowerBound;
    this.position.priceUpperBound = priceUpperBound;

    return {
      price,
      priceInverted,
    };
  };

  private deriveTokenBalances = () => {
    const liquidity = this.position.liquidity;
    const sqrtPrice = this.pool.price.sqrt();
    const sqrtLowerBound = this.position.priceLowerBound.sqrt();
    const sqrtUpperBound = this.position.priceUpperBound.sqrt();
    const invSqrtPrice = sqrtPrice.pow(-1);
    const invSqrtUpperBound = sqrtUpperBound.pow(-1);

    // TODO: check if this derivation is correct
    // in terms of token1
    const reservesToken1In1 = liquidity.mul(sqrtPrice.minus(sqrtLowerBound));
    const reservesToken0In1 = liquidity.mul(
      invSqrtPrice.minus(invSqrtUpperBound)
    );

    // in terms of token0
    const reservesToken0In0 = reservesToken0In1.mul(this.pool.price);

    ////
  };
}
